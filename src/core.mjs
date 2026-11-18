// ===== CORE (pure functions, no DOM) =====
const KM_LAT = 111.2;
const kmLon = lat => 111.32 * Math.cos(lat * Math.PI / 180);

// Growable typed arrays
class U32 { constructor(n = 1 << 16) { this.a = new Uint32Array(n); this.n = 0; }
  push3(x, y, z) { if (this.n + 3 > this.a.length) { const b = new Uint32Array(this.a.length * 2); b.set(this.a); this.a = b; } this.a[this.n++] = x; this.a[this.n++] = y; this.a[this.n++] = z; }
  get arr() { return this.a.subarray(0, this.n); } }

function geom(p) {
  const scale = p.printW / p.areaKm;            // mm per km
  const areaKmY = p.printD / scale;
  return { scale, areaKmY };
}

// Build model grid (heights in mm, water mask) from a DEM sampler and a water rasterizer
function computeModel(p, dem, waterRaster, pitch) {
  const { scale, areaKmY } = geom(p);
  const nx = Math.round(p.printW / pitch) + 1, ny = Math.round(p.printD / pitch) + 1;
  const dx = p.printW / (nx - 1), dy = p.printD / (ny - 1);
  const xs = new Float32Array(nx), ys = new Float32Array(ny);
  for (let c = 0; c < nx; c++) xs[c] = c * dx;
  for (let r = 0; r < ny; r++) ys[r] = r * dy;
  const N = nx * ny, H = new Float32Array(N);
  const kl = kmLon(p.lat);
  for (let r = 0; r < ny; r++) {
    const lat = p.lat + (ys[r] / scale - areaKmY / 2) / KM_LAT;
    for (let c = 0; c < nx; c++) {
      const lon = p.lon + (xs[c] / scale - p.areaKm / 2) / kl;
      H[r * nx + c] = dem(lat, lon);
    }
  }
  // smoothing: repeated 3x3 box blur
  let A = H, B = new Float32Array(N);
  for (let it = 0; it < p.smooth; it++) {
    for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) {
      let s = 0, k = 0;
      for (let j = -1; j <= 1; j++) { const rr = r + j; if (rr < 0 || rr >= ny) continue;
        for (let i = -1; i <= 1; i++) { const cc = c + i; if (cc < 0 || cc >= nx) continue; s += A[rr * nx + cc]; k++; } }
      B[r * nx + c] = s / k;
    }
    const t = A; A = B; B = t === H ? new Float32Array(N) : t;
  }
  const Hs = A;
  let hmin = Infinity, hmax = -Infinity;
  for (let i = 0; i < N; i++) { if (Hs[i] < hmin) hmin = Hs[i]; if (Hs[i] > hmax) hmax = Hs[i]; }
  const VS = scale / 1000 * p.vex;              // mm per m
  const z0 = p.base + p.floor;
  const zof = e => z0 + (e - hmin) * VS;
  const W = waterRaster ? waterRaster(nx, ny, pitch) : new Uint8Array(N);
  const Zc = new Float32Array(N), TR = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const z = zof(Hs[i]);
    Zc[i] = z - (W[i] ? p.carve : 0);
    TR[i] = W[i] ? Math.max(p.carve - p.recess, 0.2) : 0;
  }
  // contour sheets aligned to layer grid
  const sheets = [];
  const interval = p.interval;
  let first = p.firstContour > 0 ? p.firstContour : Math.ceil((hmin + interval * 0.6) / interval) * interval;
  const thick = p.sheetLayers * p.layer;
  if (interval > 0 && p.sheetLayers > 0)
    for (let e = first; e <= hmax; e += interval) {
      const z = Math.round(zof(e) / p.layer) * p.layer;
      if (z <= p.base + 1e-6) continue;
      sheets.push([z, z + thick, e]);
    }
  let zmax = 0; for (let i = 0; i < N; i++) zmax = Math.max(zmax, Zc[i] + TR[i]);
  return { nx, ny, xs, ys, Zc, TR, W, hmin, hmax, sheets, zmax, scale, areaKmY };
}

