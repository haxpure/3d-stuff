// ===== TOWN CORE (pure) =====
const ROAD_W = { motorway: 14, trunk: 12, primary: 10, secondary: 8, tertiary: 7, motorway_link: 7, trunk_link: 7, primary_link: 7, secondary_link: 6, tertiary_link: 6,
  unclassified: 5.5, residential: 5.5, living_street: 5, road: 5, service: 3.5, pedestrian: 4, track: 3, busway: 6,
  footway: 2, path: 2, cycleway: 2, steps: 2, bridleway: 2 };
const PATH_TYPES = new Set(['footway', 'path', 'cycleway', 'steps', 'bridleway', 'track']);
const BLD_DEFAULT = { garage: 3, garages: 3, carport: 3, shed: 3, hut: 3, roof: 4, kiosk: 3, greenhouse: 3, barn: 6, farm_auxiliary: 5, stable: 5,
  house: 6, detached: 6, semidetached_house: 6, terrace: 7, residential: 8, farm: 6, bungalow: 3.5,
  apartments: 13, dormitory: 13, hotel: 15, office: 15, school: 10, university: 14, hospital: 16, church: 18, chapel: 8, cathedral: 30,
  industrial: 9, warehouse: 9, retail: 7, commercial: 9, supermarket: 7, manufacture: 9, public: 10, civic: 10 };
const FLAT_TYPES = new Set(['apartments', 'industrial', 'warehouse', 'retail', 'commercial', 'supermarket', 'office', 'hospital', 'manufacture', 'parking', 'carport', 'roof', 'greenhouse']);

function parseLen(v) { if (v == null) return NaN; const m = String(v).replace(',', '.').match(/-?\d+(\.\d+)?/); if (!m) return NaN; let x = parseFloat(m[0]); if (/ft|'/.test(v)) x *= 0.3048; return x; }
function buildingHeight(t, def) {
  let h = parseLen(t.height);
  if (!(h > 0)) { const lv = parseLen(t['building:levels']); if (lv > 0) h = lv * 3 + (parseLen(t['roof:levels']) > 0 ? parseLen(t['roof:levels']) * 2 : 0.5); }
  if (!(h > 0)) h = BLD_DEFAULT[t.building] || def;
  return Math.min(Math.max(h, 2), 400);
}
const emptyFeatures = () => ({ buildings: [], roads: [], rails: [], wlines: [], wpolys: [], woods: [], parks: [], fields: [], hnums: [] });

// Overpass JSON -> features
function parseOSM(j) {
  const o = emptyFeatures();
  for (const el of j.elements || []) {
    const t = el.tags || {};
    if (el.type === 'node') { if (t['addr:housenumber']) o.hnums.push({ lat: el.lat, lon: el.lon, num: t['addr:housenumber'] }); continue; }
    const rings = el.type === 'way' ? (el.geometry ? [el.geometry] : []) : (el.members || []).filter(m => m.geometry).map(m => m.geometry);
    if (!rings.length) continue;
    if (t['addr:housenumber'] && t.building) { const g = rings[0]; let la = 0, lo = 0; for (const q of g) { la += q.lat; lo += q.lon; } o.hnums.push({ lat: la / g.length, lon: lo / g.length, num: t['addr:housenumber'] }); }
    const closed = el.type === 'relation' || (el.geometry && el.geometry.length > 3 && el.geometry[0].lat === el.geometry[el.geometry.length - 1].lat && el.geometry[0].lon === el.geometry[el.geometry.length - 1].lon);
    const tunnel = t.tunnel && t.tunnel !== 'no';
    if (t.building && t.building !== 'no' && !t['building:part']) { if (closed) o.buildings.push({ id: el.type[0] + el.id, rings, parts: [rings], tags: t }); }
    else if (t.highway && el.type === 'way') { if (tunnel || t.area === 'yes') continue; o.roads.push({ pts: el.geometry, kind: t.highway, width: parseLen(t.width) }); }
    else if (t.railway && el.type === 'way') { if (tunnel || !/^(rail|light_rail|tram|narrow_gauge)$/.test(t.railway)) continue; o.rails.push({ pts: el.geometry, kind: t.railway }); }
    else if (t.waterway && el.type === 'way' && t.waterway !== 'riverbank') { if (tunnel) continue; o.wlines.push({ pts: el.geometry, kind: t.waterway }); }
    else if (!closed) continue;
    else if (t.natural === 'water' || t.waterway === 'riverbank') o.wpolys.push(rings);
    else if (t.landuse === 'forest' || t.natural === 'wood') o.woods.push(rings);
    else if (t.leisure === 'park' || t.leisure === 'garden') o.parks.push(rings);
    else if (t.landuse === 'farmland') o.fields.push(rings);
  }
  return o;
}

function pointInRings(rings, lat, lon) {
  let inside = false;
  for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], c = ring[j];
    if ((a.lat > lat) !== (c.lat > lat) && lon < (c.lon - a.lon) * (lat - a.lat) / (c.lat - a.lat) + a.lon) inside = !inside;
  }
  return inside;
}
function findBuildingAt(osm, lat, lon, maxM = 35) {
  for (let i = 0; i < osm.buildings.length; i++) if (osm.buildings[i].parts.some(pr => pointInRings(pr, lat, lon))) return i;
  let best = -1, bd = Infinity; const kl = 111320 * Math.cos(lat * Math.PI / 180);
  osm.buildings.forEach((bl, i) => { for (const r of bl.rings) for (const pt of r) { const d = Math.hypot((pt.lat - lat) * 111200, (pt.lon - lon) * kl); if (d < bd) { bd = d; best = i; } } });
  return bd <= maxM ? best : -1;
}

