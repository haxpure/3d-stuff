// ===== LANDSCAPE BUILDINGS (pure, no DOM) =====
// Buildings are stored in meters east / north of the map center; meshes are made in print mm.

// --- vector tile -> buildings ---
// clip a ring (tile coords, y down) to [0,E]^2; returns [[x,y]...] or null
function lmClipTile(ring, E) {
  let pts = ring.slice(); if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
  let cut = false;
  for (const [ax, val, sg] of [[0, 0, 1], [0, E, -1], [1, 0, 1], [1, E, -1]]) {
    if (!pts.length) break; const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], ia = sg * (a[ax] - val) >= 0, ib = sg * (b[ax] - val) >= 0;
      if (ia) out.push(a);
      if (ia !== ib) { const t = (val - a[ax]) / (b[ax] - a[ax]); const q = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]; q[ax] = val; out.push(q); cut = true; }
    }
    pts = out;
  }
  return pts.length >= 3 ? { pts, cut } : null;
}
const lmArea = r => { let a = 0; for (let i = 0, n = r.length / 2, j = n - 1; i < n; j = i++) a += (r[j * 2] - r[i * 2]) * (r[j * 2 + 1] + r[i * 2 + 1]); return a / 2; };   // >0 = CCW (y up)

// drop duplicate / collinear points and very short edges (flat array [x,y,...], meters)
function lmSimplify(r, minEdge = 0.3, sinTol = 0.06) {
  let pts = []; for (let i = 0; i < r.length; i += 2) pts.push([r[i], r[i + 1]]);
  for (let pass = 0; pass < 6 && pts.length > 3; pass++) {
    const out = []; let changed = false;
    for (let i = 0; i < pts.length; i++) {
      const a = out.length ? out[out.length - 1] : pts[(i - 1 + pts.length) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length];
      const ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - b[0], vy = c[1] - b[1], lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
      if (lu < minEdge || lv < 1e-9 || Math.abs(ux * vy - uy * vx) < sinTol * lu * lv && ux * vx + uy * vy > 0) { changed = true; continue; }
      out.push(b);
    }
    if (out.length < 3) break;
    pts = out; if (!changed) break;
  }
  if (pts.length < 3) return null;
  const f = new Float64Array(pts.length * 2); pts.forEach((q, i) => { f[i * 2] = q[0]; f[i * 2 + 1] = q[1]; });
  return f;
}

// one decoded 'building' layer of a z/x/y tile -> [{o, holes, h, mh, col, cut, area}]
// toM(lat, lon) -> [x, y] meters; keep(x, y) tells whether a point is inside the map
function lmTileBuildings(layer, z, x, y, toM, keep) {
  const out = []; if (!layer) return out;
  const n = 2 ** z, E = layer.extent || 4096;
  const ll = (px, py) => [Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + py / E) / n))) * 180 / Math.PI, (x + px / E) / n * 360 - 180];
  for (const f of layer.features) {
    if (f.type !== 3 || f.props.hide_3d) continue;
    const h = +f.props.render_height, mh = +f.props.render_min_height || 0;
    let cur = null;
    for (const part of f.parts) {
      const c = lmClipTile(part, E); if (!c) continue;
      const r = new Float64Array(c.pts.length * 2);
      c.pts.forEach((q, i) => { const m = toM(...ll(q[0], q[1])); r[i * 2] = m[0]; r[i * 2 + 1] = m[1]; });
      // MVT: exterior rings are clockwise in tile coords (y down) = clockwise in meters (y up) -> negative area here
      const a = lmArea(r), rev = q => { const o = new Float64Array(q.length); for (let i = 0, n = q.length / 2; i < n; i++) { o[i * 2] = q[(n - 1 - i) * 2]; o[i * 2 + 1] = q[(n - 1 - i) * 2 + 1]; } return o; };
      if (a < 0) {      // exterior -> stored CCW
        const s = lmSimplify(rev(r)); cur = null; if (!s || lmArea(s) < 4) continue;
        let inside = true; for (let i = 0; i < s.length; i += 2) if (!keep(s[i], s[i + 1])) { inside = false; break; }
        if (!inside) continue;
        cur = { o: s, holes: [], h: h > 0 ? h : 0, mh: mh > 0 && h - mh >= 2 ? mh : 0, col: typeof f.props.colour === 'string' ? f.props.colour : null, cut: c.cut, area: lmArea(s), id: f.id };
        out.push(cur);
      } else if (cur && a > 2) { const s = lmSimplify(rev(r)); if (s && lmArea(s) < -2) cur.holes.push(s); }   // hole -> stored CW
    }
  }
  return out;
}

