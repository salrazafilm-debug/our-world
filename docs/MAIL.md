# Mail: the post office between our homes

Status: built (src/features/mail.js). Visual rules: STYLE.md.

## Artwork (approved as drawn)
Source: `art-src/mail reference.png`. The artwork is final: do not recolour, restyle or add to it.
- Map: the post office island with the glowing new-mail envelope and red dot.
- Zoom: tapping the post office flies the camera to the building exterior.
- Enter: the door opens into the mail room.
- Mail room: Inbox, Compose, Our Letters and Today's Note.
- Letter, compose and letters list screens use the same paper, wood and lamp scene.

The interface is built to match the artwork, not the other way round.

## On the map
- **Place:** midway between the two homes, so it is close to both of you.
- **Look:** a small pixel post office with a flag and a berry sign.
- **Glow:** a soft gold glow when there is mail waiting for you.
- **New mail marker:** a letter envelope icon that floats gently above the post office centre, with a red dot when there are unopened letters.
- **Visibility:** shown like the other places. It fades and then hides when zoomed far out, where it would be too small to see or tap.
- **Tap:** opens the mail room.

## The mail room (its own dashboard, like the menu)
- A cozy room: the post counter, a rack of cubbies, and a window onto the map.
- **Today's note** is pinned at the top. It can be opened as many times as you like.
- **Tabs:** *New* (unopened letters) and *Look back* (opened letters).

### Receiving
- Letters float gently in the air. Unopened ones glow faintly and show a red dot.
- Tap a letter: the envelope lifts, opens, and the paper unfolds to show the text.
- A new letter drifts in with a soft glow and a sound when it arrives.

### Sending
- Write on a sheet of paper: pick a **title**, then write the letter.
- Send right away: the paper folds into an envelope and flies off the counter toward your partner's home on the map.

### Look back
- Each opened letter is an envelope with its title and date.
- Ordered by date, newest first.
- Go through them one by one: tap or swipe to move to the next envelope, and each opens in turn.

## Data
- Each letter has: id, title, body, from, to, sent_at, opened_at.
- Stored in the existing shared storage (the `docs` table, collection `mail`), so no database change is needed.
- Row-level security already limits each letter to its two people.

## Decisions (agreed)
1. Mail is at a fixed spot between the two homes.
2. Letters send right away.
3. A new letter shows as a glow on the post office, a floating envelope icon above it, and a red dot.
4. Look back goes through envelopes one by one, ordered by date.
5. Every letter has a title, chosen before sending.
6. Visibility: fades and hides when zoomed far out.
7. Today's note can be read any number of times from the mail room.
8. Sound (paper and chime) is off by default, like the other sounds.

## Build order
1. Post office on the map: glow, floating envelope, red dot.
2. Mail room dashboard with today's note.
3. Receiving: floating letters, open animation.
4. Sending: title, paper, fold and fly.
5. Look back, one envelope at a time.
