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
    preset:'molten', accent:'', fonts:'fraunces_inter',
    titleScale:1, letterSpacing:-0.035, grain:0.06,
    motion:true, cursor:true, marquee:true, reveal:true,
    lineHeight:1.6, gridSize:80, borderRadius:0, vignette:0,
    paragraphWidth:55, animSpeed:1, noiseScroll:false,
    density:1, ruleWeight:1, headingWeight:400, bodyWeight:300,
    accentGlow:0, scanlines:false, starfield:false, uppercaseHeadings:false,
    cursorStyle:'dot',
    bgEffect:'none',   // 'none' | 'dotgrid' | 'beams' | 'silk'
  };

  function load(){ try{ return Object.assign({},DEFAULTS,JSON.parse(localStorage.getItem(STORAGE)||'{}')); }catch(e){ return {...DEFAULTS}; } }
  function save(s){ try{ localStorage.setItem(STORAGE,JSON.stringify(s)); }catch(e){} }

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

  /* -------- panel build -------- */
  function build(state){
    const panel = document.createElement('div');
    panel.className = 'tweaks-panel visible';
    panel.id = 'tweaks-panel';
    const isCollapsed = localStorage.getItem('parmco-tweaks-collapsed')==='1';
    if (isCollapsed) panel.classList.add('collapsed');

    panel.innerHTML = `
      <div class="tweaks-header" id="tw-drag">
        <span class="tw-grip" title="Drag to move">⋮⋮</span>
        <span>Tweaks</span>
        <div class="tw-head-btns">
          <button class="tweaks-collapse" id="tw-reset-pos" title="Snap back to corner">⤢</button>
          <button class="tweaks-collapse" id="tw-collapse-btn" aria-label="Collapse">${isCollapsed?'‹':'›'}</button>
        </div>
      </div>

      <details class="tw-cat" open>
        <summary>Palette & accent</summary>
        <div class="tweaks-group">
          <span class="tweaks-label">Theme</span>
          <div class="tweaks-row" id="tw-presets"></div>
        </div>
        <div class="tweaks-group">
          <span class="tweaks-label">Accent</span>
          <div class="tweaks-row" id="tw-accents"></div>
          <input type="color" id="tw-accent-custom" class="tweaks-input" style="padding:0;height:26px;margin-top:.3rem" value="${state.accent||'#FF5B1F'}">
        </div>
        <div class="tweaks-group">
          <span class="tweaks-label">Accent glow · <span id="tw-ag-v">${Number(state.accentGlow).toFixed(2)}</span></span>
          <input type="range" class="tweaks-slider" id="tw-ag" min="0" max="1" step="0.05" value="${state.accentGlow}">
        </div>
      </details>

      <details class="tw-cat">
        <summary>Typography</summary>
        <div class="tweaks-group">
          <span class="tweaks-label">Font pair</span>
          <select class="tweaks-select" id="tw-fonts"></select>
        </div>
        <div class="tweaks-group">
          <span class="tweaks-label">Title scale · <span id="tw-scale-v">${state.titleScale.toFixed(2)}</span></span>
          <input type="range" class="tweaks-slider" id="tw-scale" min="0.7" max="1.4" step="0.02" value="${state.titleScale}">
        </div>
        <div class="tweaks-group">
          <span class="tweaks-label">Letter spacing · <span id="tw-ls-v">${state.letterSpacing.toFixed(3)}em</span></span>
          <input type="range" class="tweaks-slider" id="tw-ls" min="-0.08" max="0.02" step="0.005" value="${state.letterSpacing}">
        </div>
        <div class="tweaks-group">
          <span class="tweaks-label">Line height · <span id="tw-lh-v">${state.lineHeight.toFixed(2)}</span></span>
          <input type="range" class="tweaks-slider" id="tw-lh" min="1.3" max="1.9" step="0.02" value="${state.lineHeight}">
        </div>
        <div class="tweaks-group">
          <span class="tweaks-label">Heading weight · <span id="tw-hw-v">${state.headingWeight}</span></span>
          <input type="range" class="tweaks-slider" id="tw-hw" min="300" max="700" step="100" value="${state.headingWeight}">
        </div>
        <div class="tweaks-group">
          <span class="tweaks-label">Body weight · <span id="tw-bw-v">${state.bodyWeight}</span></span>
          <input type="range" class="tweaks-slider" id="tw-bw" min="300" max="500" step="100" value="${state.bodyWeight}">
        </div>
        <div class="tweaks-group">
          <span class="tweaks-label">Text width · <span id="tw-pw-v">${state.paragraphWidth}ch</span></span>
          <input type="range" class="tweaks-slider" id="tw-pw" min="40" max="90" step="1" value="${state.paragraphWidth}">
        </div>
        <div class="tweaks-group">
          <label class="tweaks-toggle"><input type="checkbox" id="tw-uc" ${state.uppercaseHeadings?'checked':''}> UPPERCASE headings</label>
        </div>
      </details>

      <details class="tw-cat">
        <summary>Layout & rules</summary>
        <div class="tweaks-group">
          <span class="tweaks-label">Density · <span id="tw-dn-v">${Number(state.density).toFixed(2)}×</span></span>
          <input type="range" class="tweaks-slider" id="tw-dn" min="0.6" max="1.6" step="0.05" value="${state.density}">
        </div>
        <div class="tweaks-group">
          <span class="tweaks-label">Rule weight · <span id="tw-rw-v">${state.ruleWeight}px</span></span>
          <input type="range" class="tweaks-slider" id="tw-rw" min="1" max="4" step="1" value="${state.ruleWeight}">
        </div>
        <div class="tweaks-group">
          <span class="tweaks-label">Grid size · <span id="tw-gs-v">${state.gridSize}px</span></span>
          <input type="range" class="tweaks-slider" id="tw-gs" min="40" max="160" step="10" value="${state.gridSize}">
        </div>
        <div class="tweaks-group">
          <span class="tweaks-label">Border radius · <span id="tw-br-v">${state.borderRadius}px</span></span>
          <input type="range" class="tweaks-slider" id="tw-br" min="0" max="24" step="1" value="${state.borderRadius}">
        </div>
      </details>

      <details class="tw-cat">
        <summary>Effects</summary>
        <div class="tweaks-group">
          <span class="tweaks-label">Grain · <span id="tw-grain-v">${state.grain.toFixed(2)}</span></span>
          <input type="range" class="tweaks-slider" id="tw-grain" min="0" max="0.2" step="0.01" value="${state.grain}">
        </div>
        <div class="tweaks-group">
          <span class="tweaks-label">Vignette · <span id="tw-vg-v">${Number(state.vignette).toFixed(2)}</span></span>
          <input type="range" class="tweaks-slider" id="tw-vg" min="0" max="1" step="0.05" value="${state.vignette}">
        </div>
        <div class="tweaks-group">
          <span class="tweaks-label">Animation speed · <span id="tw-as-v">${Number(state.animSpeed).toFixed(2)}×</span></span>
          <input type="range" class="tweaks-slider" id="tw-as" min="0.25" max="3" step="0.05" value="${state.animSpeed}">
        </div>
        <div class="tweaks-group">
          <label class="tweaks-toggle"><input type="checkbox" id="tw-motion" ${state.motion?'checked':''}> Animations</label>
          <label class="tweaks-toggle"><input type="checkbox" id="tw-marquee" ${state.marquee?'checked':''}> Marquee bands</label>
          <label class="tweaks-toggle"><input type="checkbox" id="tw-reveal" ${state.reveal?'checked':''}> Scroll reveal</label>
          <label class="tweaks-toggle"><input type="checkbox" id="tw-noise" ${state.noiseScroll?'checked':''}> Scroll noise</label>
          <label class="tweaks-toggle"><input type="checkbox" id="tw-scan" ${state.scanlines?'checked':''}> CRT scanlines</label>
          <label class="tweaks-toggle"><input type="checkbox" id="tw-stars" ${state.starfield?'checked':''}> Starfield background</label>
        </div>
        <div class="tweaks-group">
          <span class="tweaks-label">Animated background</span>
          <select class="tweaks-select" id="tw-bg">
            <option value="none"${state.bgEffect==='none'?' selected':''}>Off</option>
            <option value="dotgrid"${state.bgEffect==='dotgrid'?' selected':''}>Dot grid pulse</option>
            <option value="beams"${state.bgEffect==='beams'?' selected':''}>Aurora beams</option>
            <option value="silk"${state.bgEffect==='silk'?' selected':''}>Silk ribbons</option>
          </select>
        </div>
      </details>

      <details class="tw-cat">
        <summary>Cursor</summary>
        <div class="tweaks-group">
          <label class="tweaks-toggle"><input type="checkbox" id="tw-cursor" ${state.cursor?'checked':''}> Custom cursor</label>
          <span class="tweaks-label" style="margin-top:.5rem">Style</span>
          <select class="tweaks-select" id="tw-cs">
            <option value="dot"${state.cursorStyle==='dot'?' selected':''}>Dot (default)</option>
            <option value="ring"${state.cursorStyle==='ring'?' selected':''}>Ring outline</option>
            <option value="crosshair"${state.cursorStyle==='crosshair'?' selected':''}>Crosshair</option>
          </select>
        </div>
      </details>

      <div class="tweaks-group" style="border:none;padding-bottom:0;margin-bottom:0">
        <button class="btn btn--accent" id="tw-reset" style="width:100%;font-size:.65rem;padding:.6em">Reset to default</button>
      </div>
    `;
    document.body.appendChild(panel);

    // restore saved position (if any)
    try {
      const pos = JSON.parse(localStorage.getItem(POS_STORAGE)||'null');
      if (pos && typeof pos.left==='number' && typeof pos.top==='number'){
        panel.style.left = pos.left+'px';
        panel.style.top  = pos.top+'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
      }
    } catch(e){}

    // Presets
    const presetBox = panel.querySelector('#tw-presets');
    Object.entries(PRESETS).forEach(([key,p])=>{
      const b = document.createElement('button');
      b.className='tweaks-swatch';
      b.title = p.label;
      b.setAttribute('aria-pressed', key===state.preset?'true':'false');
      b.style.background = `linear-gradient(135deg, ${p['--bg']} 50%, ${p['--accent']} 50%)`;
      b.onclick = ()=>{ state.preset=key; state.accent=''; apply(state); save(state); refresh(); };
      presetBox.appendChild(b);
    });

    // Accents
    const accentBox = panel.querySelector('#tw-accents');
    ['#FF5B1F','#E4FF3A','#2EFF88','#7CD0FF','#B85CFF','#FF4D8D','#FFB43A','#FFFFFF'].forEach(c=>{
      const b=document.createElement('button');
      b.className='tweaks-swatch';
      b.style.background=c;
      b.onclick=()=>{ state.accent=c; apply(state); save(state); };
      accentBox.appendChild(b);
    });

    // Fonts
    const fontSel = panel.querySelector('#tw-fonts');
    Object.entries(FONT_PAIRS).forEach(([k,f])=>{
      const o=document.createElement('option');
      o.value=k; o.textContent=f.label;
      if (k===state.fonts) o.selected=true;
      fontSel.appendChild(o);
    });
    fontSel.onchange = e => { state.fonts = e.target.value; apply(state); save(state); };

    const bind=(id,key,valueEl,fmt,parse)=>{
      const el=panel.querySelector(id);
      if(!el) return;
      el.oninput=e=>{
        state[key]=parse?parse(e.target.value):e.target.value;
        if (valueEl) panel.querySelector(valueEl).textContent = fmt?fmt(state[key]):state[key];
        apply(state); save(state);
      };
    };
    bind('#tw-scale','titleScale','#tw-scale-v',v=>v.toFixed(2),parseFloat);
    bind('#tw-ls','letterSpacing','#tw-ls-v',v=>v.toFixed(3)+'em',parseFloat);
    bind('#tw-lh','lineHeight','#tw-lh-v',v=>v.toFixed(2),parseFloat);
    bind('#tw-grain','grain','#tw-grain-v',v=>v.toFixed(2),parseFloat);
    bind('#tw-gs','gridSize','#tw-gs-v',v=>v+'px',parseInt);
    bind('#tw-br','borderRadius','#tw-br-v',v=>v+'px',parseInt);
    bind('#tw-vg','vignette','#tw-vg-v',v=>v.toFixed(2),parseFloat);
    bind('#tw-pw','paragraphWidth','#tw-pw-v',v=>v+'ch',parseInt);
    bind('#tw-as','animSpeed','#tw-as-v',v=>v.toFixed(2)+'×',parseFloat);
    bind('#tw-dn','density','#tw-dn-v',v=>v.toFixed(2)+'×',parseFloat);
    bind('#tw-rw','ruleWeight','#tw-rw-v',v=>v+'px',parseInt);
    bind('#tw-hw','headingWeight','#tw-hw-v',v=>v,parseInt);
    bind('#tw-bw','bodyWeight','#tw-bw-v',v=>v,parseInt);
    bind('#tw-ag','accentGlow','#tw-ag-v',v=>v.toFixed(2),parseFloat);

    panel.querySelector('#tw-accent-custom').oninput = e=>{ state.accent=e.target.value; apply(state); save(state); };
    const chk=(id,key)=>{ const el=panel.querySelector(id); if(el) el.onchange=e=>{ state[key]=e.target.checked; apply(state); save(state); }; };
    chk('#tw-motion','motion'); chk('#tw-cursor','cursor'); chk('#tw-marquee','marquee');
    chk('#tw-reveal','reveal'); chk('#tw-noise','noiseScroll'); chk('#tw-scan','scanlines');
    chk('#tw-stars','starfield'); chk('#tw-uc','uppercaseHeadings');
    panel.querySelector('#tw-cs').onchange = e => { state.cursorStyle=e.target.value; apply(state); save(state); };
    panel.querySelector('#tw-bg').onchange = e => { state.bgEffect=e.target.value; apply(state); save(state); };

    panel.querySelector('#tw-reset').onclick = ()=>{ Object.assign(state,DEFAULTS); apply(state); save(state); refresh(); };

    panel.querySelector('#tw-collapse-btn').onclick = (e)=>{
      e.stopPropagation();
      panel.classList.toggle('collapsed');
      const c = panel.classList.contains('collapsed');
      localStorage.setItem('parmco-tweaks-collapsed', c?'1':'0');
      panel.querySelector('#tw-collapse-btn').textContent = c?'‹':'›';
    };

    panel.querySelector('#tw-reset-pos').onclick = (e)=>{
      e.stopPropagation();
      panel.style.left=''; panel.style.top='';
      panel.style.right='1rem'; panel.style.bottom='1rem';
      localStorage.removeItem(POS_STORAGE);
    };

    // DRAGGABLE behavior
    const drag = panel.querySelector('#tw-drag');
    let dragging = false, dx=0, dy=0;
    drag.addEventListener('mousedown', (e) => {
      // don't start drag if user clicked a header button
      if (e.target.closest('button')) return;
      dragging = true;
      const rect = panel.getBoundingClientRect();
      dx = e.clientX - rect.left;
      dy = e.clientY - rect.top;
      panel.classList.add('dragging');
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e)=>{
      if (!dragging) return;
      const maxX = window.innerWidth - 40;
      const maxY = window.innerHeight - 40;
      const left = Math.max(0, Math.min(maxX, e.clientX - dx));
      const top  = Math.max(0, Math.min(maxY, e.clientY - dy));
      panel.style.left = left+'px';
      panel.style.top  = top+'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    });
    window.addEventListener('mouseup', ()=>{
      if (!dragging) return;
      dragging = false;
      panel.classList.remove('dragging');
      const rect = panel.getBoundingClientRect();
      localStorage.setItem(POS_STORAGE, JSON.stringify({left:rect.left, top:rect.top}));
    });

    function refresh(){
      panel.querySelectorAll('#tw-presets .tweaks-swatch').forEach((b,i)=>{
        const k = Object.keys(PRESETS)[i];
        b.setAttribute('aria-pressed', k===state.preset?'true':'false');
      });
      const set = (sel, val)=>{ const el = panel.querySelector(sel); if(el) el.value = val; };
      const txt = (sel, val)=>{ const el = panel.querySelector(sel); if(el) el.textContent = val; };
      set('#tw-scale',state.titleScale); txt('#tw-scale-v',state.titleScale.toFixed(2));
      set('#tw-ls',state.letterSpacing); txt('#tw-ls-v',state.letterSpacing.toFixed(3)+'em');
      set('#tw-lh',state.lineHeight); txt('#tw-lh-v',state.lineHeight.toFixed(2));
      set('#tw-grain',state.grain); txt('#tw-grain-v',state.grain.toFixed(2));
      set('#tw-gs',state.gridSize); txt('#tw-gs-v',state.gridSize+'px');
      set('#tw-br',state.borderRadius); txt('#tw-br-v',state.borderRadius+'px');
      set('#tw-vg',state.vignette); txt('#tw-vg-v',Number(state.vignette).toFixed(2));
      set('#tw-pw',state.paragraphWidth); txt('#tw-pw-v',state.paragraphWidth+'ch');
      set('#tw-as',state.animSpeed); txt('#tw-as-v',Number(state.animSpeed).toFixed(2)+'×');
      set('#tw-dn',state.density); txt('#tw-dn-v',Number(state.density).toFixed(2)+'×');
      set('#tw-rw',state.ruleWeight); txt('#tw-rw-v',state.ruleWeight+'px');
      set('#tw-hw',state.headingWeight); txt('#tw-hw-v',state.headingWeight);
      set('#tw-bw',state.bodyWeight); txt('#tw-bw-v',state.bodyWeight);
      set('#tw-ag',state.accentGlow); txt('#tw-ag-v',Number(state.accentGlow).toFixed(2));
      set('#tw-fonts',state.fonts);
      set('#tw-cs',state.cursorStyle);
      set('#tw-bg',state.bgEffect||'none');
      set('#tw-accent-custom',state.accent||'#FF5B1F');
      ['#tw-motion','#tw-cursor','#tw-marquee','#tw-reveal','#tw-noise','#tw-scan','#tw-stars','#tw-uc'].forEach(id=>{
        const el = panel.querySelector(id);
        if (el) el.checked = !!state[{'#tw-motion':'motion','#tw-cursor':'cursor','#tw-marquee':'marquee','#tw-reveal':'reveal','#tw-noise':'noiseScroll','#tw-scan':'scanlines','#tw-stars':'starfield','#tw-uc':'uppercaseHeadings'}[id]];
      });
    }
    return panel;
  }

  const state = load();
  apply(state);
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>build(state));
  } else {
    build(state);
  }
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