// Closed shell between two heightfields L<=U; zero-thickness vertices merged
function hfBody(L, U, nx, ny, xs, ys) {
  const N = nx * ny, act = new Uint8Array(N); let any = false;
  for (let i = 0; i < N; i++) if (U[i] - L[i] > 1e-6) { act[i] = 1; any = true; }
  if (!any) return null;
  const bot = i => act[i] ? N + i : i;
  const T = new U32();
  for (let r = 0; r < ny - 1; r++) for (let c = 0; c < nx - 1; c++) {
    const a = r * nx + c, b = a + 1, cc = a + nx + 1, d = a + nx;
    if (act[a] | act[b] | act[cc]) { T.push3(a, b, cc); T.push3(bot(cc), bot(b), bot(a)); }
    if (act[a] | act[cc] | act[d]) { T.push3(a, cc, d); T.push3(bot(d), bot(cc), bot(a)); }
  }
  const per = [];
  for (let c = 0; c < nx; c++) per.push(c);
  for (let r = 1; r < ny; r++) per.push(r * nx + nx - 1);
  for (let c = nx - 2; c >= 0; c--) per.push((ny - 1) * nx + c);
  for (let r = ny - 2; r >= 1; r--) per.push(r * nx);
  for (let k = 0; k < per.length; k++) {
    const p1 = per[k], p2 = per[(k + 1) % per.length];
    if (!(act[p1] | act[p2])) continue;
    const b1 = bot(p1), b2 = bot(p2);
    if (b1 !== p1) T.push3(p2, p1, b1);
    if (b2 !== p2) T.push3(p2, b1, b2);
  }
  const vz = i => i < N ? U[i] : L[i - N];
  return compact(T.arr, i => { const j = i < N ? i : i - N; return [xs[j % nx], ys[(j / nx) | 0], vz(i)]; }, 2 * N);
}

function compact(F, pos, nv) {
  const map = new Int32Array(nv).fill(-1); let n = 0;
  const Fo = new Uint32Array(F.length);
  for (let k = 0; k < F.length; k++) { let m = map[F[k]]; if (m < 0) { m = map[F[k]] = n++; } Fo[k] = m; }
  const V = new Float32Array(n * 3);
  for (let i = 0; i < nv; i++) { const m = map[i]; if (m >= 0) { const q = pos(i); V[m * 3] = q[0]; V[m * 3 + 1] = q[1]; V[m * 3 + 2] = q[2]; } }
  return { V, F: Fo };
}

function boxBody(x0, x1, y0, y1, z0, z1) {
  const V = new Float32Array([x0,y0,z0, x1,y0,z0, x1,y1,z0, x0,y1,z0, x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1]);
  const F = new Uint32Array([0,2,1, 0,3,2, 4,5,6, 4,6,7, 0,1,5, 0,5,4, 1,2,6, 1,6,5, 2,3,7, 2,7,6, 3,0,4, 3,4,7]);
  return { V, F };
}

// Ink mask M (Uint8Array ww*hh, row 0 = south) -> extruded pixel solid
function pixelBody(M, ww, hh, px, x0, y0, z0, z1) {
  const GW = ww + 1, No = GW * (hh + 1);
  const ink = (r, c) => r >= 0 && r < hh && c >= 0 && c < ww && M[r * ww + c];
  const T = new U32();
  for (let r = 0; r < hh; r++) for (let c = 0; c < ww; c++) {
    if (!M[r * ww + c]) continue;
    const a = r * GW + c, b = a + 1, cc = a + GW + 1, d = a + GW;
    T.push3(a, b, cc); T.push3(a, cc, d); T.push3(a + No, cc + No, b + No); T.push3(a + No, d + No, cc + No);
    const edges = [[!ink(r - 1, c), a, b], [!ink(r, c + 1), b, cc], [!ink(r + 1, c), cc, d], [!ink(r, c - 1), d, a]];
    for (const [e, p, q] of edges) if (e) { T.push3(p, p + No, q); T.push3(q, p + No, q + No); }
  }
  if (!T.n) return null;
  return compact(T.arr, i => { const top = i < No; const j = top ? i : i - No; return [x0 + (j % GW) * px, y0 + ((j / GW) | 0) * px, top ? z1 : z0]; }, 2 * No);
}

