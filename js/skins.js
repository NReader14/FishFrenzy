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

// ─── Additional hat draw functions ────────────────────────────

function drawWizardHat(c) {
  c.fillStyle = '#4422aa';
  c.fillRect(-1,-30, 6,3);  c.fillRect(-3,-27,10,5);  c.fillRect(-5,-22,14,6);
  c.fillRect(-7,-16,18,3);  c.fillRect(-9,-13,22,2);
  c.fillStyle = '#ffdd00';
  c.fillRect(0,-28,2,2);  c.fillRect(3,-23,2,2);  c.fillRect(-2,-17,2,2);
}

function drawBeanie(c) {
  c.fillStyle = '#cc3344';
  c.fillRect(-8,-20,20,10);
  c.fillStyle = '#882233';
  c.fillRect(-8,-11,20,3);
  c.fillStyle = '#fff';
  c.fillRect(-2,-24,8,6);
}

function drawBaseballCap(c) {
  c.fillStyle = '#1155cc';
  c.fillRect(-6,-20,16,10);
  c.fillRect(-6,-10,20,3);
  c.fillStyle = '#003399';
  c.fillRect(-6,-20,16,2);
  c.fillStyle = '#fff';
  c.fillRect(0,-16,4,4);
}

function drawHalo(c) {
  c.fillStyle = '#ffee00';
  c.fillRect(-6,-24,16,3);
  c.fillRect(-8,-22, 4,4);
  c.fillRect(12,-22, 4,4);
  c.fillStyle = '#0a1628';
  c.fillRect(-4,-22,12,3);
}

function drawVikingHorns(c) {
  c.fillStyle = '#aabbcc';
  c.fillRect(-8,-22,20,12);
  c.fillStyle = '#885522';
  c.fillRect(-14,-28, 4,12);
  c.fillRect( 14,-28, 4,12);
  c.fillRect(-14,-28, 8, 3);
  c.fillRect( 10,-28, 8, 3);
}

function drawFlowerCrown(c) {
  c.fillStyle = '#228844';
  c.fillRect(-8,-16,20,3);
  c.fillStyle = '#ff4488';
  c.fillRect(-8,-20,4,4);  c.fillRect(-2,-22,4,4);
  c.fillRect( 4,-20,4,4);  c.fillRect(10,-22,4,4);
  c.fillStyle = '#ffee00';
  c.fillRect(-7,-19,2,2);  c.fillRect(-1,-21,2,2);
  c.fillRect( 5,-19,2,2);  c.fillRect(11,-21,2,2);
}

function drawBeret(c) {
  c.fillStyle = '#882244';
  c.fillRect(-6,-22,18, 8);
  c.fillRect(-4,-26, 4, 4);
  c.fillRect(-10,-15,24, 3);
}

function drawFez(c) {
  c.fillStyle = '#cc2222';
  c.fillRect(-4,-26,12,14);
  c.fillRect(-6,-12,16, 3);
  c.fillStyle = '#ffcc00';
  c.fillRect( 2,-26, 2, 6);
  c.fillRect( 4,-22, 2, 8);
}

function drawAntlers(c) {
  c.fillStyle = '#885533';
  c.fillRect(-16,-28, 4,16);  c.fillRect(-16,-28,10, 4);  c.fillRect(-10,-24, 4, 4);
  c.fillRect( 14,-28, 4,16);  c.fillRect(  8,-28,10, 4);  c.fillRect(  8,-24, 4, 4);
}

function drawTopHat(c) {
  c.fillStyle = '#111122';
  c.fillRect(-4, -26, 12, 12); // crown
  c.fillRect(-10, -14, 24, 3); // brim
  c.fillStyle = '#882222';
  c.fillRect(-4, -19, 12, 2);  // band
}

