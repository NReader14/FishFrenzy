# 🐟 Fish Frenzy

A retro pixel-art arcade game built with vanilla JavaScript, HTML5 Canvas, and Firebase.

## How to Play

Collect all the treats before time runs out whilst avoiding the shark. Power-ups spawn on the field to help (or hinder) you. Complete levels for increasing difficulty.

**Controls:** Arrow Keys or WASD to swim.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure, overlays, HUD elements |
| `styles.css` | All styling — retro pixel aesthetic, CRT effects, overlays |
| `game.js` | Core game logic — movement, collision, power-ups, rendering |
| `firebase-config.js` | Firebase auth, Firestore scores, maintenance mode, game config |
| `SETUP-ADMIN.md` | Firebase admin setup instructions |

## Game Architecture

### Constants & Configuration (Section 1)
All tuneable values are at the top of `game.js`:
- Power-up durations, rarity tiers, spawn rates
- Budget system: total rarity cost of field items, scales from 7 (lv1) to 15 (lv15)
- Progressive speed: fish accelerates when moving in the same direction
- Shark start delay: ~1.5s grace period at each level start

### Power-Up System (Sections 8–9)
17 power-ups across 5 rarity tiers + 1 special:

| Rarity | Items |
|--------|-------|
| Common (1) | Frenzy |
| Uncommon (2) | Ice, Shield, Poison ☠️ |
| Rare (3) | Time Stop, Buddy, Hook, Goop 🧪 |
| Epic (4) | Ghost, Bomb, Decoy, Swap |
| Mythical (5) | Star, Double, Magnet, Wave |
| Special (0) | Crazy (Level 10+) |

**Budget system:** The field has a rarity budget that limits what can coexist. A level-1 game can have budget 7, allowing e.g. a Common(1) + Uncommon(2) + Epic(4). By level 15, budget reaches 15.

**Spawn rules:**
- Max 3 items on field at once
- No duplicate types spawning consecutively
- Items cannot overlap each other or treats
- Spawn chance = base rate × rarity multiplier

### Rendering (Section 13)
All drawing uses HTML5 Canvas 2D:
- Pixel-art fish and shark with rotation support
- Circular glows on power-ups (not square)
- Elliptical shape-fitting glows on fish (shield, star, goop)
- Hook line animation, swap pause+flicker effect
- CRT scanlines, vignette overlay, frenzy rainbow borders

### Firebase (firebase-config.js)
- Anonymous auth for all players
- Email/password auth for admin
- Top 5 leaderboard in Firestore
- Maintenance mode toggle (config/maintenance document)
- Game config storage (config/game document) for admin variable editing
- Offline fallback to localStorage

## Admin Features

### Maintenance Mode
Set `config/maintenance.enabled = true` in Firestore to show a maintenance page. Admin can log in from the maintenance page to disable it.

### Scoreboard Wipe
Accessible from the Hi-Scores page. Requires admin email/password login.

## Deployment
Host on any static server (GitHub Pages, Firebase Hosting, etc.). All Firebase config is in `firebase-config.js`.
