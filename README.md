# 🐟 Fish Frenzy

A retro pixel-art arcade game built with vanilla JavaScript, HTML5 Canvas, and Firebase. Currently at **v1.0**.

## How to Play

Collect all the treats before time runs out whilst avoiding the shark. Power-ups spawn on the field to help (or hinder) you. Complete levels for increasing difficulty.

**Controls:** Arrow Keys or WASD to move. Mobile: on-screen joystick (auto-rotates in portrait mode).

---

## Project Structure

```
index.html              — Page structure, overlays, HUD
styles.css / css/       — Retro pixel aesthetic, CRT effects, overlays
main.js                 — Game loop, level management, shark AI, input
firebase-config.js      — Firebase auth, Firestore scores, config, patch notes
js/
  state.js              — Shared game state (S object)
  constants.js          — All tuneable values and durations
  game-vars.js          — Runtime game variables (speed, time, etc.)
  dom.js                — Cached DOM element references
  powerups.js           — Power-up activation, deactivation, spawning
  drawing.js            — Canvas rendering (fish, shark, items, HUD)
  skins.js              — Fish body types, accessories, skin registry
  audio.js              — Web Audio API music engine + SFX
  controls.js           — Keyboard, touch, joystick input
  scoring.js            — Score calculation, combo multiplier
  particles.js          — Particle effects, score popups
  overlays.js           — Scoreboard, name entry, admin panel
  settings.js           — Settings panel, toggles, track preview
  fishdraw.js           — Fish designer (custom skin creator)
  feedback.js           — In-game feedback form (Firebase + EmailJS)
  admin.js              — Admin panel logic, item forcing, config
  ads.js                — Post-death ad system (10 AI-generated ads)
  hall-of-fame.js       — Main menu Hall of Fame banner
  mobile-scale.js       — Portrait mode rotation + scaling
  animations.js         — CRT wipe, game over, chomp animations
  patch-notes-data.js   — Patch notes content (source of truth)
scripts/
  upload-patch-notes.js — Uploads patch-notes-data.js to Firebase
```

---

## Architecture

### Power-Up System
20+ power-ups across 6 rarity tiers:

| Rarity | Items |
|--------|-------|
| Common (1) | Frenzy |
| Uncommon (2) | Ice, Shield, Poison |
| Rare (3) | Time Stop, Buddy, Hook, Goop |
| Epic (4) | Ghost, Bomb, Decoy, Body Swap |
| Mythical (5) | Star, Double, Magnet, Wave, Prompt, Rainbow |
| Legendary (6) | Crazy (Lv9+), Claude, Hell |

**Budget system:** The field has a rarity budget limiting coexisting items. Scales from 7 (level 1) to 15 (level 15). Max 3 items on field at once.

**Shark speed:** All speed-affecting effects (Ice, Hourglass, Prompt, Body Swap) are restored via `restoreSharkSpeed()` which computes the correct speed from currently active effects — no stale saved-state bugs.

### Skin System
5 fish body types: Standard, Goldfish, Clownfish, Angler, Pufferfish. Each has per-category accessory offsets (`FISH_TYPE_EXTRAS_OFFSET`) to align hats, masks, and outfits correctly to that body's proportions.

Custom skins are stored in Firestore (`customSkins/`) and rendered client-side by reconstructing accessory functions from stored key strings.

### Firebase
- Anonymous auth for all players
- Email/password auth for admin only
- Top scores in Firestore (`highscores/`) — score cap 1,000,000
- Scores include skin data (`skinC1–C3`, `skinFishType`, `skinHat`, `skinMask`, `skinOutfit`)
- Offline fallback to localStorage
- Patch notes in Firestore (`config/patchNotes`) — editable via admin panel or upload script
- Firestore rules enforce score range, name length, and skin field types

### Patch Notes Workflow
1. Edit `js/patch-notes-data.js`
2. Run `node scripts/upload-patch-notes.js <email> <password>` to push to Firebase
3. Game renders from local file instantly; Firebase version shown if admin has pushed a custom override

---

## Admin Features

- **Maintenance mode** — set `config/maintenance.enabled = true` in Firestore
- **Score wipe** — from the Hi-Scores page, requires admin login
- **Game config** — edit live game variables (speed, timing, etc.) from admin panel
- **Item forcing** — force up to 10 specific power-ups to spawn simultaneously
- **Patch notes editor** — edit and publish patch notes from admin panel

---

## Deployment

Host on any static server (GitHub Pages, Firebase Hosting, etc.). All Firebase config is in `firebase-config.js`. Set `DEBUG = true` in `firebase-config.js` for verbose Firebase logging.