function drawPartyHat(c) {
  c.fillStyle = '#ff44bb';
  c.fillRect(-1, -28, 6, 3);   // tip
  c.fillRect(-3, -25, 10, 5);  // mid
  c.fillRect(-5, -20, 14, 6);  // base
  c.fillStyle = '#ffee00';
  c.fillRect( 1, -26, 2, 2);
  c.fillRect(-1, -21, 2, 2);
  c.fillRect( 5, -22, 2, 2);
  c.fillStyle = '#fff';
  c.fillRect(-5, -14, 14, 2);  // elastic
}

function drawCowboyHat(c) {
  c.fillStyle = '#996633';
  c.fillRect(-4, -26, 12, 12); // crown
  c.fillRect(-14, -14, 32, 3); // wide brim
  c.fillStyle = '#774422';
  c.fillRect(-4, -19, 12, 2);  // band
  c.fillStyle = '#ffcc44';
  c.fillRect( 0, -18, 2, 2);   // badge
}

// ─── Additional mask draw functions ───────────────────────────

function drawSunglasses(c) {
  c.fillStyle = '#111';
  c.fillRect(3,-9,14,10);
  c.fillStyle = '#225588';
  c.fillRect(5,-7,10, 6);
  c.fillStyle = '#888';
  c.fillRect(3,-9,14, 2);  c.fillRect(3,-1,14, 2);
  c.fillRect(-2,-5, 6, 2);
}

function drawDominoMask(c) {
  c.fillStyle = '#111';
  c.fillRect(2,-8,14, 8);
  c.fillStyle = '#fff';
  c.fillRect(4,-7, 4, 5);  c.fillRect(10,-7, 4, 5);
  c.fillStyle = '#111';
  c.fillRect(6,-6, 2, 3);  c.fillRect(12,-6, 2, 3);
}

function drawBlush(c) {
  c.fillStyle = 'rgba(255,100,100,0.55)';
  c.fillRect(6,-3, 6, 4);
  c.fillStyle = 'rgba(255,100,100,0.28)';
  c.fillRect(4,-4, 10, 6);
}

function drawWarPaint(c) {
  c.fillStyle = '#cc2222';
  c.fillRect(6,-8,10, 3);
  c.fillStyle = '#2244cc';
  c.fillRect(6,-2,10, 3);
  c.fillStyle = '#cc2222';
  c.fillRect(6, 4,10, 3);
}

function drawStarEyes(c) {
  c.fillStyle = '#ffee00';
  c.fillRect(6,-6, 8, 8);
  c.fillStyle = '#ff8800';
  c.fillRect(8,-6, 4, 8);  c.fillRect(6,-4, 8, 4);
  c.fillRect(7,-5, 2, 2);  c.fillRect(11,-5, 2, 2);
  c.fillRect(7, 1, 2, 2);  c.fillRect(11, 1, 2, 2);
}

function drawMonocle(c) {
  c.fillStyle = '#ffcc00';
  c.fillRect(5,-7,10, 2);  c.fillRect(5, 1,10, 2);
  c.fillRect(5,-7, 2,10);  c.fillRect(13,-7, 2,10);
  c.fillStyle = 'rgba(150,200,255,0.3)';
  c.fillRect(7,-5, 6, 6);
  c.fillStyle = '#ffcc00';
  c.fillRect(5, 3, 2, 4);  c.fillRect(7, 5, 4, 2);
}

function drawGoggles(c) {
  c.fillStyle = '#ff6600';
  c.fillRect(3,-8,14,10);
  c.fillStyle = '#88ddff';
  c.fillRect(5,-6, 5, 6);  c.fillRect(11,-6, 5, 6);
  c.fillStyle = '#ff6600';
  c.fillRect(9,-6, 2, 6);
  c.fillRect(-4,-5, 8, 4);
}

function drawSkiMask(c) {
  c.fillStyle = '#224422';
  c.fillRect(2,-10,14,14);
  c.fillStyle = '#ffcc88';
  c.fillRect(5,-7, 8, 4);
  c.fillStyle = '#111';
  c.fillRect(9,-6, 3, 3);
  c.fillStyle = '#224422';
  c.fillRect(4, 2,10, 3);
  c.fillStyle = '#0a1628';
  c.fillRect(6, 3, 6, 2);
}

