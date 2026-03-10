// ═══════════════════════════════════════════════════════════════
// SKINS — Fish colour palettes + optional pixel-art accessories
// ═══════════════════════════════════════════════════════════════
//
// Each skin: { name, c1, c2, c3, extras? }
//   c1 = body, c2 = belly stripe, c3 = top/fin (darker)
//   extras(ctx2) — draws accessories at (0,0) = fish centre, pre-rotated.
//                  Called after the base fish is drawn. Mirror is already
//                  applied via ctx.scale(dir,1) so just draw facing right.

// ─── Accessory draw helpers (all coords relative to fish centre) ──────────

function drawGlasses(c) {
  // Gold-framed glasses around the eye (x≈6-14, y≈-6 to 2)
  c.fillStyle = '#ffcc00';
  c.fillRect(4, -9, 12, 2);   // top bar
  c.fillRect(4,  1, 12, 2);   // bottom bar
  c.fillRect(4, -9,  2, 12);  // left side
  c.fillRect(14,-9,  2, 12);  // right side
  c.fillRect(8, -9,  2,  2);  // bridge top
  c.fillRect(8,  1,  2,  2);  // bridge bottom
  // restore eye so it shows through frames
  c.fillStyle = '#fff';
  c.fillRect(6, -6, 8, 8);
  c.fillStyle = '#111';
  c.fillRect(10,-4, 4, 4);
  c.fillStyle = '#fff';
  c.fillRect(10,-4, 2, 2);
}

function drawMustache(c) {
  c.fillStyle = '#331100';
  c.fillRect(4, 2, 5, 3);
  c.fillRect(9, 2, 5, 3);
  c.fillRect(5, 5, 3, 2);
  c.fillRect(10,5, 3, 2);
}

function drawEyepatch(c) {
  // Black patch over the eye
  c.fillStyle = '#111';
  c.fillRect(5,-7, 11, 10);
  // Strap across the body
  c.fillRect(-14,-5, 20, 2);
  // Skull crossbones hint on patch
  c.fillStyle = '#eee';
  c.fillRect(9, -5, 2, 6);  // vertical bone
  c.fillRect(7, -4, 6, 2);  // horizontal bone
}

function drawHeadband(c) {
  c.fillStyle = '#fff';
  c.fillRect(-14,-5, 28, 3);  // white band across body
  // Red circle/knot
  c.fillStyle = '#ee2222';
  c.fillRect(-16,-5, 4, 3);
}

function drawCrown(c) {
  c.fillStyle = '#ffdd00';
  c.fillRect(-4,-18, 12, 5);  // base
  c.fillRect(-4,-23,  3, 5);  // left prong
  c.fillRect( 2,-24,  3, 6);  // middle prong (taller)
  c.fillRect( 7,-23,  3, 5);  // right prong
  c.fillStyle = '#ff2244';
  c.fillRect( 3,-22,  2, 2);  // centre gem
  c.fillStyle = '#44ddff';
  c.fillRect(-2,-20,  2, 2);  // left gem
  c.fillRect( 7,-20,  2, 2);  // right gem
}

function drawJokerFace(c) {
  // White face paint
  c.fillStyle = 'rgba(255,255,255,0.65)';
  c.fillRect(4,-8, 12, 14);
  // Red Joker smile — turned-up corners
  c.fillStyle = '#dd1111';
  c.fillRect(5, 2, 8, 2);    // mouth line
  c.fillRect(5,-1, 2, 4);    // left curl
  c.fillRect(11,-1, 2, 4);   // right curl
  // Restore eye detail
  c.fillStyle = '#fff';
  c.fillRect(6,-6, 8, 8);
  c.fillStyle = '#111';
  c.fillRect(10,-4, 4, 4);
  c.fillStyle = '#fff';
  c.fillRect(10,-4, 2, 2);
  // Green eyebrow stripe
  c.fillStyle = '#33dd55';
  c.fillRect(6,-8, 8, 2);
}

function drawClownNose(c) {
  // Red ball nose
  c.fillStyle = '#ff2222';
  c.fillRect(7,-3, 5, 5);
  // Colourful dots on body
  c.fillStyle = '#ff44ee';
  c.fillRect(-6,-5, 4, 4);
  c.fillStyle = '#44eeff';
  c.fillRect(-6, 2, 4, 4);
  c.fillStyle = '#ffee00';
  c.fillRect( 0, 4, 4, 3);
  // White ruffled collar
  c.fillStyle = '#fff';
  c.fillRect(-10,-2, 2, 4);
  c.fillRect( -6,-4, 2, 8);
  c.fillRect( -2,-2, 2, 4);
}