// --- shape analysis ---
function lmConvex(P) {   // P flat CCW
  const n = P.length / 2; let neg = 0;
  for (let i = 0; i < n; i++) {
    const a = i * 2, b = ((i + 1) % n) * 2, c = ((i + 2) % n) * 2;
    const cr = (P[b] - P[a]) * (P[c + 1] - P[b + 1]) - (P[b + 1] - P[a + 1]) * (P[c] - P[b]);
    const l = Math.hypot(P[b] - P[a], P[b + 1] - P[a + 1]) * Math.hypot(P[c] - P[b], P[c + 1] - P[b + 1]);
    if (cr < -0.02 * l) neg++;
  }
  return neg === 0;
}
// narrowest width over all edge directions (= width of the minimal bounding rectangle for convex shapes)
function lmWidth(P) {
  const n = P.length / 2; let best = Infinity, len = 0;
  for (let i = 0; i < n; i++) {
    const a = i * 2, b = ((i + 1) % n) * 2, ex = P[b] - P[a], ey = P[b + 1] - P[a + 1], l = Math.hypot(ex, ey); if (l < 1e-9) continue;
    const ux = ex / l, uy = ey / l; let lo = Infinity, hi = -Infinity, lo2 = Infinity, hi2 = -Infinity;
    for (let k = 0; k < n; k++) { const d = -(P[k * 2] - P[a]) * uy + (P[k * 2 + 1] - P[a + 1]) * ux, t = (P[k * 2] - P[a]) * ux + (P[k * 2 + 1] - P[a + 1]) * uy; lo = Math.min(lo, d); hi = Math.max(hi, d); lo2 = Math.min(lo2, t); hi2 = Math.max(hi2, t); }
    if (hi - lo < best) { best = hi - lo; len = hi2 - lo2; }
  }
  return { w: best, len };
}
const lmHash = (b) => { let h = 2166136261 >>> 0; const v = b.o; for (let i = 0; i < Math.min(v.length, 6); i++) { h ^= Math.round(v[i] * 10) & 0xffff; h = Math.imul(h, 16777619) >>> 0; } return h; };

// roof type: 'flat' | 'gable' | 'hip' | 'dist'
function lmRoofType(b, o) {
  if (!(o.tanP > 0) || b.cut || b.holes.length || b.mh > 0) return 'flat';
  const hM = b.h > 0 ? b.h : o.defH;
  if (hM > o.maxPitchedH || b.area < 18 || b.area > 1100) return 'flat';
  const { w, len } = lmWidth(b.o); if (w > o.roofMaxW) return 'flat';
  const n = b.o.length / 2, cvx = lmConvex(b.o);
  if (!cvx) return n <= 16 ? 'dist' : 'flat';
  if (n === 4 && len / Math.max(w, 1e-6) > 1.15) return (lmHash(b) % 10) < 8 ? 'gable' : 'hip';
  return 'hip';
}