// ─── Additional outfit draw functions ─────────────────────────

function drawTuxedo(c) {
  c.fillStyle = '#eeeeff';
  c.fillRect(-3, -7, 5, 14);   // white shirt
  c.fillStyle = '#111122';
  c.fillRect(-14, -8, 8, 10);  // left lapel
  c.fillRect(  3, -8, 8, 10);  // right lapel
  c.fillStyle = '#dd2244';
  c.fillRect(-3, -5, 3, 4);    // left bow wing
  c.fillRect( 2, -5, 3, 4);    // right bow wing
  c.fillRect(-1, -4, 4, 2);    // bow centre
  c.fillStyle = '#aabbcc';
  c.fillRect(-1, -3, 2, 2);    // button 1
  c.fillRect(-1,  1, 2, 2);    // button 2
}

function drawStripes(c) {
  c.fillStyle = 'rgba(255,255,255,0.28)';
  c.fillRect(-14, -7, 28, 3);
  c.fillRect(-14, -1, 28, 3);
  c.fillRect(-14,  5, 28, 3);
}

function drawPolkaDots(c) {
  c.fillStyle = 'rgba(255,255,255,0.45)';
  c.fillRect(-10,-5, 4,4);  c.fillRect(-2,-7, 4,4);
  c.fillRect(  4,-3, 4,4);  c.fillRect(-8, 2, 4,4);  c.fillRect(2, 3, 4,4);
}

function drawFlames(c) {
  c.fillStyle = '#ff4400';
  c.fillRect(-14,-8,28,4);
  c.fillStyle = '#ff8800';
  c.fillRect(-12,-12, 4,4);  c.fillRect(-5,-14, 4,6);
  c.fillRect(  1,-11, 4,3);  c.fillRect( 7,-13, 4,5);  c.fillRect(12,-10, 4,2);
  c.fillStyle = '#ffee00';
  c.fillRect(-11,-10,2,2);  c.fillRect(-4,-12,2,2);  c.fillRect(8,-11,2,2);
}

function drawCamo(c) {
  c.fillStyle = 'rgba(60,80,40,0.6)';
  c.fillRect(-14,-8, 8,6);  c.fillRect(-2,-8,10,4);  c.fillRect( 8,-4, 6,6);
  c.fillRect(-12,-2, 6,6);  c.fillRect( 0,-2, 8,6);
  c.fillStyle = 'rgba(80,60,30,0.5)';
  c.fillRect(-8,-6, 6,5);  c.fillRect( 4,-6, 6,4);  c.fillRect(-10,0, 5,4);  c.fillRect(2,2, 6,4);
}

function drawCheckerboard(c) {
  c.fillStyle = 'rgba(255,255,255,0.28)';
  c.fillRect(-14,-8, 6,6);  c.fillRect(-2,-8, 6,6);  c.fillRect(10,-8, 4,6);
  c.fillRect( -8,-2, 6,6);  c.fillRect( 4,-2, 6,6);
  c.fillRect(-14, 4, 6,4);  c.fillRect(-2, 4, 6,4);  c.fillRect(10, 4, 4,4);
}

function drawRainbowBody(c) {
  const cols = ['rgba(255,50,50,.4)','rgba(255,165,0,.4)','rgba(255,255,0,.4)',
                'rgba(50,200,50,.4)','rgba(50,100,255,.4)','rgba(148,0,211,.4)'];
  cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(-14,-8+i*3,28,3); });
}

function drawScalesPattern(c) {
  c.fillStyle = 'rgba(200,220,255,0.25)';
  for (let row = 0; row < 3; row++) {
    const ox = row % 2 === 0 ? 0 : 4;
    for (let col = 0; col < 6; col++) { c.fillRect(-14 + col*5 + ox, -6 + row*5, 4,3); }
  }
}