function drawAlien(c) {
  // Large oval alien eye (replaces normal eye)
  c.fillStyle = '#000';
  c.fillRect(4,-9, 12, 11);
  c.fillStyle = '#00ff88';
  c.fillRect(5,-8, 10,  9);
  c.fillStyle = '#000';
  c.fillRect(8,-6,  6,  6);
  c.fillStyle = '#00ff88';
  c.fillRect(8,-6,  3,  3);   // alien shine
  // Antennae
  c.fillStyle = '#aaffcc';
  c.fillRect(-4,-14, 2, 6);   // left stalk
  c.fillRect( 2,-14, 2, 6);   // right stalk
  c.fillRect(-6,-16, 4, 3);   // left bulb
  c.fillRect( 2,-16, 4, 3);   // right bulb
}

function drawSkeleton(c) {
  // Spine line
  c.fillStyle = 'rgba(255,255,255,0.7)';
  c.fillRect(-10,-1, 18, 2);
  // Ribs
  c.fillRect(-8,-6,  2, 5);
  c.fillRect(-8, 1,  2, 5);
  c.fillRect(-2,-6,  2, 5);
  c.fillRect(-2, 1,  2, 5);
  c.fillRect( 4,-6,  2, 5);
  c.fillRect( 4, 1,  2, 5);
  // Skull eye socket
  c.fillStyle = '#000';
  c.fillRect(6,-6, 8, 8);
  c.fillStyle = '#ddeeff';
  c.fillRect(7,-5, 5, 5);
  c.fillStyle = '#000';
  c.fillRect(8,-4, 3, 3);
}

// ─── Skin definitions ─────────────────────────────────────────

export const SKINS = [
  // ── Colour skins ──
  { name: 'Classic',  c1: '#ff8833', c2: '#ffaa55', c3: '#cc5500' },
  { name: 'Ocean',    c1: '#2288ff', c2: '#55aaff', c3: '#005599' },
  { name: 'Teal',     c1: '#22bbaa', c2: '#44ddcc', c3: '#119988' },
  { name: 'Gold',     c1: '#ffcc00', c2: '#ffee55', c3: '#cc9900' },

  // ── Character skins ──
  {
    name: 'Joker',
    c1: '#6622aa', c2: '#33cc44', c3: '#440088',
    extras: drawJokerFace,
  },
  {
    name: 'Disguise',
    c1: '#ff8833', c2: '#ffaa55', c3: '#cc5500',
    extras(c) { drawGlasses(c); drawMustache(c); },
  },
  {
    name: 'Ninja',
    c1: '#222233', c2: '#334455', c3: '#111122',
    extras: drawHeadband,
  },
  {
    name: 'Clown',
    c1: '#ff6644', c2: '#ffdd44', c3: '#cc2200',
    extras: drawClownNose,
  },
  {
    name: 'Royal',
    c1: '#3355bb', c2: '#5588ff', c3: '#112288',
    extras: drawCrown,
  },
  {
    name: 'Pirate',
    c1: '#334455', c2: '#556677', c3: '#112233',
    extras: drawEyepatch,
  },
  {
    name: 'Alien',
    c1: '#226633', c2: '#44bb66', c3: '#114422',
    extras: drawAlien,
  },
  {
    name: 'Skeleton',
    c1: '#445566', c2: '#667788', c3: '#223344',
    extras: drawSkeleton,
  },
];

// ─── Mini preview renderer ─────────────────────────────────────
// Draws a static fish (facing right) on any 2D context.
// Call with the skin's own ctx so it doesn't touch the game canvas.

export function drawSkinPreview(ctx2, skin, w, h) {
  const { c1, c2, c3 } = skin;
  ctx2.clearRect(0, 0, w, h);
  ctx2.save();
  ctx2.translate(w / 2 + 4, h / 2 + 8); // +8 shifts fish down so crowns/antennae have headroom
  ctx2.scale(0.65, 0.65);

  // Body
  ctx2.fillStyle = c1;
  ctx2.fillRect(-14, -8, 28, 16);
  ctx2.fillRect(-10,-10, 20,  2);
  ctx2.fillRect(-10,  8, 20,  2);

  // Belly stripe
  ctx2.fillStyle = c2;
  ctx2.fillRect(-10, 2, 18, 4);

  // Top (darker)
  ctx2.fillStyle = c3;
  ctx2.fillRect(-10,-10, 20, 3);

  // Tail (static)
  ctx2.fillStyle = c1;
  ctx2.fillRect(-22,-6, 8, 4);
  ctx2.fillRect(-22, 2, 8, 4);
  ctx2.fillRect(-26,-8, 4, 4);
  ctx2.fillRect(-26, 4, 4, 4);

  // Eye
  ctx2.fillStyle = '#fff';
  ctx2.fillRect(6,-6, 8, 8);
  ctx2.fillStyle = '#111';
  ctx2.fillRect(10,-4, 4, 4);
  ctx2.fillStyle = '#fff';
  ctx2.fillRect(10,-4, 2, 2);

  // Dorsal fin
  ctx2.fillStyle = c3;
  ctx2.fillRect(-2,-14, 8, 4);
  ctx2.fillRect( 0,-12, 4, 2);

  // Character accessories
  if (skin.extras) skin.extras(ctx2);

  ctx2.restore();
}
