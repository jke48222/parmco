/* =================================================================
   PARMCO — Universal Tweaks Panel (v3 — draggable + expanded)
   ================================================================= */
(function () {
  const STORAGE = 'parmco-tweaks-v3';
  const POS_STORAGE = 'parmco-tweaks-pos-v2';
  const root = document.documentElement;

  const PRESETS = {
    molten:     { label:'Molten',     '--bg':'#0E0E0C','--bg-2':'#151513','--bg-soft':'#1C1C1A','--paper':'#F3EEE4','--paper-2':'#E8E1D2','--ink':'#F3EEE4','--ink-dim':'rgba(243,238,228,0.62)','--ink-faint':'rgba(243,238,228,0.32)','--rule':'rgba(243,238,228,0.12)','--rule-strong':'rgba(243,238,228,0.26)','--accent':'#FF5B1F','--accent-2':'#E4FF3A','--accent-cool':'#7CD0FF' },
    phosphor:   { label:'Phosphor',   '--bg':'#050806','--bg-2':'#0A100C','--bg-soft':'#0F1811','--paper':'#C8FFD4','--paper-2':'#A5F0B8','--ink':'#C8FFD4','--ink-dim':'rgba(200,255,212,0.55)','--ink-faint':'rgba(200,255,212,0.28)','--rule':'rgba(200,255,212,0.12)','--rule-strong':'rgba(200,255,212,0.28)','--accent':'#2EFF88','--accent-2':'#E4FF3A','--accent-cool':'#7CD0FF' },
    editorial:  { label:'Editorial',  '--bg':'#F3EFE6','--bg-2':'#E8E3D6','--bg-soft':'#DDD7C6','--paper':'#0A0E1E','--paper-2':'#1B2134','--ink':'#0A0E1E','--ink-dim':'rgba(10,14,30,0.62)','--ink-faint':'rgba(10,14,30,0.28)','--rule':'rgba(10,14,30,0.12)','--rule-strong':'rgba(10,14,30,0.28)','--accent':'#C8361B','--accent-2':'#1B2134','--accent-cool':'#2B4A7A' },
    ultraviolet:{ label:'Ultraviolet','--bg':'#0A0614','--bg-2':'#120C24','--bg-soft':'#1A1332','--paper':'#F0E8FF','--paper-2':'#D6C5F0','--ink':'#F0E8FF','--ink-dim':'rgba(240,232,255,0.6)','--ink-faint':'rgba(240,232,255,0.28)','--rule':'rgba(240,232,255,0.12)','--rule-strong':'rgba(240,232,255,0.28)','--accent':'#B85CFF','--accent-2':'#FFB85C','--accent-cool':'#5CFFD0' },
    monochrome: { label:'Monochrome', '--bg':'#000','--bg-2':'#0A0A0A','--bg-soft':'#141414','--paper':'#FFF','--paper-2':'#E6E6E6','--ink':'#FFF','--ink-dim':'rgba(255,255,255,0.6)','--ink-faint':'rgba(255,255,255,0.28)','--rule':'rgba(255,255,255,0.12)','--rule-strong':'rgba(255,255,255,0.28)','--accent':'#FFF','--accent-2':'#C8C8C8','--accent-cool':'#9E9E9E' },
    cobalt:     { label:'Cobalt',     '--bg':'#050B1A','--bg-2':'#0A1530','--bg-soft':'#10204A','--paper':'#E4EEFF','--paper-2':'#BCCFF0','--ink':'#E4EEFF','--ink-dim':'rgba(228,238,255,0.6)','--ink-faint':'rgba(228,238,255,0.28)','--rule':'rgba(228,238,255,0.12)','--rule-strong':'rgba(228,238,255,0.28)','--accent':'#FFB43A','--accent-2':'#3AD6FF','--accent-cool':'#7CD0FF' },
    carbon:     { label:'Carbon',     '--bg':'#0B0B0B','--bg-2':'#141414','--bg-soft':'#1D1D1D','--paper':'#F2F2F2','--paper-2':'#D1D1D1','--ink':'#F2F2F2','--ink-dim':'rgba(242,242,242,0.6)','--ink-faint':'rgba(242,242,242,0.28)','--rule':'rgba(242,242,242,0.10)','--rule-strong':'rgba(242,242,242,0.24)','--accent':'#FF2D2D','--accent-2':'#FFD000','--accent-cool':'#3AA0FF' },
    dune:       { label:'Dune',       '--bg':'#1A1208','--bg-2':'#231810','--bg-soft':'#2D2014','--paper':'#F4E3C4','--paper-2':'#E0C89E','--ink':'#F4E3C4','--ink-dim':'rgba(244,227,196,0.62)','--ink-faint':'rgba(244,227,196,0.30)','--rule':'rgba(244,227,196,0.12)','--rule-strong':'rgba(244,227,196,0.28)','--accent':'#E88B3A','--accent-2':'#FFD89A','--accent-cool':'#9AB8D6' },
  };

  const FONT_PAIRS = {
    fraunces_inter:  { label:'Fraunces / Inter',          display:"'Fraunces', Georgia, serif", body:"'Inter', system-ui, sans-serif", google:'Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&family=Inter:wght@300;400;500' },
    playfair_mono:   { label:'Playfair / JetBrains',      display:"'Playfair Display', Georgia, serif", body:"'JetBrains Mono', ui-monospace, monospace", google:'Playfair+Display:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@300;400;500' },
    anton_ibmplex:   { label:'Anton / IBM Plex',          display:"'Anton', Impact, sans-serif", body:"'IBM Plex Sans', system-ui, sans-serif", google:'Anton&family=IBM+Plex+Sans:wght@300;400;500' },
    redaction_space: { label:'DM Serif / Space Mono',     display:"'DM Serif Display', serif", body:"'Space Mono', monospace", google:'DM+Serif+Display:ital@0;1&family=Space+Mono:wght@400;700' },
    bodoni_work:     { label:'Bodoni / Work Sans',        display:"'Bodoni Moda', serif", body:"'Work Sans', sans-serif", google:'Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400&family=Work+Sans:wght@300;400;500' },
    syne_space:      { label:'Syne / Space Grotesk',      display:"'Syne', sans-serif", body:"'Space Grotesk', sans-serif", google:'Syne:wght@500;700;800&family=Space+Grotesk:wght@300;400;500' },
    instrument_mono: { label:'Instrument / JetBrains',    display:"'Instrument Serif', serif", body:"'JetBrains Mono', monospace", google:'Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500' },
  };

  const DEFAULTS = {
    preset:'molten', accent:'#ff1f1f', fonts:'fraunces_inter',
    titleScale:0.84, letterSpacing:-0.035, grain:0,
    motion:true, cursor:true, marquee:true, reveal:true,
    lineHeight:1.4, gridSize:80, borderRadius:24, vignette:0,
    paragraphWidth:55, animSpeed:1, noiseScroll:false,
    density:0.9, ruleWeight:1, headingWeight:400, bodyWeight:300,
    accentGlow:0.1, scanlines:false, starfield:false, uppercaseHeadings:false,
    cursorStyle:'dot',
    bgEffect:'none',
  };

  function applyPreset(name){
    const p = PRESETS[name]||PRESETS.molten;
    Object.keys(p).forEach(k=>{ if(k.startsWith('--')) root.style.setProperty(k,p[k]); });
  }

  function applyFonts(name){
    const f = FONT_PAIRS[name]||FONT_PAIRS.fraunces_inter;
    const id = 'tweaks-font-'+name;
    if (!document.getElementById(id)){
      const l = document.createElement('link');
      l.id=id; l.rel='stylesheet';
      l.href='https://fonts.googleapis.com/css2?family='+f.google+'&display=swap';
      document.head.appendChild(l);
    }
    root.style.setProperty('--f-display',f.display);
    root.style.setProperty('--f-body',f.body);
  }

  function apply(s){
    applyPreset(s.preset);
    if (s.accent) root.style.setProperty('--accent',s.accent);
    applyFonts(s.fonts);
    root.style.setProperty('--scale-title',s.titleScale);
    root.style.setProperty('--letter-spacing-display',s.letterSpacing+'em');
    root.style.setProperty('--grain-opacity',s.motion?s.grain:0);
    root.style.setProperty('--line-height',s.lineHeight);
    document.body.style.setProperty('line-height',s.lineHeight);
    root.classList.toggle('no-motion',!s.motion);
    root.classList.toggle('no-cursor',!s.cursor);
    root.classList.toggle('no-marquee',!s.marquee);
    root.classList.toggle('no-reveal',!s.reveal);
    root.classList.toggle('noise-scroll',!!s.noiseScroll);
    root.classList.toggle('tw-scanlines',!!s.scanlines);
    root.classList.toggle('tw-starfield',!!s.starfield);
    root.classList.toggle('tw-uppercase',!!s.uppercaseHeadings);
    root.setAttribute('data-cursor-style', s.cursorStyle||'dot');
    if (!s.motion){
      document.querySelectorAll('animate, animateTransform, animateMotion').forEach(el=>el.setAttribute('repeatCount','0'));
    }
    root.style.setProperty('--grid-size',s.gridSize+'px');
    root.style.setProperty('--radius',(s.borderRadius||0)+'px');
    root.style.setProperty('--vignette',s.vignette||0);
    root.style.setProperty('--paragraph-width',(s.paragraphWidth||55)+'ch');
    root.style.setProperty('--anim-speed',s.animSpeed||1);
    root.style.setProperty('--density',s.density||1);
    root.style.setProperty('--rule-weight',(s.ruleWeight||1)+'px');
    root.style.setProperty('--f-display-weight',s.headingWeight||400);
    root.style.setProperty('--f-body-weight',s.bodyWeight||300);
    root.style.setProperty('--accent-glow',s.accentGlow||0);
    // scanline/starfield layers
    ensureOverlay('scanlines', s.scanlines);
    ensureOverlay('starfield', s.starfield);
    // background effect (one at a time)
    ensureBgEffect(s.bgEffect||'none');
  }

  function ensureOverlay(kind, on){
    const id = 'tw-ovl-'+kind;
    let el = document.getElementById(id);
    if (on && !el){
      el = document.createElement('div');
      el.id = id;
      el.className = 'tw-ovl tw-ovl--'+kind;
      if (kind==='starfield'){
        const stars = [];
        for (let i=0;i<80;i++){
          stars.push(`${(Math.random()*100).toFixed(2)}vw ${(Math.random()*100).toFixed(2)}vh #fff`);
        }
        el.style.setProperty('--stars', stars.join(','));
      }
      document.body.appendChild(el);
    } else if (!on && el){
      el.remove();
    }
  }

  /* ---------- reactbits-inspired animated backgrounds ---------- */
  let _bgRaf = null;
  function ensureBgEffect(kind){
    const id = 'tw-bg-effect';
    const existing = document.getElementById(id);
    if (existing){ existing.remove(); }
    if (_bgRaf){ cancelAnimationFrame(_bgRaf); _bgRaf = null; }
    if (!kind || kind==='none') return;

    const canvas = document.createElement('canvas');
    canvas.id = id;
    canvas.setAttribute('aria-hidden','true');
    Object.assign(canvas.style, {
      position:'fixed', inset:'0', width:'100%', height:'100%',
      pointerEvents:'none', zIndex:'0', opacity:'0.55',
    });
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio||1, 2);
    function size(){
      canvas.width  = innerWidth  * dpr;
      canvas.height = innerHeight * dpr;
    }
    size();
    addEventListener('resize', size, { passive:true });

    const accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#FF5B1F';
    const paper  = getComputedStyle(root).getPropertyValue('--paper').trim()  || '#F3EEE4';

    if (kind==='dotgrid'){
      // reactbits "Dot Grid" style — grid of dots that brighten along a traveling wave
      const GAP = 28 * dpr;
      const R   = 1.1 * dpr;
      const start = performance.now();
      function frame(now){
        const t = (now - start)/1000;
        ctx.clearRect(0,0,canvas.width, canvas.height);
        const cols = Math.ceil(canvas.width/GAP)+1;
        const rows = Math.ceil(canvas.height/GAP)+1;
        for (let y=0; y<rows; y++){
          for (let x=0; x<cols; x++){
            const px = x*GAP, py = y*GAP;
            // traveling wave from top-left
            const d = (px+py)/(canvas.width+canvas.height);
            const pulse = Math.sin((d*6) - t*1.1);
            const a = 0.08 + Math.max(0, pulse) * 0.55;
            ctx.globalAlpha = a;
            ctx.fillStyle = pulse>0.65 ? accent : paper;
            ctx.beginPath(); ctx.arc(px, py, R, 0, Math.PI*2); ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
        _bgRaf = requestAnimationFrame(frame);
      }
      _bgRaf = requestAnimationFrame(frame);
    }
    else if (kind==='beams'){
      // reactbits "Aurora / Beams" style — soft vertical light beams drifting
      const BEAMS = 6;
      const beams = Array.from({length:BEAMS}, (_,i)=>({
        x: Math.random()*canvas.width,
        w: (140 + Math.random()*260) * dpr,
        s: 0.2 + Math.random()*0.4,
        h: Math.random(),
        o: 0.04 + Math.random()*0.08,
      }));
      function frame(now){
        const t = now/1000;
        ctx.clearRect(0,0,canvas.width, canvas.height);
        beams.forEach((b,i)=>{
          const cx = (b.x + Math.sin(t*b.s + i)*80*dpr) % (canvas.width + b.w);
          const grad = ctx.createLinearGradient(cx, 0, cx, canvas.height);
          grad.addColorStop(0, 'transparent');
          grad.addColorStop(0.5, hexA(i%2?accent:paper, b.o));
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.fillRect(cx - b.w/2, 0, b.w, canvas.height);
        });
        _bgRaf = requestAnimationFrame(frame);
      }
      _bgRaf = requestAnimationFrame(frame);
    }
    else if (kind==='silk'){
      // reactbits "Silk" style — slow flowing noise bands
      const W = canvas.width, H = canvas.height;
      function frame(now){
        const t = now/2400;
        ctx.clearRect(0,0,W,H);
        for (let i=0; i<7; i++){
          const y = H * (0.12 + i*0.13) + Math.sin(t + i)*40*dpr;
          const amp = 60*dpr + i*12*dpr;
          ctx.beginPath();
          ctx.moveTo(0, y);
          for (let x=0; x<=W; x+=18*dpr){
            const yy = y + Math.sin((x/220) + t*1.4 + i*0.7) * amp * 0.25;
            ctx.lineTo(x, yy);
          }
          ctx.strokeStyle = hexA(i%2?accent:paper, 0.09);
          ctx.lineWidth = 1.2 * dpr;
          ctx.stroke();
        }
        _bgRaf = requestAnimationFrame(frame);
      }
      _bgRaf = requestAnimationFrame(frame);
    }
  }

  function hexA(hex, a){
    // accepts #RGB / #RRGGBB
    let c = hex.replace('#','').trim();
    if (c.length===3) c = c.split('').map(x=>x+x).join('');
    const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  apply(DEFAULTS);
})();

/* Shared scroll/UI behavior */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const nav = document.getElementById('site-nav');
    if (nav){
      const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 60);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    const observer = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{ if (e.isIntersecting){ e.target.classList.add('visible'); observer.unobserve(e.target); } });
    },{ threshold: 0.12 });
    document.querySelectorAll('.reveal, .split-word').forEach(el => observer.observe(el));

    document.querySelectorAll('.split-word').forEach(el=>{
      const text = el.textContent;
      el.textContent='';
      [...text].forEach((ch,i)=>{
        const s = document.createElement('span');
        s.className='c'; s.style.setProperty('--i',i);
        s.textContent = ch===' '?'\u00A0':ch;
        el.appendChild(s);
      });
    });

    if (!document.documentElement.classList.contains('no-cursor') && matchMedia('(pointer: fine)').matches){
      const dot = document.createElement('div');
      dot.className='cursor-dot';
      document.body.appendChild(dot);
      let tx=0,ty=0,cx=0,cy=0;
      window.addEventListener('mousemove',e=>{ tx=e.clientX; ty=e.clientY; });
      (function tick(){
        cx += (tx-cx)*0.22; cy += (ty-cy)*0.22;
        dot.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
        requestAnimationFrame(tick);
      })();
      document.querySelectorAll('a, button, input, select, .member-card, .artifact').forEach(el=>{
        el.addEventListener('mouseenter',()=>dot.classList.add('hover'));
        el.addEventListener('mouseleave',()=>dot.classList.remove('hover'));
      });
    }

    const toggle = document.querySelector('.nav-toggle');
    if (toggle) toggle.addEventListener('click', () => document.querySelector('.nav-links')?.classList.toggle('open'));

    // ── Footer text fit ─────────────────────────────────────────
    function fitFooterMarquee() {
      const el = document.querySelector('.footer-marquee');
      if (!el) return;
      const parent = el.parentElement;
      const available = parent.getBoundingClientRect().width;
      // Binary search for the right font-size
      let lo = 10, hi = 400, mid;
      el.style.fontSize = hi + 'px';
      for (let i = 0; i < 18; i++) {
        mid = (lo + hi) / 2;
        el.style.fontSize = mid + 'px';
        if (el.scrollWidth <= available) lo = mid;
        else hi = mid;
      }
      el.style.fontSize = lo + 'px';
    }
    fitFooterMarquee();
    window.addEventListener('resize', fitFooterMarquee, { passive: true });

    const blob = document.querySelector('.blob');
    if (blob){
      window.addEventListener('mousemove', e => {
        const x = (e.clientX/window.innerWidth-0.5)*60;
        const y = (e.clientY/window.innerHeight-0.5)*60;
        blob.style.transform = `translate(${x}px, ${y}px)`;
      });
    }
  });
})();
