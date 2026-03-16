import S from './state.js';

const ADS = [
  {
    brand:  'FISH OIL PLUS™',
    tagline:'TIRED OF BEING EATEN?',
    body:   'Try Fish Oil Plus™. Clinically unproven to make you slightly less delicious to sharks.',
    cta:    'BUY 2 GET 1 FREE',
    fine:   '*Results may vary. Not responsible for shark encounters. Side effects include being eaten.',
    color:  '#ffaa00',
    emoji:  '🐟',
    anim(el) {
      // Fake "Add to Cart" counter
      el.innerHTML = `<div style="font-size:8px;color:#ffaa00;margin-bottom:6px">BOTTLES SOLD TODAY</div>
        <div id="ad-counter" style="font-size:22px;color:#fff">0</div>`;
      let n = Math.floor(Math.random() * 8000) + 1000;
      el.querySelector('#ad-counter').textContent = n.toLocaleString();
      const iv = setInterval(() => {
        n += Math.floor(Math.random() * 3) + 1;
        const c = el.querySelector('#ad-counter');
        if (c) c.textContent = n.toLocaleString(); else clearInterval(iv);
      }, 80);
    },
  },
  {
    brand:  'SHARKEAWAY™',
    tagline:'THE #1 SHARK REPELLENT',
    body:   'Sharks hate this one weird trick. Just spray and swim. Tested on zero sharks by zero scientists.',
    cta:    'ORDER NOW — £49.99',
    fine:   '*Offer expires when you die again. No refunds. Especially not underwater.',
    color:  '#44aaff',
    emoji:  '🦈',
    anim(el) {
      // Tap to spray the shark away
      el.innerHTML = `<div style="font-size:7px;color:#44aaff;margin-bottom:8px">TAP THE SHARK TO SPRAY IT</div>
        <div id="ad-shark" style="font-size:36px;cursor:pointer;transition:transform 0.1s">🦈</div>
        <div id="ad-spray-count" style="font-size:7px;color:#aabbcc;margin-top:6px">0 SPRAYS</div>`;
      let sprays = 0;
      el.querySelector('#ad-shark').addEventListener('click', () => {
        sprays++;
        const s = el.querySelector('#ad-shark');
        const c = el.querySelector('#ad-spray-count');
        if (s) { s.style.transform = 'scale(0.7) rotate(20deg)'; setTimeout(() => { if(s) s.style.transform = ''; }, 120); }
        if (c) c.textContent = `${sprays} SPRAY${sprays !== 1 ? 'S' : ''}`;
        if (sprays >= 5 && c) c.style.color = '#44ee88';
      });
    },
  },
  {
    brand:  'DR. FIN\'S SWIM ACADEMY',
    tagline:'SWIM FASTER. LIVE LONGER.',
    body:   'Our revolutionary 3-step program: 1. Swim. 2. Faster. 3. ??? Enrol today.',
    cta:    'ONLY £999/MONTH',
    fine:   '*Not a real doctor. Not a real fish. Results pending. Academy may not exist.',
    color:  '#44ee88',
    emoji:  '🎓',
    anim(el) {
      // Fake progress bar "ENROLMENT IN PROGRESS"
      el.innerHTML = `<div style="font-size:7px;color:#44ee88;margin-bottom:8px">ENROLLING YOU NOW...</div>
        <div style="width:100%;background:#0a1628;border:1px solid #1a3a5a;height:12px;position:relative">
          <div id="ad-enrol-bar" style="height:100%;background:#44ee88;width:0%;transition:width 0.3s"></div>
        </div>
        <div id="ad-enrol-txt" style="font-size:6px;color:#aabbcc;margin-top:6px">CHECKING AVAILABILITY...</div>`;
      const steps = ['CHECKING AVAILABILITY...','RESERVING YOUR LANE...','PROCESSING PAYMENT...','ALMOST DONE...','WAIT — ERROR 404','LANE NOT FOUND','REFUNDING... JUST KIDDING'];
      let i = 0;
      const iv = setInterval(() => {
        i++;
        const bar = el.querySelector('#ad-enrol-bar');
        const txt = el.querySelector('#ad-enrol-txt');
        if (!bar) { clearInterval(iv); return; }
        bar.style.width = Math.min(100, i * 15) + '%';
        if (txt && steps[i]) txt.textContent = steps[i];
        if (i >= steps.length) clearInterval(iv);
      }, 900);
    },
  },
  {
    brand:  'TREAT CO.™',
    tagline:'TREATS. JUST... TREATS.',
    body:   'Why do you collect them? We don\'t know either. But TREAT CO.™ has the finest treats in the ocean. Now with 40% more treat.',
    cta:    'SUBSCRIBE TO TREATS',
    fine:   '*Treat contents unknown. Treat Co.™ accepts no liability for treat-related incidents.',
    color:  '#ff88ff',
    emoji:  '⭐',
    anim(el) {
      // Clicker game — collect treats
      el.innerHTML = `<div style="font-size:7px;color:#ff88ff;margin-bottom:6px">CLICK TO COLLECT TREATS</div>
        <div id="ad-treat-emoji" style="font-size:40px;cursor:pointer;user-select:none">⭐</div>
        <div id="ad-treat-count" style="font-size:9px;color:#fff;margin-top:6px">0 TREATS</div>`;
      let treats = 0;
      el.querySelector('#ad-treat-emoji').addEventListener('click', function() {
        treats++;
        this.style.transform = 'scale(1.4)';
        setTimeout(() => { this.style.transform = ''; }, 100);
        const c = el.querySelector('#ad-treat-count');
        if (c) {
          c.textContent = `${treats} TREAT${treats !== 1 ? 'S' : ''}`;
          if (treats >= 10) { c.style.color = '#ff88ff'; c.textContent = `${treats} TREATS — YOU\'RE ADDICTED`; }
        }
      });
    },
  },
  {
    brand:  'OCEANIC THERAPY™',
    tagline:'IT\'S OKAY TO HAVE BEEN EATEN.',
    body:   'Our certified fish therapists are here for you. We offer trauma recovery, shark avoidance counselling, and group sessions.',
    cta:    'FIRST SESSION FREE',
    fine:   '*Not actual therapists. Not actual fish. Zoom only. Camera must stay on.',
    color:  '#aa88ff',
    emoji:  '🛋️',
    anim(el) {
      // Mood check — tap how you feel
      el.innerHTML = `<div style="font-size:7px;color:#aa88ff;margin-bottom:8px">HOW ARE YOU FEELING?</div>
        <div style="display:flex;gap:10px;justify-content:center;font-size:26px">
          ${['😭','😢','😐','🙂','😊'].map(e=>`<span class="ad-mood" data-e="${e}" style="cursor:pointer;transition:transform 0.15s">${e}</span>`).join('')}
        </div>
        <div id="ad-mood-resp" style="font-size:7px;color:#aabbcc;margin-top:8px;min-height:1.4em"> </div>`;
      const resps = { '😭':'WE HEAR YOU. BOOK NOW.','😢':'THAT\'S VALID. BOOK NOW.','😐':'INTERESTING. BOOK NOW.','🙂':'GREAT! BOOK NOW ANYWAY.','😊':'SUSPICIOUS. BOOK NOW.' };
      el.querySelectorAll('.ad-mood').forEach(m => {
        m.addEventListener('click', function() {
          this.style.transform = 'scale(1.5)';
          setTimeout(() => { this.style.transform = ''; }, 200);
          const r = el.querySelector('#ad-mood-resp');
          if (r) { r.textContent = resps[this.dataset.e]; r.style.color = '#aa88ff'; }
        });
      });
    },
  },
  {
    brand:  'MEGA GOOP™',
    tagline:'STOP SHARKS. WITH GOOP.',
    body:   'The premium artisanal goop that slows sharks down. Probably. Our scientists are still "working on it".',
    cta:    'SUBSCRIBE £14.99/MONTH',
    fine:   '*Goop may also slow you down. May also attract sharks. We\'re looking into it.',
    color:  '#66cc44',
    emoji:  '🧪',
    anim(el) {
      // Shake the bottle to mix the goop
      el.innerHTML = `<div style="font-size:7px;color:#66cc44;margin-bottom:6px">SHAKE THE BOTTLE</div>
        <div id="ad-goop-bottle" style="font-size:38px;cursor:pointer;display:inline-block">🧪</div>
        <div id="ad-goop-bar-wrap" style="width:100%;background:#0a1628;border:1px solid #1a3a5a;height:10px;margin-top:8px">
          <div id="ad-goop-bar" style="height:100%;background:#66cc44;width:0%;transition:width 0.2s"></div>
        </div>
        <div id="ad-goop-txt" style="font-size:6px;color:#aabbcc;margin-top:5px">0% MIXED</div>`;
      let pct = 0;
      el.querySelector('#ad-goop-bottle').addEventListener('click', function() {
        this.style.animation = 'none';
        this.style.transform = `rotate(${Math.random()*40-20}deg) scale(1.2)`;
        setTimeout(() => { this.style.transform = ''; }, 150);
        pct = Math.min(100, pct + Math.floor(Math.random()*12)+5);
        const bar = el.querySelector('#ad-goop-bar');
        const txt = el.querySelector('#ad-goop-txt');
        if (bar) bar.style.width = pct + '%';
        if (txt) txt.textContent = pct >= 100 ? '100% MIXED — APPLY TO SHARK' : `${pct}% MIXED`;
      });
    },
  },
  {
    brand:  'RAINBOW INSURANCE™',
    tagline:'PROTECT YOUR POWER-UPS.',
    body:   'Frenzy expired too soon? Ice wore off? We cover frenzy, ice, buddy, hourglass, and existential dread.',
    cta:    'GET COVERED TODAY',
    fine:   '*Rainbow Insurance™ is not real insurance. Claim process takes 6-8 business deaths.',
    color:  '#ff4488',
    emoji:  '🌈',
    anim(el) {
      // Spinning wheel of fortune
      const prizes = ['FRENZY','ICE','BUDDY','DENIED','HOURGLASS','DENIED','RAINBOW','DENIED'];
      el.innerHTML = `<div style="font-size:7px;color:#ff4488;margin-bottom:6px">SPIN FOR YOUR CLAIM</div>
        <div id="ad-wheel-result" style="font-size:11px;color:#fff;min-height:1.4em"> </div>
        <button id="ad-spin-btn" style="font-family:inherit;font-size:7px;background:none;border:1px solid #ff4488;color:#ff4488;padding:8px 14px;cursor:pointer;margin-top:6px">SPIN 🎡</button>`;
      let spinning = false;
      el.querySelector('#ad-spin-btn').addEventListener('click', function() {
        if (spinning) return;
        spinning = true;
        this.disabled = true;
        const r = el.querySelector('#ad-wheel-result');
        let ticks = 0; const total = 14 + Math.floor(Math.random()*8);
        const iv = setInterval(() => {
          if (r) r.textContent = prizes[ticks % prizes.length];
          ticks++;
          if (ticks >= total) {
            clearInterval(iv);
            spinning = false;
            this.disabled = false;
            if (r) { r.style.color = prizes[(ticks-1)%prizes.length] === 'DENIED' ? '#ee5566' : '#44ee88'; }
          }
        }, 120);
      });
    },
  },
  {
    brand:  'THE SHARK',
    tagline:'HI.',
    body:   '.',
    cta:    'SEE YOU SOON.',
    fine:   '*This was an ad.',
    color:  '#ff3333',
    emoji:  '🦈',
    anim(el) {
      // Shark swims across
      el.innerHTML = `<div id="ad-shark-swim" style="font-size:36px;position:relative;width:100%;height:44px;overflow:hidden">
        <span style="position:absolute;left:-40px;animation:ad-shark-swim 3s linear infinite">🦈</span>
      </div>`;
      if (!document.getElementById('ad-shark-swim-style')) {
        const s = document.createElement('style');
        s.id = 'ad-shark-swim-style';
        s.textContent = '@keyframes ad-shark-swim { from{left:-40px} to{left:calc(100% + 10px)} }';
        document.head.appendChild(s);
      }
    },
  },
  {
    brand:  'CLOUD SAVES INC.™',
    tagline:'YOUR SCORE. BUT SAFER.',
    body:   'Was your score lost? Did it feel bad? Subscribe to Cloud Saves Inc.™ and we\'ll store it somewhere. Probably.',
    cta:    'ONLY £∞/YEAR',
    fine:   '*Cloud Saves Inc. is not the cloud. We use a spreadsheet. It\'s fine.',
    color:  '#44ddff',
    emoji:  '☁️',
    anim(el) {
      // Fake upload progress that gets stuck
      el.innerHTML = `<div style="font-size:7px;color:#44ddff;margin-bottom:6px">UPLOADING YOUR SCORE...</div>
        <div style="width:100%;background:#0a1628;border:1px solid #1a3a5a;height:10px">
          <div id="ad-upload-bar" style="height:100%;background:#44ddff;width:0%;transition:width 0.4s"></div>
        </div>
        <div id="ad-upload-txt" style="font-size:6px;color:#aabbcc;margin-top:5px">CONNECTING...</div>`;
      const steps = [[10,'CONNECTING...'],[30,'AUTHENTICATING...'],[55,'UPLOADING...'],[72,'ALMOST...'],[72,'STILL UPLOADING...'],[72,'PLEASE WAIT...'],[72,'HAVE YOU TRIED TURNING IT OFF?'],[100,'UPLOAD COMPLETE — PROBABLY']];
      let i = 0;
      const iv = setInterval(() => {
        const bar = el.querySelector('#ad-upload-bar');
        const txt = el.querySelector('#ad-upload-txt');
        if (!bar || i >= steps.length) { clearInterval(iv); return; }
        bar.style.width = steps[i][0] + '%';
        if (txt) { txt.textContent = steps[i][1]; if(i===steps.length-1) txt.style.color='#44ee88'; }
        i++;
      }, 800);
    },
  },
  {
    brand:  'BUDDY FISH DATING™',
    tagline:'LONELY IN THE OCEAN?',
    body:   '"I matched with a decoy fish. No regrets." — satisfied customer. Find your perfect companion today.',
    cta:    'SWIPE RIGHT ON A BUDDY',
    fine:   '*BuddyFish™ not responsible for matches with decoys, sharks, or power-up items.',
    color:  '#ffcc44',
    emoji:  '💘',
    anim(el) {
      // Swipe left/right on potential matches
      const profiles = [
        { name:'BUBBLES', job:'PROFESSIONAL SWIMMER', fish:'🐠' },
        { name:'GARY',    job:'PART-TIME DECOY',      fish:'🐡' },
        { name:'THE SHARK', job:'DEFINITELY NOT A SHARK', fish:'🦈' },
        { name:'NEMO',    job:'LOST, NEEDS DIRECTIONS', fish:'🐟' },
      ];
      let idx = 0;
      function render() {
        const p = profiles[idx % profiles.length];
        el.innerHTML = `<div style="font-size:24px">${p.fish}</div>
          <div style="font-size:9px;color:#ffcc44;margin:4px 0">${p.name}</div>
          <div style="font-size:6px;color:#aabbcc;margin-bottom:8px">${p.job}</div>
          <div style="display:flex;gap:12px">
            <button class="ad-swipe" data-dir="left"  style="font-family:inherit;font-size:7px;background:none;border:1px solid #ee5566;color:#ee5566;padding:6px 10px;cursor:pointer">✕ NOPE</button>
            <button class="ad-swipe" data-dir="right" style="font-family:inherit;font-size:7px;background:none;border:1px solid #44ee88;color:#44ee88;padding:6px 10px;cursor:pointer">♥ YES</button>
          </div>`;
        el.querySelectorAll('.ad-swipe').forEach(btn => {
          btn.addEventListener('click', () => {
            if (btn.dataset.dir === 'right' && profiles[idx%profiles.length].fish === '🦈') {
              el.innerHTML = `<div style="font-size:8px;color:#ee5566">IT\'S A MATCH!<br><br>🦈<br><br>HE WILL FIND YOU.</div>`;
            } else { idx++; render(); }
          });
        });
      }
      render();
    },
  },
];