// All buildings belonging to an address: the numbered house plus unnumbered outbuildings
// (garage, shed…) whose nearest house number is this one.
const normNum = s => String(s || '').toLowerCase().replace(/\s+/g, '');
const numMatch = (a, b) => { const n = normNum(b); return String(a || '').split(/[;,]/).some(x => normNum(x) === n); };
function addressBuildings(osm, addr, withOutbuildings = true) {
  const kl = 111320 * Math.cos(addr.lat * Math.PI / 180);
  const dist = (a, b) => Math.hypot((a.lat - b.lat) * 111200, (a.lon - b.lon) * kl);
  const cent = osm.buildings.map(b => { let la = 0, lo = 0, n = 0; for (const q of b.rings[0] || []) { la += q.lat; lo += q.lon; n++; } return n ? { lat: la / n, lon: lo / n } : addr; });
  // 1. anchor = matching house-number point nearest to the geocoded spot
  //    (a number only guessed from the typed text is searched farther: the geocoder may have found just the street)
  let anchor = null;
  if (addr.hn) { let bd = addr.hnGuess ? 600 : 250; for (const h of osm.hnums) if (numMatch(h.num, addr.hn)) { const d = dist(h, addr); if (d < bd) { bd = d; anchor = h; } } }
  const A = anchor || addr;
  // 2. main building(s): containing the anchor (several pieces possible), else nearest
  const set = new Set();
  osm.buildings.forEach((b, i) => { if (b.parts.some(pr => pointInRings(pr, A.lat, A.lon))) set.add(i); });
  if (!set.size) { const i = findBuildingAt(osm, A.lat, A.lon, anchor ? 40 : 25); if (i >= 0) set.add(i); }
  if (!set.size || !withOutbuildings || !anchor || !osm.hnums.length) return { set, anchor: !!anchor };
  // 3. outbuildings: no house number of their own, nearest number point is the anchor,
  //    and close to the main building (max. 20 m wall to wall)
  const main = [...set], near = (i, maxM) => { for (const r of osm.buildings[i].rings) for (const q of r) for (const k of main) for (const mr of osm.buildings[k].rings) for (const w of mr) if (dist(q, w) < maxM) return true; return false; };
  const numbered = new Set();
  osm.hnums.forEach(h => osm.buildings.forEach((b, i) => { if (dist(cent[i], h) < 60 && b.parts.some(pr => pointInRings(pr, h.lat, h.lon))) numbered.add(i); }));
  osm.buildings.forEach((b, i) => {
    if (set.has(i) || numbered.has(i) || dist(cent[i], A) > 60) return;
    let best = null, bd = Infinity; for (const h of osm.hnums) { const d = dist(cent[i], h); if (d < bd) { bd = d; best = h; } }
    if (best && dist(best, anchor) < 3 && near(i, 20)) set.add(i);
  });
  return { set, anchor: !!anchor };
}

