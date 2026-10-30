/* Supabase adapter. Presents the same small surface the app was written against
   (collection().get/onSnapshot, doc().get/set/update/delete, assets.upload), so
   the rest of the page does not know or care what is behind it.

   Needs vendor/supabase.js loaded first and window.__OW_CONFIG = {url, key}.
   The publishable key is meant to be public: every row and every photo is
   protected by row-level security that only lets signed-in users through. */
(function () {
'use strict';

var cfg = window.__OW_CONFIG || {};
var sb = null;
if (window.supabase && cfg.url && cfg.key) {
  sb = window.supabase.createClient(cfg.url, cfg.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
}

var BUCKET = 'photos';
var SIGN_SECONDS = 4 * 60 * 60;
var photoUrls = {};
var userId = null;

function ck(r) {
  if (r && r.error) {
    var e = new Error(r.error.message || 'request failed');
    e.code = r.error.code || r.error.status || 'error';
    throw e;
  }
  return r;
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function snapOf(rows) {
  return { docs: (rows || []).map(function (r) { return { id: r.id, data: function () { return r.data || {}; } }; }) };
}

function docRef(c, id) {
  return {
    get: function () {
      return sb.from('docs').select('id,data').eq('collection', c).eq('id', id).maybeSingle().then(ck)
        .then(function (r) { return { exists: !!r.data, id: id, data: function () { return r.data ? r.data.data : undefined; } }; });
    },
    set: function (d) { return sb.from('docs').upsert({ collection: c, id: id, data: d, updated_at: new Date().toISOString() }).then(ck); },
    update: function (p) { return sb.rpc('doc_merge', { c: c, i: id, patch: p }).then(ck); },
    delete: function () { return sb.from('docs').delete().eq('collection', c).eq('id', id).then(ck); }
  };
}

function collectionRef(c) {
  function get() {
    return sb.from('docs').select('id,data').eq('collection', c).range(0, 4999).then(ck)
      .then(function (r) { return snapOf(r.data); });
  }
  return {
    get: get,
    doc: function (id) { return docRef(c, id); },
    /* A change event just triggers a fresh read — simple, and it cannot drift. */
    onSnapshot: function (ok, bad) {
      var ch = sb.channel('ow-' + c + '-' + uid())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: 'collection=eq.' + c },
          function () { get().then(ok, bad); })
        .subscribe(function (status) {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') bad && bad({ code: status.toLowerCase() });
        });
      return function () { sb.removeChannel(ch); };
    }
  };
}

var db = {
  collection: collectionRef,
  doc: function (path) {
    var p = String(path).split('/');
    return docRef(p[0], p.slice(1).join('/'));
  }
};

var assets = {
  upload: function (blob) {
    var path = (userId || 'shared') + '/' + uid() + '.jpg';
    return sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false })
      .then(ck)
      .then(function () { return sb.storage.from(BUCKET).createSignedUrl(path, SIGN_SECONDS); })
      .then(ck)
      .then(function (r) {
        photoUrls[path] = r.data.signedUrl;
        /* url stays empty: a signed link expires, so only the path is stored. */
        return { id: path, url: '' };
      });
  }
};

/* Photos are private. Swap each stored path for a short-lived signed link. */
function signPhotos(rows) {
  var paths = [], seen = {};
  (rows || []).forEach(function (m) {
    var a = m && m.assetId;
    if (a && String(a).indexOf('/') > 0 && !seen[a]) { seen[a] = 1; paths.push(a); }
  });
  if (!paths.length) return Promise.resolve();
  return sb.storage.from(BUCKET).createSignedUrls(paths, SIGN_SECONDS).then(function (r) {
    (r.data || []).forEach(function (it) { if (it && it.signedUrl && it.path) photoUrls[it.path] = it.signedUrl; });
  }).catch(function () {});
}

window.OWCloud = {
  configured: !!sb,
  photoUrl: function (path) { return photoUrls[path] || ''; },
  signPhotos: signPhotos,
  session: function () {
    if (!sb) return Promise.resolve(null);
    return sb.auth.getSession().then(function (r) {
      var s = r && r.data && r.data.session;
      userId = s ? s.user.id : null;
      return s || null;
    }).catch(function () { return null; });
  },
  signIn: function (email, password) {
    return sb.auth.signInWithPassword({ email: email, password: password }).then(function (r) {
      if (r.error) throw r.error;
      userId = r.data.user.id;
      return r.data.session;
    });
  },
  signOut: function () { return sb ? sb.auth.signOut() : Promise.resolve(); },
  onSignedOut: function (fn) {
    if (sb) sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') fn(); });
  },
  use: function (name) {
    if (!sb) return Promise.resolve(null);
    if (name === 'db') return Promise.resolve(db);
    if (name === 'assets') return Promise.resolve(assets);
    return Promise.resolve(null);
  }
};
})();
