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
  // ── MOBILE GAME PARODY ADS ─────────────────────────────────────────────────
  {
    brand:   'KINGDOM SIEGE™',
    tagline: 'GENERAL. THEY ARE AT THE GATES.',
    body:    'Your kingdom is under attack. Tap to send reinforcements. The gate will hold — if you act now.',
    cta:     'DOWNLOAD NOW — FREE',
    fine:    '*Kingdom Siege contains mild peril, heavy microtransactions, and a general who cannot read a map.',
    color:   '#cc4422',
    emoji:   '⚔️',
    anim(el) {
      let hp = 100;
      let locked = false;
      const DRAIN_MS = 22000;
      const startTime = Date.now();

      function render() {
        const pct = Math.max(0, Math.min(100, hp));
        const barColor = pct <= 20 ? '#ff2200' : pct <= 50 ? '#ffaa00' : '#44cc44';
        const status = pct > 60 ? 'HOLDING...' : pct > 30 ? "THEY'RE BREAKING THROUGH!" : 'ONE MORE HIT AND IT\'S OVER!';
        el.innerHTML = `
          <div style="font-size:7px;color:#cc4422;margin-bottom:4px;letter-spacing:1px">GATE HEALTH</div>
          <div style="background:#333;border-radius:4px;height:14px;width:100%;margin-bottom:6px;overflow:hidden">
            <div id="ad-ks-bar" style="height:100%;width:${pct}%;background:${barColor};transition:width 0.3s;border-radius:4px"></div>
          </div>
          <div id="ad-ks-pct" style="font-size:11px;color:#fff;margin-bottom:6px">${Math.round(pct)}%</div>
          <div id="ad-ks-status" style="font-size:8px;color:#ffcc88;margin-bottom:8px;height:12px">${locked ? '<span style="color:#ff3300;font-weight:bold">DOWNLOAD TO SAVE YOUR KINGDOM</span>' : status}</div>
          <button id="ad-ks-btn" style="background:${locked?'#444':'#cc4422'};color:${locked?'#888':'#fff'};border:none;padding:5px 12px;border-radius:4px;cursor:${locked?'default':'pointer'};font-size:9px;font-weight:bold;letter-spacing:1px">${locked ? 'REINFORCEMENTS BLOCKED' : '⚔️ REINFORCE (+5%)'}</button>`;
        if (!locked) {
          const btn = el.querySelector('#ad-ks-btn');
          if (btn) btn.addEventListener('click', () => {
            hp = Math.min(100, hp + 5);
            render();
          });
        }
      }

      render();

      const iv = setInterval(() => {
        if (locked) return;
        const elapsed = Date.now() - startTime;
        const natural = 100 - (elapsed / DRAIN_MS) * 100;
        if (natural < hp) hp = Math.max(1, natural);
        if (hp <= 1 && !locked) {
          locked = true;
          render();
          // flash red border
          let flashes = 0;
          const flashIv = setInterval(() => {
            el.style.boxShadow = flashes % 2 === 0 ? '0 0 12px #ff2200' : 'none';
            flashes++;
            if (flashes > 6) clearInterval(flashIv);
          }, 300);
        } else {
          render();
        }
      }, 200);

      // cleanup when ad removed
      const obs = new MutationObserver(() => { if (!el.isConnected) { clearInterval(iv); obs.disconnect(); } });
      obs.observe(document.body, { childList: true, subtree: true });
    },
  },
  {
    brand:   'CANDY SMASH LEGENDS',
    tagline: 'JUST ONE MORE LEVEL',
    body:    'One move left. One match away. This is the one. You can feel it.',
    cta:     'PLAY FREE (THEN PAY)',
    fine:    '*"Free" ends after 5 lives. Lives cost £1.99 each. The experts did not say that.',
    color:   '#ff66cc',
    emoji:   '🍬',
    anim(el) {
      let level = 1;
      let solves = 0;
      let phase = 'ready'; // ready | matched | paywall
      const CANDIES = ['🍭', '🍬'];

      function render() {
        let statusHtml = '';
        if (phase === 'paywall') {
          statusHtml = `<div style="color:#ffcc00;font-size:8px;font-weight:bold">LEVEL COMPLETE! Loading reward...</div>
            <div id="ad-cs-paywall" style="color:#ff3399;font-size:8px;margin-top:3px">CONTINUE FOR £1.99</div>`;
        } else if (phase === 'matched') {
          statusHtml = `<div style="font-size:16px">🎉✨🎊</div>`;
        } else {
          statusHtml = `<div style="font-size:8px;color:#ff88cc">LAST MATCH ✨</div>`;
        }

        const pct = phase === 'paywall' ? 99 : Math.min(99, (solves > 0 ? 40 : 0));
        const barColor = '#ff66cc';

        el.innerHTML = `
          <div style="font-size:7px;color:#ff66cc;margin-bottom:3px;letter-spacing:1px">LEVEL ${level} — MOVES LEFT: 1</div>
          <div style="background:#333;border-radius:4px;height:10px;width:100%;margin-bottom:5px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;transition:width 0.4s"></div>
          </div>
          <div style="margin-bottom:5px;min-height:24px">${statusHtml}</div>
          <div style="display:flex;gap:10px;justify-content:center;margin-bottom:6px">
            ${CANDIES.map((c, i) => `<div id="ad-candy-${i}" style="font-size:28px;cursor:pointer;border-radius:8px;padding:4px;transition:all 0.15s;border:2px solid ${phase==='ready'?'#ff66cc':'transparent'}">${c}</div>`).join('')}
          </div>
          <div style="font-size:7px;color:#ffaadd">SOLVES: ${solves}</div>`;

        if (phase === 'ready') {
          let picked = false;
          CANDIES.forEach((_, i) => {
            const candy = el.querySelector(`#ad-candy-${i}`);
            if (!candy) return;
            candy.addEventListener('click', () => {
              if (!picked) {
                picked = true;
                candy.style.background = '#ff66cc44';
                candy.style.transform = 'scale(1.2)';
              } else {
                // second click = match
                phase = 'matched';
                render();
                setTimeout(() => {
                  solves++;
                  level++;
                  phase = 'paywall';
                  render();
                  setTimeout(() => {
                    phase = 'ready';
                    render();
                  }, 2500);
                }, 600);
              }
            });
          });
        }
      }
      render();
    },
  },
  {
    brand:   'COIN BLASTER 3000',
    tagline: 'SPIN. WIN. REPEAT. SPEND MORE.',
    body:    'JACKPOT: £47,000. Nobody has won it. One spin could change that. This spin. Right now.',
    cta:     'FINAL FREE SPIN',
    fine:    '*Jackpot odds: 1 in 47,000. This was not your spin. The next one might be. (£2.99)',
    color:   '#ffdd00',
    emoji:   '🎰',
    anim(el) {
      const SYMBOLS = ['🍋','🍊','🍇','🔔','⭐','💎'];
      let spinCount = 0;
      let spinning = false;

      // near-miss results: first two match, third is one off
      function getResult(isJackpot) {
        if (isJackpot) return ['💎', '💎', '🍋']; // tantalizingly close
        const pairs = [['🍇','🍇','🔔'],['🔔','🔔','⭐'],['⭐','⭐','🍊']];
        return pairs[spinCount % pairs.length];
      }

      function render(reels, label, btnEnabled) {
        el.innerHTML = `
          <div style="font-size:7px;color:#ffdd00;margin-bottom:6px;letter-spacing:1px">${label}</div>
          <div style="display:flex;gap:8px;justify-content:center;margin-bottom:8px">
            ${reels.map(r => `<div style="background:#222;border:2px solid #ffdd00;border-radius:6px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:20px">${r}</div>`).join('')}
          </div>
          <button id="ad-slot-btn" style="background:${btnEnabled?'#ffdd00':'#555'};color:${btnEnabled?'#222':'#888'};border:none;padding:5px 16px;border-radius:4px;cursor:${btnEnabled?'pointer':'default'};font-size:9px;font-weight:bold">${spinning ? 'SPINNING...' : '🎰 SPIN'}</button>`;

        if (btnEnabled && !spinning) {
          const btn = el.querySelector('#ad-slot-btn');
          if (btn) btn.addEventListener('click', () => doSpin());
        }
      }

      function doSpin() {
        if (spinning) return;
        spinning = true;
        spinCount++;
        const isJackpot = spinCount >= 4;
        const fast = !isJackpot;
        const final = getResult(isJackpot);

        render(['❓','❓','❓'], isJackpot ? '🌟 JACKPOT SPIN 🌟' : `SPIN #${spinCount}`, false);

        // resolve reels 1 and 2 quickly
        const resolveTime = fast ? 500 : 1200;
        setTimeout(() => {
          render([final[0],'❓','❓'], isJackpot ? '🌟 JACKPOT SPIN 🌟' : `SPIN #${spinCount}`, false);
          setTimeout(() => {
            render([final[0], final[1],'❓'], isJackpot ? '🌟 JACKPOT SPIN 🌟' : `SPIN #${spinCount}`, false);

            if (isJackpot) {
              // slow third reel crawl
              let tickIdx = 0;
              const tickIv = setInterval(() => {
                const sym = SYMBOLS[tickIdx % SYMBOLS.length];
                render([final[0], final[1], sym], '🌟 JACKPOT SPIN 🌟', false);
                tickIdx++;
                if (tickIdx >= SYMBOLS.length + 3) {
                  clearInterval(tickIv);
                  render([final[0], final[1], final[2]], '💔 SO CLOSE. £47,000 MISSED BY ONE SYMBOL.', false);
                  spinning = false;
                  setTimeout(() => render([final[0], final[1], final[2]], '💔 SO CLOSE. £47,000 MISSED BY ONE SYMBOL.', true), 1200);
                }
              }, 400);
            } else {
              setTimeout(() => {
                render(final, `SPIN #${spinCount} — NOT YOUR LUCKY SPIN`, false);
                spinning = false;
                setTimeout(() => render(final, `SPIN #${spinCount} — NOT YOUR LUCKY SPIN`, true), 800);
              }, fast ? 300 : 600);
            }
          }, resolveTime);
        }, resolveTime);
      }

      render(['🎰','🎰','🎰'], 'TAP SPIN TO TRY YOUR LUCK', true);
    },
  },
  {
    brand:   'HERO WARS: FISH EDITION',
    tagline: 'ONLY 3% OF PLAYERS CAN SOLVE THIS',
    body:    'Answer 5 questions correctly. Nobody has done it. The prize is real. Probably.',
    cta:     'CLAIM YOUR PRIZE',
    fine:    '*Prize not confirmed. Questions designed by the general. The general got 0/5.',
    color:   '#ffaa22',
    emoji:   '🏆',
    anim(el) {
      const QUESTIONS = [
        { q: 'What is 1 + 1?',         opts: ['2', '3'],        outrage: 'INCORRECT' },
        { q: 'What colour is the sky?', opts: ['Blue', 'Red'],   outrage: 'STILL WRONG' },
        { q: 'How many sides on a square?', opts: ['4', '5'],    outrage: 'HOW' },
        { q: 'What sound does a cat make?',  opts: ['Meow', 'Woof'], outrage: 'GENERALS WEEP' },
        { q: 'What fish are YOU?',       opts: ['A fish', 'Also a fish'], final: true },
      ];
      let idx = 0;
      let awaitingFinal = false;
      let calculating = false;
      let dotCount = 0;
      let dotIv = null;

      function render() {
        if (calculating) {
          el.innerHTML = `
            <div style="font-size:9px;color:#ffaa22;margin-bottom:8px">QUESTION 5 / 5</div>
            <div style="font-size:9px;color:#fff;margin-bottom:12px">CALCULATING YOUR RESULT<span id="ad-hw-dots"></span></div>
            <div style="color:#888;font-size:7px">This may take a moment...</div>`;
          const dotsEl = el.querySelector('#ad-hw-dots');
          if (dotIv) clearInterval(dotIv);
          dotIv = setInterval(() => {
            dotCount++;
            if (dotsEl) dotsEl.textContent = '.'.repeat((dotCount % 3) + 1);
          }, 500);
          setTimeout(() => {
            if (dotIv) clearInterval(dotIv);
            if (!el.isConnected) return;
            el.innerHTML = `
              <div style="font-size:9px;color:#ffaa22;margin-bottom:6px">RESULT READY</div>
              <div style="color:#ff4400;font-size:9px;font-weight:bold;margin-bottom:8px">DOWNLOAD TO CONFIRM YOUR ANSWER</div>
              <div style="color:#888;font-size:7px">Your score has been calculated. Probably 100%.</div>`;
          }, 3000);
          return;
        }

        const q = QUESTIONS[idx];
        const qNum = idx + 1;
        const isFinal = !!q.final;

        if (isFinal && awaitingFinal) {
          // dramatic pause with dots
          el.innerHTML = `
            <div style="font-size:9px;color:#ffaa22;margin-bottom:6px">⚠️ FINAL QUESTION ⚠️</div>
            <div style="color:#ffcc66;font-size:9px;margin-bottom:10px">Preparing final challenge<span id="ad-hw-fdots"></span></div>`;
          if (dotIv) clearInterval(dotIv);
          const fDotsEl = el.querySelector('#ad-hw-fdots');
          dotIv = setInterval(() => {
            dotCount++;
            if (fDotsEl) fDotsEl.textContent = '.'.repeat((dotCount % 3) + 1);
          }, 400);
          setTimeout(() => {
            if (dotIv) clearInterval(dotIv);
            awaitingFinal = false;
            render();
          }, 2000);
          return;
        }

        el.innerHTML = `
          <div style="font-size:7px;color:#ffaa22;margin-bottom:4px;letter-spacing:1px">QUESTION ${qNum} / 5${isFinal ? ' — FINAL' : ''}</div>
          <div style="font-size:9px;color:#fff;margin-bottom:8px">${q.q}</div>
          <div style="display:flex;gap:8px;justify-content:center">
            ${q.opts.map((o, i) => `<button id="ad-hw-opt-${i}" style="background:#333;color:#fff;border:1px solid #ffaa22;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:8px">${o}</button>`).join('')}
          </div>
          <div id="ad-hw-verdict" style="min-height:14px;margin-top:6px;font-size:8px;color:#ff4400"></div>`;

        q.opts.forEach((_, i) => {
          const btn = el.querySelector(`#ad-hw-opt-${i}`);
          if (!btn) return;
          btn.addEventListener('click', () => {
            if (isFinal) {
              calculating = true;
              render();
              return;
            }
            const v = el.querySelector('#ad-hw-verdict');
            if (v) { v.textContent = q.outrage; v.style.color = '#ff4400'; }
            // disable both buttons
            q.opts.forEach((__, j) => {
              const b = el.querySelector(`#ad-hw-opt-${j}`);
              if (b) b.disabled = true;
            });
            setTimeout(() => {
              idx++;
              if (idx === 4) awaitingFinal = true;
              render();
            }, 700);
          });
        });
      }

      render();
      const obs = new MutationObserver(() => { if (!el.isConnected) { if (dotIv) clearInterval(dotIv); obs.disconnect(); } });
      obs.observe(document.body, { childList: true, subtree: true });
    },
  },
  {
    brand:   'RISE OF GENERALS™',
    tagline: 'SHE NEEDS YOUR HELP. THE KINGDOM IS FALLING.',
    body:    'Train your army. The final battle begins in 20 seconds. Will you be ready?',
    cta:     'SAVE THE KINGDOM',
    fine:    '*The kingdom cannot be saved without premium troops. She is not real. Timer: 847 days.',
    color:   '#884422',
    emoji:   '👑',
    anim(el) {
      let army = 30;
      let deploys = 0;
      const PRICES = ['£4.99', '£9.99', '£19.99', '£39.99'];
      let lastMsg = '';
      let autoIv = null;

      function render() {
        const pct = Math.min(100, army);
        const barColor = pct >= 95 ? '#ffdd00' : pct >= 70 ? '#44cc44' : '#aa4422';
        const status = lastMsg ? lastMsg :
          pct >= 97 ? "ARMY AT 97%! PUSH!" :
          pct >= 70 ? 'ALMOST READY...' : 'TRAINING...';
        const btnLabel = pct >= 98 ? '⚔️ DEPLOY' : '🪖 RECRUIT TROOPS (+8%)';
        const btnColor = pct >= 98 ? '#ffdd00' : '#884422';
        const btnTextColor = pct >= 98 ? '#222' : '#fff';

        el.innerHTML = `
          <div style="font-size:7px;color:#884422;margin-bottom:4px;letter-spacing:1px">ARMY STRENGTH</div>
          <div style="background:#333;border-radius:4px;height:14px;width:100%;margin-bottom:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;transition:width 0.2s"></div>
          </div>
          <div style="font-size:9px;color:#fff;margin-bottom:4px">${Math.round(pct)}%</div>
          <div style="font-size:7px;color:#ffcc88;margin-bottom:6px;min-height:12px">${status}</div>
          <button id="ad-rog-btn" style="background:${btnColor};color:${btnTextColor};border:none;padding:5px 12px;border-radius:4px;cursor:pointer;font-size:9px;font-weight:bold">${btnLabel}</button>`;

        const btn = el.querySelector('#ad-rog-btn');
        if (btn) btn.addEventListener('click', () => {
          if (army >= 98) {
            // DEPLOY
            deploys++;
            const price = PRICES[Math.min(deploys - 1, PRICES.length - 1)];
            lastMsg = `ENEMY REINFORCED — UPGRADE FOR ${price}`;
            army = 80;
            render();
            setTimeout(() => { lastMsg = ''; render(); }, 2000);
          } else {
            lastMsg = '';
            army = Math.min(100, army + 8);
            render();
          }
        });
      }

      render();

      autoIv = setInterval(() => {
        if (army < 98) {
          army = Math.min(98, army + 1);
          if (!lastMsg) render();
        }
      }, 1000);

      const obs = new MutationObserver(() => { if (!el.isConnected) { clearInterval(autoIv); obs.disconnect(); } });
      obs.observe(document.body, { childList: true, subtree: true });
    },
  },
  {
    brand:   'WORDMASTER PRO™',
    tagline: "I BET YOU CAN'T SOLVE LEVEL 1",
    body:    '4 letters. One word. £10,000 prize for the first person to complete Level 1.',
    cta:     'CLAIM £10,000',
    fine:    '*£10,000 prize requires proof of completion, notarised ID, and a Premium subscription (£19.99/month).',
    color:   '#44aaff',
    emoji:   '🔤',
    anim(el) {
      let solves = 0;
      let selected = [];
      let phase = 'play'; // play | correct | paywall
      const WORD = ['F', 'I', 'S', 'H'];

      function scramble(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      }

      let tiles = scramble(WORD);

      function render() {
        const answer = selected.join('');
        const pct = phase === 'paywall' ? 99 : (solves > 0 ? 99 : 0);
        const barColor = '#44aaff';
        let statusHtml = '';
        if (phase === 'paywall') {
          statusHtml = `<div style="color:#ff4400;font-size:7px;font-weight:bold">LOADING PRIZE TRANSFER...<br>VERIFICATION REQUIRED — DOWNLOAD TO CONFIRM</div>`;
        } else if (phase === 'correct') {
          statusHtml = `<div style="color:#44ff88;font-size:10px;font-weight:bold">FISH ✓ CORRECT!</div>`;
        } else {
          statusHtml = `<div style="font-size:7px;color:#44aaff">TAP TILES TO SPELL THE WORD</div>`;
        }

        el.innerHTML = `
          <div style="font-size:7px;color:#44aaff;margin-bottom:3px;letter-spacing:1px">LEVEL 1 — £10,000 PRIZE</div>
          <div style="background:#333;border-radius:4px;height:10px;width:100%;margin-bottom:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;transition:width 0.4s"></div>
          </div>
          <div style="min-height:22px;margin-bottom:4px">${statusHtml}</div>
          <div style="display:flex;gap:6px;justify-content:center;margin-bottom:5px">
            ${tiles.map((t, i) => {
              const used = selected.includes(t) && selected.indexOf(t) === selected.lastIndexOf(t) ? selected.indexOf(t) : -1;
              const isSelected = selected.indexOf(t) !== -1;
              return `<button id="ad-wm-tile-${i}" data-idx="${i}" style="background:${isSelected?'#44aaff44':'#333'};color:${isSelected?'#aaddff':'#fff'};border:2px solid ${isSelected?'#44aaff':'#556'};width:32px;height:32px;border-radius:6px;cursor:${(phase!=='play'||isSelected)?'default':'pointer'};font-size:14px;font-weight:bold">${t}</button>`;
            }).join('')}
          </div>
          <div style="background:#111;border-radius:4px;height:26px;display:flex;gap:4px;align-items:center;justify-content:center;margin-bottom:5px;padding:0 8px">
            ${WORD.map((_, i) => `<div style="width:22px;height:20px;border-bottom:2px solid ${selected[i]?'#44aaff':'#444'};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;color:#44aaff">${selected[i]||''}</div>`).join('')}
          </div>
          <div style="font-size:7px;color:#8899aa">SOLVES: ${solves}</div>`;

        if (phase === 'play') {
          tiles.forEach((t, i) => {
            const btn = el.querySelector(`#ad-wm-tile-${i}`);
            if (!btn || selected.length >= 4) return;
            if (selected.includes(t)) return;
            btn.addEventListener('click', () => {
              selected.push(t);
              if (selected.length === 4) {
                if (selected.join('') === 'FISH') {
                  phase = 'correct';
                  render();
                  setTimeout(() => {
                    solves++;
                    phase = 'paywall';
                    render();
                    setTimeout(() => {
                      phase = 'play';
                      selected = [];
                      tiles = scramble(WORD);
                      render();
                    }, 2500);
                  }, 700);
                } else {
                  // wrong order — reset
                  selected = [];
                  render();
                }
              } else {
                render();
              }
            });
          });
        }
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