function drawIceFrost(c) {
  c.fillStyle = 'rgba(150,220,255,0.3)';
  c.fillRect(-14,-8,28,16);
  c.fillStyle = 'rgba(200,240,255,0.65)';
  [-12,-7,-2,3,8].forEach(x => c.fillRect(x,-8,2,5));
  [-10,-4,2,8].forEach(x => c.fillRect(x,8,2,-4));
}

function drawHawaiian(c) {
  c.fillStyle = 'rgba(255,80,120,0.5)';
  c.fillRect(-12,-4,6,6);  c.fillRect(-2,-6,6,6);  c.fillRect(6,-3,6,6);
  c.fillStyle = 'rgba(255,200,0,0.6)';
  c.fillRect(-10,-2,3,3);  c.fillRect(0,-4,3,3);  c.fillRect(8,-1,3,3);
  c.fillStyle = 'rgba(0,180,100,0.5)';
  c.fillRect(-14,-8,4,4);  c.fillRect(-6,2,4,4);  c.fillRect(4,-7,4,3);  c.fillRect(10,3,4,3);
}

function drawPlaid(c) {
  c.fillStyle = 'rgba(200,50,50,0.3)';
  c.fillRect(-14,-8,28,4);  c.fillRect(-14,0,28,4);
  c.fillStyle = 'rgba(50,50,200,0.3)';
  c.fillRect(-8,-8,4,16);  c.fillRect(4,-8,4,16);
  c.fillStyle = 'rgba(255,255,255,0.12)';
  c.fillRect(-14,-8,28,2);  c.fillRect(-14,4,28,2);
  c.fillRect(-14,-8,2,16);  c.fillRect(12,-8,2,16);
}

function drawTie(c) {
  c.fillStyle = '#cc2222';
  c.fillRect(-1,-8,5,4);
  c.fillRect( 0,-4,4,10);
  c.fillRect(-2, 4,8, 4);
  c.fillStyle = '#881111';
  c.fillRect(1,-6,2,2);
}

function drawChain(c) {
  c.fillStyle = '#ffcc00';
  for (let x = -12; x < 12; x += 6) {
    c.fillRect(x,-2,5,2);  c.fillRect(x+5,-4,2,6);
  }
  c.fillStyle = '#ffee88';
  c.fillRect(-2,-6,6,6);  c.fillRect(0,-4,2,2);
}

// ─── Accessory registry — organised by tab ────────────────────

