// ─── PATCH NOTES ─────────────────────────────────────────────────────────────
// Edit this file to update patch notes, then run:
//   node scripts/upload-patch-notes.js <email> <password>
// ─────────────────────────────────────────────────────────────────────────────

export const NOTES = [
  {
    v: 'v1.1', emoji: '🐡', title: 'MOBILE & POLISH', date: 'MAR 2026',
    items: [
      '📱 Fish, shark, treats and power-ups are now bigger on portrait mobile — actually playable',
      '🎵 Added Songs by <strong><span style="color:#ffd700">KRe$cendo</span></strong> — new music tracks',
      '🎧 Music previews now play from the middle of the track so you hear the good bit',
      '⚡ Music previews load instantly — no waiting for songs to buffer',
      '🤖 Claude power-up now freezes the entire game while it does its thing, then resumes',
      '👕 Stripes, Checkers, Frost and Plaid outfits redesigned as proper shirts on the fish body',
      '🐟 Saving a custom skin now updates it instantly without needing a reload',
      '🔧 Fixed custom skins duplicating in the picker after saving a new design',
    ]
  },
  {
    v: 'v1.0', emoji: '🎉', title: 'FULL RELEASE', date: 'MAR 2026',
    items: [
      '📺 AI-generated ads now appear after you die — purely for entertainment',
      '🖱️ The SKIP button flees your cursor for 20 seconds. Good luck.',
      '⚙️ Ads can be toggled off in Settings if you\'re no fun',
      '🏆 Hall of Fame banner on the main menu — top score with animated fish',
      '🐟 Skin data now saved with scores — your fish appears on the leaderboard',
      '💰 Score cap raised to 1,000,000 — <span style="color:#ff4444">ALX we see you 😊</span>',
      '🐛 Rainbow power-up no longer permanently slows the shark after ending',
      '⚡ Shark speed interactions fully reworked — no more stacking bugs',
      '🧹 Major codebase cleanup — dead code removed, debug logs gated, status badges added for Double, Wave and Poison',
    ]
  },
  {
    v: 'v0.8', emoji: '✨', title: 'POLISH & SKINS UPDATE', date: 'MAR 2026',
    items: [
      '🐡 New <strong>Pufferfish</strong> body type — round, spiky, and adorable',
      '😈 Angler fish redesigned — taller, scarier, glowing lure with curved stalk',
      '🎨 Outfit sizing now scales proportionally for every fish body type',
      '👒 Skin designer updated — all 5 body types available in customisation',
      '💬 Shark quips can now be toggled off in Settings',
      '🎵 Music track selector with 10-second preview in Settings',
      '📱 Portrait mobile support — game rotates to fill the screen',
      '🔄 Body Swap now shows a 3-2-1-GO! countdown; shark pauses after GO! for a head start',
      '🧪 Speed power-up interactions fixed — Frenzy, Goop and Body Swap no longer conflict',
      '⏩ Music tempo resets correctly at the start of each new level',
      '🛠️ Admin item test upgraded — force up to 10 different items simultaneously',
      '🐞 Various bug fixes: rainbow child timeouts, magnet stacking, score popup overlap',
    ]
  },
  {
    v: 'v0.7', emoji: '🎮', title: 'GAMEPLAY UPDATE', date: 'ALX 2026',
    items: [
      '🍄 Mushroom stays on screen longer — actually catchable now',
      '👁️ Decoy fish survives shark chomps — teleports to safety instead of disappearing',
      '🎭 Mind Swap now shows big screen popups so you know what\'s happening',
      '⌛ Hourglass has a golden glow effect when active',
      '👻 Ghost powerup makes it clearer the shark is stunned',
      '⚡ Speed correctly resets after Body Swap ends',
    ]
  },
  {
    v: 'v0.6', emoji: '💬', title: 'FEEDBACK UPDATE', date: '2026',
    items: [
      '💬 New <strong>FEEDBACK</strong> button in Settings — send bug reports or suggestions directly to the developer',
      '🔒 Fully anonymous — no account required',
      '⏳ Hourglass now also slows the music tempo',
    ]
  },
  {
    v: 'v0.5', emoji: '🎨', title: 'CUSTOMISATION UPDATE', date: '2026',
    items: [
      '🐟 Design your own fish in the new <strong>FISH DESIGNER</strong> — pick colours, accessories and a name',
      '👒 15 accessories across 3 tabs: <strong>HATS, MASKS, OUTFITS</strong>',
      '🦈 Outfits include Tuxedo, Hawaiian shirt, Camo, and a Shark costume',
      '☁️ Custom fish saved to the cloud and shown for all players under <strong>CUSTOM OUTFITS</strong>',
      '✏️ Name picker with Title / Middle / Name dropdowns — Mr The Shark anyone?',
    ]
  },
  {
    v: 'v0.4', emoji: '🎵', title: 'AUDIO & IMMERSION', date: '2026',
    items: [
      '🥁 Background music with hi-hat pattern',
      '❄️ Ice and Goop slow the music tempo',
      '🎴 Playing Card triggers upbeat battle music',
      '🔉 Softer item collection sounds',
      '🫧 Occasional whispered "fish..." in the music',
    ]
  },
  {
    v: 'v0.3', emoji: '⚡', title: 'POWER-UPS & SHARK AI', date: '2026',
    items: [
      '🧠 Smart Shark mode — predicts your movement',
      '✨ 18+ power-ups including Frenzy, Rainbow, Body Swap and Hell',
      '🔥 Combo multiplier up to x5',
      '🕹️ Diagonal movement speed normalised',
    ]
  },
  {
    v: 'v0.2', emoji: '🏆', title: 'ONLINE SCORES', date: '2026',
    items: [
      '🌍 Global leaderboard via Firebase',
      '⚙️ Admin panel for score wipe and game config',
      '📴 Offline score fallback',
    ]
  },
  {
    v: 'v0.1', emoji: '🐠', title: 'INITIAL RELEASE', date: '2026',
    items: [
      '🎮 Core game loop — collect treats, dodge the shark',
      '🎯 Easy / Normal / Hard difficulties',
      '🤖 Built entirely by Claude',
    ]
  },
  {
    v: '🙏 THANKS', emoji: '', title: '', date: '2026', thanks: true,
    items: [
      '🧪 Big thanks to <strong>LMW</strong>, <strong>ALX</strong> and everyone who helped test — you made this better',
      'Shout out to <strong><span style="color:#ffd700">KRe$cendo</span></strong> for the amazing music 🎧🎶'
    ]
  },
];
