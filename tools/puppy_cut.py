"""Background removal for the puppy sprites (white or light-grey studio background, grey ground shadows).

Every near-white / light-grey, low-colour region is removed if it touches the picture's edge OR is big enough
to be a gap (between legs, under the belly, inside the tail curl). Tiny white bits fully inside the dog (eye
shines, teeth) are kept. The cream chest is warm, so it never matches. A one pixel ring is also removed so no
white fringe is left on the outline, then the edge is softened a touch.
"""
import collections
from PIL import Image, ImageFilter


def is_bg(p):
    mx = max(p); mn = min(p)
    return mn > 200 and (mx - mn) < 24


def cut(im, min_gap):
    """im: RGB image. min_gap: pixel area above which an enclosed light region counts as background."""
    im = im.convert('RGB'); w, h = im.size; px = im.load()
    cand = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            if is_bg(px[x, y]): cand[y * w + x] = 1
    seen = bytearray(w * h); bg = bytearray(w * h)
    for sy in range(h):
        for sx in range(w):
            i0 = sy * w + sx
            if not cand[i0] or seen[i0]: continue
            comp = [i0]; seen[i0] = 1; q = collections.deque([i0]); edge = False; spread = 0
            while q:
                i = q.popleft(); x, y = i % w, i // w
                p = px[x, y]; spread += max(p) - min(p)
                if x == 0 or y == 0 or x == w - 1 or y == h - 1: edge = True
                for j in ((i + 1) if x < w - 1 else -1, (i - 1) if x > 0 else -1, (i + w) if y < h - 1 else -1, (i - w) if y > 0 else -1):
                    if j >= 0 and cand[j] and not seen[j]: seen[j] = 1; comp.append(j); q.append(j)
            # outside light region: always background. Enclosed gap: only if big and truly colourless (the cream chest is warm, so it stays)
            if edge or (len(comp) >= min_gap and spread / len(comp) < 8):
                for i in comp: bg[i] = 1
    # light-grey shadow slivers touching the background are background too (never the black outline or the orange fur)
    q = collections.deque(i for i in range(w * h) if bg[i])
    while q:
        i = q.popleft(); x, y = i % w, i // w
        for j in ((i + 1) if x < w - 1 else -1, (i - 1) if x > 0 else -1, (i + w) if y < h - 1 else -1, (i - w) if y > 0 else -1):
            if j >= 0 and not bg[j]:
                p = px[j % w, j // w]
                if min(p) > 135 and max(p) - min(p) < 16: bg[j] = 1; q.append(j)
    # grow the removed area by one pixel so no light fringe survives on the outline
    m = Image.new('L', (w, h), 0); mp = m.load()
    for i in range(w * h):
        if bg[i]: mp[i % w, i // w] = 255
    m = m.filter(ImageFilter.MaxFilter(3))
    alpha = m.point(lambda v: 0 if v > 127 else 255).filter(ImageFilter.GaussianBlur(0.5))
    out = im.convert('RGBA'); out.putalpha(alpha)
    return out