// scanline fill of rings (even-odd) on the vertex grid; coordinates in grid units
function fillRings(ringsXY, nx, ny, cb) {
  let y0 = Infinity, y1 = -Infinity;
  for (const r of ringsXY) for (const q of r) { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
  const r0 = Math.max(0, Math.ceil(y0)), r1 = Math.min(ny - 1, Math.floor(y1)); let n = 0;
  for (let row = r0; row <= r1; row++) {
    const yy = row + 1e-7, xs = [];
    for (const r of ringsXY) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const ax = r[i][0], ay = r[i][1], bx = r[j][0], by = r[j][1];
      if ((ay > yy) !== (by > yy)) xs.push(ax + (yy - ay) * (bx - ax) / (by - ay));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.ceil(xs[k])), c1 = Math.min(nx - 1, Math.floor(xs[k + 1]));
      for (let c = c0; c <= c1; c++) { cb(row * nx + c); n++; }
    }
  }
  return n;
}
function strokeLine(ptsXY, hw, nx, ny, cb) {
  hw = Math.max(hw, 0.55);
  for (let i = 0; i + 1 < ptsXY.length; i++) {
    const [ax, ay] = ptsXY[i], [bx, by] = ptsXY[i + 1];
    const c0 = Math.max(0, Math.floor(Math.min(ax, bx) - hw)), c1 = Math.min(nx - 1, Math.ceil(Math.max(ax, bx) + hw));
    const r0 = Math.max(0, Math.floor(Math.min(ay, by) - hw)), r1 = Math.min(ny - 1, Math.ceil(Math.max(ay, by) + hw));
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      let t = ((c - ax) * dx + (r - ay) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = ax + t * dx - c, ey = ay + t * dy - r;
      if (ex * ex + ey * ey <= hw * hw) cb(r * nx + c);
    }
  }
}
// deterministic pseudo random
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const ringArea = r => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]); return a / 2; };   // >0 = CCW
function pointInRingXY(r, x, y) { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], c = r[j]; if ((a[1] > y) !== (c[1] > y) && x < (c[0] - a[0]) * (y - a[1]) / (c[1] - a[1]) + a[0]) ins = !ins; } return ins; }
// group rings into polygons [outer, ...holes]
function groupRings(rings) {
  const rs = rings.map(r => { const q = r.slice(); if (q.length > 1 && q[0][0] === q[q.length - 1][0] && q[0][1] === q[q.length - 1][1]) q.pop(); return q; })
    .filter(r => r.length >= 3 && Math.abs(ringArea(r)) > 1e-6).sort((a, b) => Math.abs(ringArea(b)) - Math.abs(ringArea(a)));
  const polys = [];
  for (const r of rs) { const host = polys.find(pg => pointInRingXY(pg[0], r[0][0], r[0][1])); if (host) host.push(r); else polys.push([r]); }
  for (const pg of polys) pg.forEach((r, i) => { const ccw = ringArea(r) > 0; if ((i === 0) !== ccw) { r.reverse(); const old = r.map(q => q.cut); for (let j = 0; j < r.length; j++) r[j].cut = old[(j + 1) % r.length]; } });
  return polys;   // outer CCW, holes CW (cut flags travel with points)
}
// Extruded solid with exact outline (vertical walls)
function prismBody(polys, z0, z1) {
  const V = [], F = [];
  for (const pg of polys) {
    const flat = [], holes = []; let base = V.length / 3;
    pg.forEach((r, ri) => { if (ri) holes.push(flat.length / 2); for (const q of r) flat.push(q[0], q[1]); });
    const n = flat.length / 2;
    for (let i = 0; i < n; i++) V.push(flat[i * 2], flat[i * 2 + 1], z0);
    for (let i = 0; i < n; i++) V.push(flat[i * 2], flat[i * 2 + 1], z1);
    const tri = earcut(flat, holes);
    for (let k = 0; k < tri.length; k += 3) {
      let a = tri[k], b = tri[k + 1], c = tri[k + 2];
      const ar = (flat[b * 2] - flat[a * 2]) * (flat[c * 2 + 1] - flat[a * 2 + 1]) - (flat[c * 2] - flat[a * 2]) * (flat[b * 2 + 1] - flat[a * 2 + 1]);
      if (ar < 0) { const t = b; b = c; c = t; }
      F.push(base + n + a, base + n + b, base + n + c, base + a, base + c, base + b);
    }
    let off = 0;
    for (const r of pg) { const m = r.length;
      for (let i = 0; i < m; i++) { const a = base + off + i, b = base + off + (i + 1) % m; F.push(a, b, b + n, a, b + n, a + n); }
      off += m; }
  }
  return F.length ? { V: new Float32Array(V), F: new Uint32Array(F) } : null;
}
// clip a ring of [x,y] (with .cut flags = outgoing edge artificial) to the rectangle [0,W]x[0,D]
function clipRingRect(ring, W, D) {
  let pts = ring.slice(); if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
  if (pts.every(q => q[0] >= 0 && q[0] <= W && q[1] >= 0 && q[1] <= D)) return pts;
  const orig = pts;
  for (const [ax, val, sg] of [[0, 0, 1], [0, W, -1], [1, 0, 1], [1, D, -1]]) {
    if (!pts.length) break; const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], ia = sg * (a[ax] - val) >= 0, ib = sg * (b[ax] - val) >= 0;
      if (ia) out.push(a);
      if (ia !== ib) { const t = (val - a[ax]) / (b[ax] - a[ax]); const q = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]; q[ax] = val; out.push(q); }
    }
    pts = out;
  }
  if (pts.length < 3) return null;
  const onB = (q, n) => (q[0] === n[0] && (q[0] === 0 || q[0] === W)) || (q[1] === n[1] && (q[1] === 0 || q[1] === D));
  return pts.map((q, i) => {
    const n = pts[(i + 1) % pts.length], o = [q[0], q[1]];
    if (onB(q, n)) { o.cut = true; return o; }
    const mx = (q[0] + n[0]) / 2, my = (q[1] + n[1]) / 2;
    for (let k = 0; k < orig.length; k++) { const a = orig[k], b = orig[(k + 1) % orig.length]; if (segDist(mx, my, a[0], a[1], b[0], b[1]) < 1e-4) { o.cut = !!a.cut; break; } }
    return o;
  });
}
function segDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-12; let t = ((px - ax) * dx + (py - ay) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t; return Math.hypot(ax + t * dx - px, ay + t * dy - py); }

