// ===== Snapmaker PLA Full Spectrum pack: which colors can the slicer mix? =====
// T1 Cyan, T2 Magenta, T3 Yellow, T4 White (White Edition) or Gray (Gray Edition).
// Mix model: cyan/magenta/yellow layer subtractively (weighted geometric mean in linear RGB),
// white/gray lightens or dulls the result (linear blend). Ratios in 10 % steps, max. 3 filaments per mix.
// It is an approximation for choosing colors: the real result depends on TD values and layer height.
window.FS = (() => {
  const ED = {
    white: { label: 'Full Spectrum White Edition', fils: [['Cyan', '#00C3FF', 'C'], ['Magenta', '#F54399', 'M'], ['Yellow', '#FAE727', 'Y'], ['White', '#F2F2EF', 'W']] },
    gray: { label: 'Full Spectrum Gray Edition', fils: [['Cyan', '#08ABFB', 'C'], ['Magenta', '#D93B90', 'M'], ['Yellow', '#F9ED3D', 'Y'], ['Gray', '#A9A6A1', 'G']] },
  };
  const hx = h => { const n = parseInt(String(h).slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const toLin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const toS = v => Math.round(255 * Math.max(0, Math.min(1, v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)));
  const toHex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  function lab(r, g, b) {
    const R = toLin(r), G = toLin(g), B = toLin(b);
    const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    const x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047), y = f(R * 0.2126 + G * 0.7152 + B * 0.0722), z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  }
  const gam = {};
  function gamut(ed) {
    if (gam[ed]) return gam[ed];
    const P = (ED[ed] || ED.white).fils, F = P.map(f => hx(f[1]).map(toLin)), out = [];
    for (let a = 0; a <= 10; a++) for (let b = 0; a + b <= 10; b++) for (let c = 0; a + b + c <= 10; c++) {
      const d = 10 - a - b - c, w = [a, b, c, d];
      if (w.filter(Boolean).length > 3) continue;
      const wc = a + b + c, lin = [0, 1, 2].map(ch => {
        const cmy = wc ? Math.exp((a * Math.log(Math.max(F[0][ch], 0.003)) + b * Math.log(Math.max(F[1][ch], 0.003)) + c * Math.log(Math.max(F[2][ch], 0.003))) / wc) : 0;
        return (wc / 10) * cmy + (d / 10) * F[3][ch];
      });
      const rgb = lin.map(toS);
      out.push({ w, rgb, hex: toHex(rgb), lab: lab(...rgb), recipe: w.map((x, i) => x ? P[i][2] + x * 10 : '').filter(Boolean).join(' '), single: w.indexOf(10) });
    }
    return gam[ed] = out;
  }
  const memo = new Map();
  function snap(hex, ed) {
    const key = ed + hex; if (memo.has(key)) return memo.get(key);
    const L = lab(...hx(hex)); let best = null, bd = Infinity;
    for (const g of gamut(ed)) { const d = (L[0] - g.lab[0]) ** 2 + (L[1] - g.lab[1]) ** 2 + (L[2] - g.lab[2]) ** 2; if (d < bd) { bd = d; best = g; } }
    const r = { ...best, dE: Math.sqrt(bd) }; memo.set(key, r); return r;
  }
  // tool numbers: pure pack filaments T1–T4, every distinct mix gets the next number from T5
  function toolSet() { const m = new Map(); let next = 5; return s => { if (s.single >= 0) return s.single + 1; if (!m.has(s.recipe)) m.set(s.recipe, next++); return m.get(s.recipe); }; }
  return { ED, gamut, snap, toolSet };
})();
