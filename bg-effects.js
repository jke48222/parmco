/* bg-effects.js — section-scoped canvas backgrounds for PARMCO
   Usage:
     BgEffects.dotGrid(element)
     BgEffects.silk(element)
   The canvas is inserted as the FIRST child of `element`, absolutely
   fills it, and is pointer-events:none so content stays interactive.
*/
(function (global) {
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  function getColors(el) {
    const st = getComputedStyle(el.ownerDocument.documentElement);
    return {
      accent : st.getPropertyValue('--accent').trim()  || '#FF5B1F',
      paper  : st.getPropertyValue('--paper').trim()   || '#F3EEE4',
    };
  }

  function hexA(hex, a) {
    let c = hex.replace('#', '').trim();
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(255,255,255,${a})`;
    return `rgba(${r},${g},${b},${a})`;
  }

  function makeCanvas(parent) {
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
      position       : 'absolute',
      inset          : '0',
      width          : '100%',
      height         : '100%',
      pointerEvents  : 'none',
      zIndex         : '0',
      display        : 'block',
    });
    // Insert before first child so content sits on top
    parent.insertBefore(canvas, parent.firstChild);

    const ctx = canvas.getContext('2d');

    function resize() {
      const rect = parent.getBoundingClientRect();
      canvas.width  = rect.width  * DPR;
      canvas.height = rect.height * DPR;
    }
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    return { canvas, ctx, resize, destroy: () => ro.disconnect() };
  }

  /* ── DOT GRID PULSE ─────────────────────────────────────────────────── */
  function dotGrid(parent) {
    const { canvas, ctx } = makeCanvas(parent);
    const GAP = 28 * DPR;
    const R   = 1.1 * DPR;
    const start = performance.now();
    let raf;

    function frame(now) {
      const t = (now - start) / 1000;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const { accent, paper } = getColors(parent);
      const cols = Math.ceil(W / GAP) + 1;
      const rows = Math.ceil(H / GAP) + 1;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const px = col * GAP, py = row * GAP;
          const d = (px + py) / (W + H);
          const pulse = Math.sin(d * 6 - t * 1.1);
          const a = 0.06 + Math.max(0, pulse) * 0.52;
          ctx.globalAlpha = a;
          ctx.fillStyle = pulse > 0.65 ? accent : paper;
          ctx.beginPath();
          ctx.arc(px, py, R, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }

  /* ── SILK RIBBONS ───────────────────────────────────────────────────── */
  function silk(parent) {
    const { canvas, ctx } = makeCanvas(parent);
    let raf;

    function frame(now) {
      const t = now / 2400;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const { accent, paper } = getColors(parent);
      const BANDS = 7;
      for (let i = 0; i < BANDS; i++) {
        const yBase = H * (0.1 + i * 0.13) + Math.sin(t + i) * 38 * DPR;
        const amp   = (55 + i * 10) * DPR;
        ctx.beginPath();
        ctx.moveTo(0, yBase);
        for (let x = 0; x <= W; x += 16 * DPR) {
          const y = yBase + Math.sin((x / 200) + t * 1.4 + i * 0.7) * amp * 0.24;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = hexA(i % 2 === 0 ? accent : paper, 0.1);
        ctx.lineWidth   = 1.3 * DPR;
        ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }

  global.BgEffects = { dotGrid, silk };
})(window);