// --- solids ---
// em: { v(x, y, z, u, fv, kind) -> index, t(a, b, c, kind), bottom: bool }
//   kind 0 = wall, 1 = roof, 2 = bottom; u = meters along the wall, fv = meters above ground (roof: -10)
// P: outer ring (flat, mm, CCW), H: holes (flat, mm, CW). zb bottom, ze eave, tanP roof slope.
// mPerMM converts mm on the print to real meters (for the window pattern); zg = ground height (mm), hs = mm per real meter vertically.
function lmSolid(em, P, H, zb, ze, roof, tanP, mPerMM, zg, hs, capH) {
  const roofT = [];   // [[x,y,z] x3]
  const n = P.length / 2;
  if (roof === 'gable' || roof === 'hip') {
    const E = [];
    for (let i = 0; i < n; i++) { const a = i * 2, b = ((i + 1) % n) * 2, ex = P[b] - P[a], ey = P[b + 1] - P[a + 1], l = Math.hypot(ex, ey); E.push({ ax: P[a], ay: P[a + 1], nx: -ey / l, ny: ex / l, l }); }
    let act = E.map((_, i) => i);
    if (roof === 'gable' && n === 4) act = E[0].l + E[2].l >= E[1].l + E[3].l ? [0, 2] : [1, 3];
    const d = (e, x, y) => e.nx * (x - e.ax) + e.ny * (y - e.ay);
    for (const i of act) {
      let F = []; for (let k = 0; k < n; k++) F.push([P[k * 2], P[k * 2 + 1]]);
      for (const j of act) {
        if (j === i || !F.length) continue;
        const ei = E[i], ej = E[j], g = (x, y) => d(ei, x, y) - d(ej, x, y), out = [];
        for (let k = 0; k < F.length; k++) {
          const A = F[k], B = F[(k + 1) % F.length], ga = g(A[0], A[1]), gb = g(B[0], B[1]);
          if (ga <= 1e-9) out.push(A);
          if ((ga <= 1e-9) !== (gb <= 1e-9)) { const t = ga / (ga - gb); out.push([A[0] + t * (B[0] - A[0]), A[1] + t * (B[1] - A[1])]); }
        }
        F = out;
      }
      if (F.length < 3) continue;
      // snap to footprint corners (exact welds with the walls)
      for (const q of F) for (let k = 0; k < n; k++) if (Math.abs(q[0] - P[k * 2]) < 1e-7 && Math.abs(q[1] - P[k * 2 + 1]) < 1e-7) { q[0] = P[k * 2]; q[1] = P[k * 2 + 1]; }
      const L = F.map(q => [q[0], q[1], ze + Math.min(Math.max(0, d(E[i], q[0], q[1])), capH) * tanP]);
      for (let k = 1; k + 1 < L.length; k++) {
        const a = L[0], b = L[k], c = L[k + 1];
        if (Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) < 1e-12) continue;
        roofT.push([a, b, c]);
      }
    }
  } else if (roof === 'dist') {
    const flat = Array.from(P), tri = earcut(flat, null);
    let maxE = 0;
    for (let k = 0; k < tri.length; k += 3) for (let e = 0; e < 3; e++) { const a = tri[k + e] * 2, b = tri[k + (e + 1) % 3] * 2; maxE = Math.max(maxE, Math.hypot(P[b] - P[a], P[b + 1] - P[a + 1])); }
    const segs = []; for (let i = 0; i < n; i++) { const a = i * 2, b = ((i + 1) % n) * 2; segs.push([P[a], P[a + 1], P[b], P[b + 1]]); }
    const dist = (x, y) => { let m = Infinity; for (const s of segs) { const dx = s[2] - s[0], dy = s[3] - s[1], L2 = dx * dx + dy * dy || 1e-18; let t = ((x - s[0]) * dx + (y - s[1]) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t; const q = Math.hypot(s[0] + t * dx - x, s[1] + t * dy - y); if (q < m) m = q; } return m; };
    const K = Math.max(1, Math.min(8, Math.ceil(maxE / Math.max(capH * 0.6, 1e-6))));
    for (let k = 0; k < tri.length; k += 3) {
      let A = [P[tri[k] * 2], P[tri[k] * 2 + 1]], B = [P[tri[k + 1] * 2], P[tri[k + 1] * 2 + 1]], C = [P[tri[k + 2] * 2], P[tri[k + 2] * 2 + 1]];
      if ((B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]) < 0) { const t = B; B = C; C = t; }
      const pt = (i, j) => { const x = A[0] + (B[0] - A[0]) * i / K + (C[0] - A[0]) * j / K, y = A[1] + (B[1] - A[1]) * i / K + (C[1] - A[1]) * j / K; return [x, y, ze + Math.min(dist(x, y), capH) * tanP]; };
      for (let j = 0; j < K; j++) for (let i = 0; i + j < K; i++) {
        roofT.push([pt(i, j), pt(i + 1, j), pt(i, j + 1)]);
        if (i + j + 1 < K) roofT.push([pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)]);
      }
    }
    // pin boundary points to the eave (distance there is 0 up to rounding)
    for (const t of roofT) for (const q of t) { for (let i = 0; i < n; i++) { const a = i * 2; if (Math.abs(q[0] - P[a]) < 1e-9 && Math.abs(q[1] - P[a + 1]) < 1e-9) { q[0] = P[a]; q[1] = P[a + 1]; q[2] = ze; } } }
  } else {
    const flat = Array.from(P), holes = []; for (const h of H) { holes.push(flat.length / 2); for (const v of h) flat.push(v); }
    const tri = earcut(flat, holes.length ? holes : null);
    for (let k = 0; k < tri.length; k += 3) {
      const q = e => [flat[tri[k + e] * 2], flat[tri[k + e] * 2 + 1], ze];
      let a = q(0), b = q(1), c = q(2);
      if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) < 0) { const t = b; b = c; c = t; }
      roofT.push([a, b, c]);
    }
  }
  // roof triangles
  const fv = z => (z - zg) / hs;
  const roofPts = [];
  for (const t of roofT) {
    const ids = t.map(q => em.v(q[0], q[1], q[2], 0, -10, 1));
    em.t(ids[0], ids[1], ids[2], 1);
    for (const q of t) roofPts.push(q);
  }
  // walls: bottom edge + roof profile along the edge
  const ring = (R, closedHole) => {
    const m = R.length / 2; let u = 0;
    for (let i = 0; i < m; i++) {
      const a = i * 2, b = ((i + 1) % m) * 2, ax = R[a], ay = R[a + 1], bx = R[b], by = R[b + 1], ex = bx - ax, ey = by - ay, L = Math.hypot(ex, ey);
      if (L < 1e-9) continue;
      const prof = [[0, ax, ay, ze], [1, bx, by, ze]], seen = new Set();
      if (roof !== 'flat') {
        for (const q of roofPts) {
          const t = ((q[0] - ax) * ex + (q[1] - ay) * ey) / (L * L); if (t <= 1e-7 || t >= 1 - 1e-7) continue;
          if (Math.abs((q[0] - ax) * ey - (q[1] - ay) * ex) / L > 1e-6) continue;
          const key = q[0] + ',' + q[1]; if (seen.has(key)) continue; seen.add(key); prof.push([t, q[0], q[1], q[2]]);
        }
        // corners take the roof height found there (gable ends rise above the eave)
        for (const q of roofPts) { if (q[0] === ax && q[1] === ay) prof[0][3] = q[2]; if (q[0] === bx && q[1] === by) prof[1][3] = q[2]; }
        prof.sort((p, q) => p[0] - q[0]);
      }
      const uM = t => (u + t * L) * mPerMM;
      const A0 = em.v(ax, ay, zb, uM(0), fv(zb), 0), B0 = em.v(bx, by, zb, uM(1), fv(zb), 0);
      const top = prof.map(q => em.v(q[1], q[2], q[3], uM(q[0]), fv(q[3]), 0)), k = top.length - 1;
      em.t(A0, B0, top[k], 0);
      for (let j = k; j >= 1; j--) em.t(A0, top[j], top[j - 1], 0);
      u += L;
    }
  };
  ring(P); for (const h of H) ring(h);
  if (em.bottom) {
    const flat = Array.from(P), holes = []; for (const h of H) { holes.push(flat.length / 2); for (const v of h) flat.push(v); }
    const tri = earcut(flat, holes.length ? holes : null), ids = [];
    for (let i = 0; i < flat.length / 2; i++) ids.push(em.v(flat[i * 2], flat[i * 2 + 1], zb, 0, -10, 2));
    for (let k = 0; k < tri.length; k += 3) {
      let a = tri[k], b = tri[k + 1], c = tri[k + 2];
      const cr = (flat[b * 2] - flat[a * 2]) * (flat[c * 2 + 1] - flat[a * 2 + 1]) - (flat[b * 2 + 1] - flat[a * 2 + 1]) * (flat[c * 2] - flat[a * 2]);
      if (cr > 0) { const t = b; b = c; c = t; }
      em.t(ids[a], ids[b], ids[c], 2);
    }
  }
}

// emitter that welds identical points (for printable, closed meshes)
function lmWeldEmitter() {
  const map = new Map(), V = [], F = [];
  return {
    bottom: true,
    v(x, y, z) { const k = Math.round(x * 2e4) + ',' + Math.round(y * 2e4) + ',' + Math.round(z * 2e4); let i = map.get(k); if (i === undefined) { i = V.length / 3; V.push(x, y, z); map.set(k, i); } return i; },
    t(a, b, c) { if (a !== b && b !== c && a !== c) F.push(a, b, c); },
    body() { return { V: new Float32Array(V), F: new Uint32Array(F) }; },
    reset() { map.clear(); },
  };
}
// ===== END LANDSCAPE BUILDINGS =====