let _resolve = null;
let _cleanup = null;

export function showAd() {
  if (!S.settings.showAds) return Promise.resolve();
  return new Promise(resolve => {
    _resolve = resolve;
    const ad = ADS[Math.floor(Math.random() * ADS.length)];
    const el = document.getElementById('ad-overlay');
    if (!el) { resolve(); return; }

    el.innerHTML = `
      <div class="ad-box" id="ad-box">
        <div class="ad-sponsored">📺 AD — BROUGHT TO YOU BY AI</div>
        <div class="ad-emoji">${ad.emoji}</div>
        <div class="ad-brand" style="color:${ad.color}">${ad.brand}</div>
        <div class="ad-tagline">${ad.tagline}</div>
        <div class="ad-body">${ad.body}</div>
        <div id="ad-anim" class="ad-anim"></div>
        <div class="ad-cta" style="border-color:${ad.color};color:${ad.color}">${ad.cta}</div>
        <div class="ad-fine">${ad.fine}</div>
        <div class="ad-skip-row">
          <div class="ad-timer-bar"><div class="ad-timer-fill" id="ad-timer-fill"></div></div>
        </div>
      </div>
      <button class="ad-skip-btn" id="ad-skip-btn">SKIP ▶</button>`;

    el.classList.remove('hidden');

    const DURATION = 20000;
    let remaining = DURATION;
    let startedAt = Date.now();
    let autoTO = null;
    const fill = document.getElementById('ad-timer-fill');

    function startTimer() {
      if (fill) {
        fill.style.transition = 'none';
        fill.style.width = (remaining / DURATION * 100) + '%';
        requestAnimationFrame(() => requestAnimationFrame(() => {
          fill.style.transition = `width ${remaining / 1000}s linear`;
          fill.style.width = '0%';
        }));
      }
      startedAt = Date.now();
      autoTO = setTimeout(closeAd, remaining);
    }

    function pauseTimer() {
      clearTimeout(autoTO);
      remaining -= Date.now() - startedAt;
      if (fill) {
        const computed = getComputedStyle(fill).width;
        fill.style.transition = 'none';
        fill.style.width = computed;
      }
    }

    function onVisibilityChange() {
      if (document.hidden) pauseTimer();
      else startTimer();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    startTimer();

    // Run the per-ad interactive animation
    const animEl = document.getElementById('ad-anim');
    if (animEl && ad.anim) ad.anim(animEl);

    // Skip button flees the mouse until timer expires
    const skipBtn = document.getElementById('ad-skip-btn');
    let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
    let timerDone = false;
    let wanderTO = null;

    function onMouseMove(e) { mouseX = e.clientX; mouseY = e.clientY; }
    document.addEventListener('mousemove', onMouseMove);

    function fleeSkip() {
      if (!skipBtn || !skipBtn.isConnected || timerDone) return;
      const bw = skipBtn.offsetWidth  || 50;
      const bh = skipBtn.offsetHeight || 20;
      const margin = 6;
      const btnCX = parseFloat(skipBtn.style.left || 0) + bw / 2;
      const btnCY = parseFloat(skipBtn.style.top  || 0) + bh / 2;
      // Vector away from mouse
      let dx = btnCX - mouseX;
      let dy = btnCY - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      // Only flee if mouse is within 180px
      if (dist < 180) {
        dx = (dx / dist) * 160;
        dy = (dy / dist) * 160;
      } else {
        // Drift gently to a random spot
        dx = (Math.random() - 0.5) * 80;
        dy = (Math.random() - 0.5) * 80;
      }
      const newX = Math.max(margin, Math.min(window.innerWidth  - bw  - margin, btnCX + dx - bw / 2));
      const newY = Math.max(margin, Math.min(window.innerHeight - bh - margin, btnCY + dy - bh / 2));
      skipBtn.style.left = newX + 'px';
      skipBtn.style.top  = newY + 'px';
      wanderTO = setTimeout(fleeSkip, 120);
    }
    fleeSkip();

    // When timer expires, stop fleeing and make button obvious
    setTimeout(() => {
      timerDone = true;
      clearTimeout(wanderTO);
      if (skipBtn) {
        skipBtn.style.transition = 'left 0.4s ease, top 0.4s ease, color 0.3s, border-color 0.3s, font-size 0.3s';
        skipBtn.style.left = (window.innerWidth  / 2 - 30) + 'px';
        skipBtn.style.top  = (window.innerHeight / 2 + 160) + 'px';
        skipBtn.style.color = '#44ddff';
        skipBtn.style.borderColor = '#44ddff';
        skipBtn.style.fontSize = '8px';
      }
      document.removeEventListener('mousemove', onMouseMove);
    }, DURATION);

    skipBtn?.addEventListener('click', e => {
      e.stopPropagation();
      clearTimeout(autoTO);
      clearTimeout(wanderTO);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      closeAd();
    });

    // Clicking anywhere outside the ad box opens Claude (like a real ad)
    el.addEventListener('click', e => {
      if (!e.target.closest('#ad-box') && !e.target.closest('#ad-skip-btn')) {
        window.open('https://claude.ai', '_blank', 'noopener');
      }
    });

    // Store cleanup so closeAd can remove the listener on auto-dismiss too
    _cleanup = () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('mousemove', onMouseMove);
      clearTimeout(wanderTO);
    };
  });
}

function closeAd() {
  if (_cleanup) { _cleanup(); _cleanup = null; }
  const el = document.getElementById('ad-overlay');
  if (el) el.classList.add('hidden');
  if (_resolve) { _resolve(); _resolve = null; }
}