function computeTown(p, dem, osm, highlight, pitch) {
  const scale = p.printW / p.areaKm, areaKmY = p.printD / scale;          // mm per km
  const nx = Math.round(p.printW / pitch) + 1, ny = Math.round(p.printD / pitch) + 1;
  const dx = p.printW / (nx - 1), dy = p.printD / (ny - 1);
  const xs = new Float32Array(nx), ys = new Float32Array(ny);
  for (let c = 0; c < nx; c++) xs[c] = c * dx; for (let r = 0; r < ny; r++) ys[r] = r * dy;
  const N = nx * ny, kl = 111.32 * Math.cos(p.lat * Math.PI / 180);
  const H = new Float32Array(N);
  for (let r = 0; r < ny; r++) { const lat = p.lat + (ys[r] / scale - areaKmY / 2) / 111.2;
    for (let c = 0; c < nx; c++) H[r * nx + c] = dem(lat, p.lon + (xs[c] / scale - p.areaKm / 2) / kl); }
  let A = H; for (let it = 0; it < p.smooth; it++) { const B = new Float32Array(N);
    for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) { let s = 0, k = 0;
      for (let j = -2; j <= 2; j++) { const rr = r + j; if (rr < 0 || rr >= ny) continue; for (let i = -2; i <= 2; i++) { const cc = c + i; if (cc < 0 || cc >= nx) continue; s += A[rr * nx + cc]; k++; } }
      B[r * nx + c] = s / k; } A = B; }
  let hmin = Infinity, hmax = -Infinity; for (let i = 0; i < N; i++) { hmin = Math.min(hmin, A[i]); hmax = Math.max(hmax, A[i]); }
  const mmPerM = scale / 1000;
  const Z = new Float32Array(N); for (let i = 0; i < N; i++) Z[i] = p.base + p.floor + (p.fields ? p.grooveDepth : 0) + (A[i] - hmin) * mmPerM * p.vex;
  const zAt = (x, y) => { const fx = Math.min(Math.max(x / dx, 0), nx - 1.001), fy = Math.min(Math.max(y / dy, 0), ny - 1.001); const c = fx | 0, r = fy | 0, ax = fx - c, ay = fy - r, i = r * nx + c;
    return (Z[i] * (1 - ax) + Z[i + 1] * ax) * (1 - ay) + (Z[i + nx] * (1 - ax) + Z[i + nx + 1] * ax) * ay; };

  // classes: 0 ground, 1 water, 2 road, 3 building, 4 rail
  const cls = new Uint8Array(N), bid = new Int32Array(N).fill(-1), land = new Uint8Array(N);   // land: 1 wood, 2 park, 3 field
  const fieldAng = new Float32Array(N);
  const toMM = pt => [((pt.lon - p.lon) * kl + p.areaKm / 2) * scale, ((pt.lat - p.lat) * 111.2 + areaKmY / 2) * scale];
  const toG = pt => { const q = toMM(pt); return [q[0] / dx, q[1] / dy]; };
  const blds = [];
  if (osm) {
    if (p.fields) osm.fields.forEach((rings, k) => { const ang = rng(k * 7919 + 13)() * Math.PI; fillRings(rings.map(r => r.map(toG)), nx, ny, i => { land[i] = 3; fieldAng[i] = ang; }); });
    if (p.parkTrees) for (const rings of osm.parks) fillRings(rings.map(r => r.map(toG)), nx, ny, i => land[i] = 2);
    if (p.forest) for (const rings of osm.woods) fillRings(rings.map(r => r.map(toG)), nx, ny, i => land[i] = 1);
    if (p.water) {
      for (const rings of osm.wpolys) fillRings(rings.map(r => r.map(toG)), nx, ny, i => cls[i] = 1);
      for (const w of osm.wlines) { if (w.kind === 'stream' && !p.streams) continue; if (!/^(river|canal|stream)$/.test(w.kind)) continue;
        const wmm = Math.max((w.kind === 'stream' ? 3 : w.kind === 'canal' ? 8 : 15) * mmPerM, p.minWater); strokeLine(w.pts.map(toG), wmm / 2 / dx, nx, ny, i => cls[i] = 1); }
    }
    if (p.roads) for (const rd of osm.roads) {
      const isPath = PATH_TYPES.has(rd.kind); if (isPath && !p.paths) continue;
      const wm = rd.width > 0 ? rd.width : ROAD_W[rd.kind]; if (!wm) continue;
      const wmm = Math.max(wm * mmPerM * p.roadScale, isPath ? p.minRoad * 0.7 : p.minRoad);
      strokeLine(rd.pts.map(toG), wmm / 2 / dx, nx, ny, i => cls[i] = 2);
    }
    if (p.rails) for (const rl of osm.rails) strokeLine(rl.pts.map(toG), Math.max(3 * mmPerM * p.roadScale, p.minRoad) / 2 / dx, nx, ny, i => cls[i] = 4);
    if (p.buildings) osm.buildings.forEach((bl, k) => {
      const parts = bl.parts.map(pr => pr.map(r => clipRingRect(r.map(pt => { const q = toMM(pt); q.cut = !!pt.cut; return q; }), p.printW, p.printD)).filter(Boolean)).filter(pr => pr.length);
      const polys = parts.flatMap(pr => groupRings(pr));
      if (!polys.length) return;
      let n = 0, zmin = Infinity, zmaxG = -Infinity, cx = 0, cy = 0, m = 0;
      for (const pg of polys) for (const q of pg[0]) { const z = zAt(q[0], q[1]); zmin = Math.min(zmin, z); zmaxG = Math.max(zmaxG, z); cx += q[0]; cy += q[1]; m++; }
      for (const pg of polys) n += fillRings(pg.map(r => r.map(q => [q[0] / dx, q[1] / dy])), nx, ny, i => { cls[i] = 3; bid[i] = k; zmin = Math.min(zmin, Z[i]); zmaxG = Math.max(zmaxG, Z[i]); });
      const edges = [];
      for (const pg of polys) for (const r of pg) for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; if (!a.cut) edges.push([a[0], a[1], b[0], b[1]]); }
      const hM = buildingHeight(bl.tags, p.defH);
      blds[k] = { polys, edges, zb: Math.max(p.base + 0.01, zmin - 0.6), eave: zmaxG + Math.max(hM * mmPerM * p.bex, p.minBld), type: bl.tags.building, n };
    });
  }
  // farmland grooves + inlays
  const S0 = new Float32Array(N), S1 = new Float32Array(N), S2 = new Float32Array(N), S3 = new Float32Array(N), S4 = new Float32Array(N);
  const per = p.grooveSpacing, gd = p.fields ? p.grooveDepth : 0;
  for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) {
    const i = r * nx + c, k = cls[i];
    let z = Z[i];
    if (land[i] === 3 && k === 0 && gd > 0) { const a = fieldAng[i], u = xs[c] * Math.cos(a) + ys[r] * Math.sin(a); z -= gd * (0.5 + 0.5 * Math.cos(2 * Math.PI * u / per)); }
    const inlay = k === 1 || k === 2 || k === 4;
    S0[i] = z - (inlay ? p.carve : 0);
    S1[i] = S0[i] + (k === 1 ? Math.max(p.carve - 0.2, 0.2) : 0);
    S2[i] = S1[i] + (k === 2 ? p.carve : 0);
    S3[i] = S2[i] + (k === 4 ? p.carve + 0.4 : 0);
    S4[i] = S3[i];
  }
  // trees: crowns scattered in forests / parks
  let nTrees = 0;
  if (osm && (p.forest || p.parkTrees)) {
    const R = rng(12345), crownR = p.crown * mmPerM / 2, th = p.treeH * mmPerM * p.treeScale;
    const sp = Math.max(crownR * 1.5, dx * 2);
    const canopy = new Float32Array(N);
    for (let y = sp / 2; y < p.printD; y += sp) for (let x = sp / 2; x < p.printW; x += sp) {
      const jx = x + (R() - 0.5) * sp * 0.8, jy = y + (R() - 0.5) * sp * 0.8;
      const c0 = Math.round(jx / dx), r0 = Math.round(jy / dy); if (c0 < 0 || c0 >= nx || r0 < 0 || r0 >= ny) continue;
      const i0 = r0 * nx + c0, lt = land[i0];
      if (cls[i0] !== 0 || !lt || lt === 3) continue;
      if (lt === 2 && R() > 0.28) continue;                                   // sparse park trees
      const rr = crownR * (0.75 + R() * 0.5), hh = th * (0.75 + R() * 0.45); nTrees++;
      const rc = Math.ceil(rr / dx) + 1;
      for (let j = -rc; j <= rc; j++) for (let i = -rc; i <= rc; i++) {
        const c = c0 + i, r = r0 + j; if (c < 0 || c >= nx || r < 0 || r >= ny) continue;
        const ii = r * nx + c; if (cls[ii] !== 0) continue;
        const d = Math.hypot(xs[c] - jx, ys[r] - jy); if (d >= rr) continue;
        const h = hh * Math.sqrt(1 - (d / rr) ** 2); if (h > canopy[ii]) canopy[ii] = h;
      }
    }
    for (let i = 0; i < N; i++) S4[i] = S3[i] + canopy[i];
  }
  // roofs (hip roofs from distance to outline)
  const tanP = Math.tan(p.roofPitch * Math.PI / 180);
  const RB = new Float32Array(N), RT = new Float32Array(N), RH = new Float32Array(N), RBh = new Float32Array(N), RTh = new Float32Array(N);
  let zmax = 0; for (let i = 0; i < N; i++) zmax = Math.max(zmax, S4[i]);
  const dist = new Float32Array(N), maxD = new Float32Array(blds.length);
  if (tanP > 0) for (let i = 0; i < N; i++) { const k = bid[i]; if (k < 0 || !blds[k]) continue;
    const x = xs[i % nx], y = ys[(i / nx) | 0]; let d = Infinity;
    for (const e of blds[k].edges) { const q = segDist(x, y, e[0], e[1], e[2], e[3]); if (q < d) d = q; }
    if (!blds[k].polys.some(pg => pointInRingXY(pg[0], x, y) && !pg.slice(1).some(h => pointInRingXY(h, x, y)))) d = 0;
    dist[i] = d; if (d > maxD[k]) maxD[k] = d; }
  const pitched = blds.map((b, k) => b && tanP > 0 && !FLAT_TYPES.has(b.type) && maxD[k] / mmPerM <= p.roofMaxW / 2);
  // owner for every vertex next to a building (roof bottom plane)
  for (let i = 0; i < N; i++) { RB[i] = RT[i] = RBh[i] = RTh[i] = 0; }
  const owner = new Int32Array(N).fill(-1);
  for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) { const i = r * nx + c; if (bid[i] >= 0) { owner[i] = bid[i]; continue; }
    for (let j = -1; j <= 1 && owner[i] < 0; j++) for (let q = -1; q <= 1; q++) { const cc = c + q, rr = r + j; if (cc >= 0 && cc < nx && rr >= 0 && rr < ny && bid[rr * nx + cc] >= 0) { owner[i] = bid[rr * nx + cc]; break; } } }
  for (let i = 0; i < N; i++) { const k = owner[i]; if (k < 0 || !blds[k]) continue;
    const e = blds[k].eave, t = bid[i] === k && pitched[k] ? dist[i] * tanP : 0;
    if (highlight.has(k)) { RBh[i] = e; RTh[i] = e + t; } else { RB[i] = e; RT[i] = e + t; }
  }
  blds.forEach((b, k) => { if (b) zmax = Math.max(zmax, b.eave + (pitched[k] ? maxD[k] * tanP : 0)); });
  return { nx, ny, xs, ys, dx, dy, cls, bid, land, S: [S0, S1, S2, S3, S4], RB, RT, RBh, RTh, blds, pitched, hmin, hmax, zmax, scale, nTrees, hiSet: highlight };
}