function mergeBodies(list) {
  list = list.filter(Boolean);
  let nv = 0, nf = 0; for (const b of list) { nv += b.V.length; nf += b.F.length; }
  const V = new Float32Array(nv), F = new Uint32Array(nf); let ov = 0, of = 0;
  for (const b of list) { V.set(b.V, ov); for (let k = 0; k < b.F.length; k++) F[of + k] = b.F[k] + ov / 3; ov += b.V.length; of += b.F.length; }
  return { V, F };
}

// Build the 4 printable bodies
function buildBodies(p, m, textMask) {
  const { nx, ny, xs, ys, Zc, TR, sheets } = m;
  const N = nx * ny;
  const levels = [p.base]; for (const s of sheets) levels.push(s[0], s[1]); levels.push(1e9);
  const gray = [], yellow = [];
  const L = new Float32Array(N), U = new Float32Array(N);
  for (let k = 0; k < levels.length - 1; k++) {
    const a = levels[k], b = levels[k + 1];
    for (let i = 0; i < N; i++) { L[i] = Math.min(a, Zc[i]); U[i] = Math.min(b, Zc[i]); }
    const body = hfBody(L, U, nx, ny, xs, ys);
    if (body) (k % 2 ? yellow : gray).push(body);
  }
  const Ut = new Float32Array(N); for (let i = 0; i < N; i++) Ut[i] = Zc[i] + TR[i];
  const water = hfBody(Zc, Ut, nx, ny, xs, ys);
  const base = boxBody(0, p.printW, -p.strip, p.printD, 0, p.base);
  const text = textMask ? pixelBody(textMask.M, textMask.w, textMask.h, textMask.px, 0, -p.strip, p.base, p.base + p.textH) : null;
  return { base, gray: mergeBodies(gray), accent: mergeBodies([...yellow, text]), water: water };
}

function checkBody(b) {
  const m = new Map(); const F = b.F;
  for (let k = 0; k < F.length; k += 3) for (let e = 0; e < 3; e++) {
    const u = F[k + e], v = F[k + (e + 1) % 3]; const key = u < v ? u * 4294967296 + v : v * 4294967296 + u;
    m.set(key, (m.get(key) || 0) + 1);
  }
  let open = 0, nm = 0; for (const c of m.values()) { if (c === 1) open++; else if (c > 2) nm++; }
  let vol = 0; const V = b.V;
  for (let k = 0; k < F.length; k += 3) {
    const a = F[k] * 3, bb = F[k + 1] * 3, c = F[k + 2] * 3;
    vol += (V[a] * (V[bb + 1] * V[c + 2] - V[bb + 2] * V[c + 1]) - V[a + 1] * (V[bb] * V[c + 2] - V[bb + 2] * V[c]) + V[a + 2] * (V[bb] * V[c + 1] - V[bb + 1] * V[c])) / 6;
  }
  return { tris: F.length / 3, open, nm, vol };
}