export const ACCESSORY_TABS = [
  {
    label: 'HATS',
    items: [
      { key: 'none',      label: 'NONE',    fn: null },
      { key: 'headband',  label: 'HEADBAND',fn: drawHeadband },
      { key: 'crown',     label: 'CROWN',   fn: drawCrown },
      { key: 'tophat',    label: 'TOP HAT', fn: drawTopHat },
      { key: 'partyhat',  label: 'PARTY',   fn: drawPartyHat },
      { key: 'cowboy',    label: 'COWBOY',  fn: drawCowboyHat },
      { key: 'wizard',    label: 'WIZARD',  fn: drawWizardHat },
      { key: 'beanie',    label: 'BEANIE',  fn: drawBeanie },
      { key: 'baseball',  label: 'CAP',     fn: drawBaseballCap },
      { key: 'halo',      label: 'HALO',    fn: drawHalo },
      { key: 'viking',    label: 'VIKING',  fn: drawVikingHorns },
      { key: 'flowers',   label: 'FLOWERS', fn: drawFlowerCrown },
      { key: 'beret',     label: 'BERET',   fn: drawBeret },
      { key: 'fez',       label: 'FEZ',     fn: drawFez },
      { key: 'antlers',   label: 'ANTLERS', fn: drawAntlers },
    ],
  },
  {
    label: 'MASKS',
    items: [
      { key: 'none',      label: 'NONE',    fn: null },
      { key: 'glasses',   label: 'GLASSES', fn: drawGlasses },
      { key: 'mustache',  label: 'STACHE',  fn: drawMustache },
      { key: 'eyepatch',  label: 'EYEPATCH',fn: drawEyepatch },
      { key: 'joker',     label: 'JOKER',   fn: drawJokerFace },
      { key: 'alien',     label: 'ALIEN',   fn: drawAlien },
      { key: 'clown',     label: 'CLOWN',   fn: drawClownNose },
      { key: 'sunglass',  label: 'SHADES',  fn: drawSunglasses },
      { key: 'domino',    label: 'DOMINO',  fn: drawDominoMask },
      { key: 'blush',     label: 'BLUSH',   fn: drawBlush },
      { key: 'warpaint',  label: 'WAR',     fn: drawWarPaint },
      { key: 'stareyes',  label: 'STARS',   fn: drawStarEyes },
      { key: 'monocle',   label: 'MONOCLE', fn: drawMonocle },
      { key: 'goggles',   label: 'GOGGLES', fn: drawGoggles },
      { key: 'skimask',   label: 'SKI',     fn: drawSkiMask },
    ],
  },
  {
    label: 'OUTFITS',
    items: [
      { key: 'none',      label: 'NONE',    fn: null },
      { key: 'skeleton',  label: 'SKELETON',fn: drawSkeleton },
      { key: 'tuxedo',    label: 'TUXEDO',  fn: drawTuxedo },
      { key: 'stripes',   label: 'STRIPES', fn: drawStripes },
      { key: 'polkadots', label: 'DOTS',    fn: drawPolkaDots },
      { key: 'flames',    label: 'FLAMES',  fn: drawFlames },
      { key: 'camo',      label: 'CAMO',    fn: drawCamo },
      { key: 'checker',   label: 'CHECKER', fn: drawCheckerboard },
      { key: 'rainbow',   label: 'RAINBOW', fn: drawRainbowBody },
      { key: 'scales',    label: 'SCALES',  fn: drawScalesPattern },
      { key: 'frost',     label: 'FROST',   fn: drawIceFrost },
      { key: 'hawaiian',  label: 'HAWAIIAN',fn: drawHawaiian },
      { key: 'plaid',     label: 'PLAID',   fn: drawPlaid },
      { key: 'tie',       label: 'TIE',     fn: drawTie },
      { key: 'chain',     label: 'CHAIN',   fn: drawChain },
    ],
  },
];

// Flat list for backward-compat lookups (old skins with single `accessory` key)
export const ACCESSORY_LIST = ACCESSORY_TABS.flatMap(t => t.items);

// Appends a custom skin to SKINS and returns its index.
// Supports new format { hat, mask, outfit } and old format { accessory }.
export function addCustomSkinToList(skinData) {
  const fns = [];
  if (skinData.hat !== undefined || skinData.mask !== undefined || skinData.outfit !== undefined) {
    for (const key of ['hat', 'mask', 'outfit']) {
      const val = skinData[key] || 'none';
      if (val !== 'none') {
        const item = ACCESSORY_LIST.find(a => a.key === val);
        if (item?.fn) fns.push(item.fn);
      }
    }
  } else if (skinData.accessory && skinData.accessory !== 'none') {
    const item = ACCESSORY_LIST.find(a => a.key === skinData.accessory);
    if (item?.fn) fns.push(item.fn);
  }
  const skin = { name: skinData.name, c1: skinData.c1, c2: skinData.c2, c3: skinData.c3, custom: true };
  if (fns.length === 1) skin.extras = fns[0];
  else if (fns.length > 1) skin.extras = (c) => fns.forEach(f => f(c));
  const existingIdx = SKINS.findIndex(s => s.name === skin.name && s.custom);
  if (existingIdx !== -1) { SKINS[existingIdx] = skin; return existingIdx; }
  SKINS.push(skin);
  return SKINS.length - 1;
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
  const isPreview = w >= 200;
  const sc = isPreview ? 1.6 : 0.65;
  ctx2.translate(w / 2 + 4, h / 2 + (isPreview ? 18 : 8));
  ctx2.scale(sc, sc);

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