function buildTownBodies(p, m, textMask) {
  const { nx, ny, xs, ys, S, blds } = m;
  const N = nx * ny, B0 = new Float32Array(N).fill(p.base);
  const prisms = (hi) => { const list = []; blds.forEach((b, k) => { if (b && (m.hiSet ? m.hiSet.has(k) : false) === hi) { const pr = prismBody(b.polys, b.zb, b.eave); if (pr) { pr.k = k; list.push(pr); } } }); return list; };
  const hiPr = prisms(true), bPr = prisms(false);
  const tri2b = []; for (const pr of [...bPr, ...hiPr]) tri2b.push([pr.k, pr.F.length / 3]);
  return {
    house: mergeBodies([...hiPr, hfBody(m.RBh, m.RTh, nx, ny, xs, ys)]),
    buildings: mergeBodies([...bPr, hfBody(m.RB, m.RT, nx, ny, xs, ys)]),
    trees: hfBody(S[3], S[4], nx, ny, xs, ys),
    rail: hfBody(S[2], S[3], nx, ny, xs, ys),
    roads: hfBody(S[1], S[2], nx, ny, xs, ys),
    water: hfBody(S[0], S[1], nx, ny, xs, ys),
    ground: hfBody(B0, S[0], nx, ny, xs, ys),
    base: boxBody(0, p.printW, -p.strip, p.printD, 0, p.base),
    text: textMask ? pixelBody(textMask.M, textMask.w, textMask.h, textMask.px, 0, -p.strip, p.base, p.base + p.textH) : null,
    bPr, hiPr,
  };
}
// ===== END TOWN CORE =====