// ---- writers ----
const enc = new TextEncoder();
function chunked(parts, n, fn, step = 20000) {
  for (let i = 0; i < n; i += step) { let s = ''; const e = Math.min(n, i + step); for (let k = i; k < e; k++) s += fn(k); parts.push(enc.encode(s)); }
}
function concatU8(parts) { let n = 0; for (const p of parts) n += p.length; const o = new Uint8Array(n); let k = 0; for (const p of parts) { o.set(p, k); k += p.length; } return o; }
const uuid = () => 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function build3MF(parts, p, title) {   // parts: [{name, body, tool}]
  const NS = 'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p"';
  const obj = [enc.encode(`<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" ${NS}>\n<metadata name="BambuStudio:3mfVersion">1</metadata>\n<resources>\n`)];
  parts.forEach((pt, i) => {
    const { V, F } = pt.body;
    obj.push(enc.encode(`<object id="${i + 1}" p:UUID="${uuid()}" type="model"><mesh><vertices>\n`));
    chunked(obj, V.length / 3, k => `<vertex x="${V[k * 3].toFixed(3)}" y="${V[k * 3 + 1].toFixed(3)}" z="${V[k * 3 + 2].toFixed(3)}"/>`);
    obj.push(enc.encode('</vertices><triangles>\n'));
    chunked(obj, F.length / 3, k => `<triangle v1="${F[k * 3]}" v2="${F[k * 3 + 1]}" v3="${F[k * 3 + 2]}"/>`);
    obj.push(enc.encode('</triangles></mesh></object>\n'));
  });
  obj.push(enc.encode('</resources>\n<build/>\n</model>\n'));
  const gid = parts.length + 1, I = '1 0 0 0 1 0 0 0 1 0 0 0';
  const tx = (p.bed / 2 - p.printW / 2).toFixed(3), ty = (p.bed / 2 - (p.printD - p.strip) / 2).toFixed(3);
  let main = `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" ${NS}>\n<metadata name="Application">BambuStudio-01.10.02.76</metadata>\n<metadata name="BambuStudio:3mfVersion">1</metadata>\n<metadata name="Title">${esc(title)}</metadata>\n<resources>\n<object id="${gid}" p:UUID="${uuid()}" type="model"><components>\n`;
  parts.forEach((pt, i) => { main += `<component p:path="/3D/Objects/object_1.model" objectid="${i + 1}" p:UUID="${uuid()}" transform="${I}"/>\n`; });
  main += `</components></object>\n</resources>\n<build p:UUID="${uuid()}"><item objectid="${gid}" p:UUID="${uuid()}" transform="1 0 0 0 1 0 0 0 1 ${tx} ${ty} 0" printable="1"/></build>\n</model>\n`;
  let cfg = `<?xml version="1.0" encoding="UTF-8"?>\n<config>\n  <object id="${gid}">\n    <metadata key="name" value="${esc(title)}"/>\n    <metadata key="extruder" value="${parts[1] ? parts[1].tool : 1}"/>\n`;
  parts.forEach((pt, i) => { cfg += `    <part id="${i + 1}" subtype="normal_part">\n      <metadata key="name" value="${esc(pt.name)}"/>\n      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n      <metadata key="extruder" value="${pt.tool}"/>\n    </part>\n`; });
  cfg += `  </object>\n  <plate>\n    <metadata key="plater_id" value="1"/>\n    <metadata key="plater_name" value=""/>\n    <metadata key="locked" value="false"/>\n    <model_instance>\n      <metadata key="object_id" value="${gid}"/>\n      <metadata key="instance_id" value="0"/>\n      <metadata key="identify_id" value="1"/>\n    </model_instance>\n  </plate>\n  <assemble>\n   <assemble_item object_id="${gid}" instance_id="0" transform="1 0 0 0 1 0 0 0 1 ${tx} ${ty} 0" offset="0 0 0" />\n  </assemble>\n</config>\n`;
  return {
    '[Content_Types].xml': enc.encode('<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="png" ContentType="image/png"/></Types>'),
    '_rels/.rels': enc.encode('<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'),
    '3D/_rels/3dmodel.model.rels': enc.encode('<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/Objects/object_1.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'),
    '3D/3dmodel.model': enc.encode(main),
    '3D/Objects/object_1.model': concatU8(obj),
    'Metadata/model_settings.config': enc.encode(cfg),
  };
}

function buildSTL(body, name) {
  const { V, F } = body, n = F.length / 3;
  const buf = new ArrayBuffer(84 + 50 * n), dv = new DataView(buf);
  const hdr = enc.encode(('relief ' + name).slice(0, 79)); new Uint8Array(buf, 0, hdr.length).set(hdr);
  dv.setUint32(80, n, true);
  let o = 84;
  for (let k = 0; k < n; k++) {
    const a = F[k * 3] * 3, b = F[k * 3 + 1] * 3, c = F[k * 3 + 2] * 3;
    const ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2];
    const wx = V[c] - V[a], wy = V[c + 1] - V[a + 1], wz = V[c + 2] - V[a + 2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const l = Math.hypot(nx, ny, nz) || 1;
    dv.setFloat32(o, nx / l, true); dv.setFloat32(o + 4, ny / l, true); dv.setFloat32(o + 8, nz / l, true); o += 12;
    for (const q of [a, b, c]) { dv.setFloat32(o, V[q], true); dv.setFloat32(o + 4, V[q + 1], true); dv.setFloat32(o + 8, V[q + 2], true); o += 12; }
    o += 2;
  }
  return new Uint8Array(buf);
}
// ===== END CORE =====
export { computeModel, buildBodies, checkBody, build3MF, buildSTL, hfBody, kmLon, KM_LAT, geom };
