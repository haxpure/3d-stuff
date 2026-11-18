// ===== Minimal Mapbox Vector Tile decoder + OpenMapTiles -> features =====
function mvtDecode(u8, want) {
  let pos = 0; const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const varint = () => { let r = 0, s = 1, b; do { b = u8[pos++]; r += (b & 0x7f) * s; s *= 128; } while (b & 0x80); return r; };
  const skip = wt => { if (wt === 0) varint(); else if (wt === 1) pos += 8; else if (wt === 2) pos += varint(); else if (wt === 5) pos += 4; else throw new Error('bad wire type ' + wt); };
  const str = (a, b) => new TextDecoder().decode(u8.subarray(a, b));
  const zz = n => (n % 2 === 1) ? -(n + 1) / 2 : n / 2;
  const layers = {};
  while (pos < u8.length) {
    const key = varint(), f = key >>> 3, wt = key & 7;
    if (f !== 3 || wt !== 2) { skip(wt); continue; }
    const len = varint(), end = pos + len;
    // layer
    let name = '', extent = 4096; const feats = [], keys = [], vals = [];
    const featRanges = [];
    while (pos < end) {
      const k = varint(), lf = k >>> 3, lwt = k & 7;
      if (lf === 1 && lwt === 2) { const l = varint(); name = str(pos, pos + l); pos += l; }
      else if (lf === 2 && lwt === 2) { const l = varint(); featRanges.push([pos, pos + l]); pos += l; }
      else if (lf === 3 && lwt === 2) { const l = varint(); keys.push(str(pos, pos + l)); pos += l; }
      else if (lf === 4 && lwt === 2) {
        const l = varint(), ve = pos + l; let v = null;
        while (pos < ve) { const vk = varint(), vf = vk >>> 3, vwt = vk & 7;
          if (vf === 1) { const sl = varint(); v = str(pos, pos + sl); pos += sl; }
          else if (vf === 2) { v = dv.getFloat32(pos, true); pos += 4; }
          else if (vf === 3) { v = dv.getFloat64(pos, true); pos += 8; }
          else if (vf === 4 || vf === 5) v = varint();
          else if (vf === 6) v = zz(varint());
          else if (vf === 7) v = !!varint();
          else skip(vwt); }
        vals.push(v);
      }
      else if (lf === 5 && lwt === 0) extent = varint();
      else skip(lwt);
    }
    pos = end;
    if (want && !want.includes(name)) continue;
    const saved = pos;
    for (const [a, b] of featRanges) {
      pos = a; let id = 0, type = 0; const tags = [], geom = [];
      while (pos < b) {
        const k = varint(), ff = k >>> 3, fwt = k & 7;
        if (ff === 1 && fwt === 0) id = varint();
        else if (ff === 2 && fwt === 2) { const l = varint(), e = pos + l; while (pos < e) tags.push(varint()); }
        else if (ff === 3 && fwt === 0) type = varint();
        else if (ff === 4 && fwt === 2) { const l = varint(), e = pos + l; while (pos < e) geom.push(varint()); }
        else skip(fwt);
      }
      const props = {}; for (let i = 0; i + 1 < tags.length; i += 2) props[keys[tags[i]]] = vals[tags[i + 1]];
      // geometry
      const parts = []; let x = 0, y = 0, cur = null;
      for (let i = 0; i < geom.length;) {
        const c = geom[i++], cmd = c & 7, cnt = c >>> 3;
        if (cmd === 1 || cmd === 2) for (let j = 0; j < cnt; j++) {
          x += zz(geom[i++]); y += zz(geom[i++]);
          if (cmd === 1) { cur = [[x, y]]; parts.push(cur); } else cur.push([x, y]);
        } else if (cmd === 7 && cur) cur.push([cur[0][0], cur[0][1]]);
      }
      feats.push({ id, type, props, parts });
    }
    pos = saved;
    layers[name] = { extent, features: feats };
  }
  return layers;
}

const ROAD_CLASS_W = { motorway: 14, trunk: 12, primary: 10, secondary: 8, tertiary: 7, minor: 5.5, service: 3.5, track: 3, path: 2, busway: 6, raceway: 6 };
// clip a closed ring (tile coords) to [0,E]^2; edges lying on the tile border get .cut = true
function clipRingToTile(ring, E) {
  let pts = ring.slice(); if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
  const planes = [[0, 0, 1], [0, E, -1], [1, 0, 1], [1, E, -1]];   // axis, value, sign (inside if sign*(v-value) >= 0)
  for (const [ax, val, sg] of planes) {
    if (!pts.length) break; const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], ia = sg * (a[ax] - val) >= 0, ib = sg * (b[ax] - val) >= 0;
      if (ia) out.push(a);
      if (ia !== ib) { const t = (val - a[ax]) / (b[ax] - a[ax]); const q = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]; q[ax] = val; out.push(q); }
    }
    pts = out;
  }
  if (pts.length < 3) return null;
  const on = (q, ax) => q[ax] === 0 || q[ax] === E;
  return pts.map((q, i) => { const n = pts[(i + 1) % pts.length]; return { q, cut: (q[0] === n[0] && on(q, 0)) || (q[1] === n[1] && on(q, 1)) }; });
}
// tiles: [{z,x,y,layers}] -> same structure as parseOSM()
function omtToFeatures(tiles) {
  const out = emptyFeatures(), byId = new Map();
  for (const t of tiles) {
    const n = 2 ** t.z;
    const ll = (px, py, ext) => ({ lon: (t.x + px / ext) / n * 360 - 180, lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * (t.y + py / ext) / n))) * 180 / Math.PI });
    const conv = (L, ext) => L.map(([px, py]) => ll(px, py, ext));
    const lay = name => t.layers[name] || { features: [], extent: 4096 };
    { const L = lay('building');
      for (const f of L.features) { if (f.type !== 3 || f.props.hide_3d) continue;
        const rings = f.parts.map(r => clipRingToTile(r, L.extent)).filter(Boolean).map(r => r.map(({ q, cut }) => { const o = ll(q[0], q[1], L.extent); o.cut = cut; return o; }));
        if (!rings.length) continue;
        const h = +f.props.render_height, mh = +f.props.render_min_height || 0;
        if (mh > 0 && h - mh < 3) continue;
        const tags = { building: 'yes', height: h > 0 ? String(h) : undefined };
        // re-join a building cut at a tile edge: same id, different tile, both pieces touch the cut
        const tk = t.z + '/' + t.x + '/' + t.y, cutHere = rings.some(r => r.some(q => q.cut));
        const prev = f.id && cutHere ? byId.get(f.id) : null;
        if (prev && prev.tk !== tk && prev.cut) { const b = out.buildings[prev.idx]; b.parts.push(rings); b.rings = b.rings.concat(rings); if (h > +b.tags.height || !b.tags.height) b.tags.height = tags.height; continue; }
        if (f.id && cutHere) byId.set(f.id, { idx: out.buildings.length, tk, cut: true });
        out.buildings.push({ id: f.id, rings, parts: [rings], tags });
      } }
    { const L = lay('transportation');
      for (const f of L.features) { if (f.type !== 2) continue; const p = f.props;
        if (p.brunnel === 'tunnel' || p.class === 'ferry' || /^(aerialway|construction)$/.test(p.class)) continue;
        if (p.class === 'rail' || p.class === 'transit') { if (/^(rail|light_rail|tram|narrow_gauge)$/.test(p.subclass || 'rail')) for (const ln of f.parts) out.rails.push({ pts: conv(ln, L.extent), kind: p.subclass || 'rail' }); continue; }
        const kind = p.class === 'path' ? 'footway' : p.class === 'track' ? 'track' : 'omt_' + p.class;
        const width = ROAD_CLASS_W[p.class]; if (!width) continue;
        for (const ln of f.parts) out.roads.push({ pts: conv(ln, L.extent), kind, width });
      } }
    { const L = lay('water');
      for (const f of L.features) { if (f.type !== 3 || f.props.class === 'swimming_pool' || f.props.brunnel === 'tunnel') continue; out.wpolys.push(f.parts.map(r => conv(r, L.extent))); } }
    { const L = lay('waterway');
      for (const f of L.features) { if (f.type !== 2 || f.props.brunnel === 'tunnel') continue; const k = f.props.class;
        if (!/^(river|canal|stream)$/.test(k)) continue; for (const ln of f.parts) out.wlines.push({ pts: conv(ln, L.extent), kind: k }); } }
    { const L = lay('landcover');
      for (const f of L.features) { if (f.type !== 3) continue; const c = f.props.class, sc = f.props.subclass;
        if (c === 'wood') out.woods.push(f.parts.map(r => conv(r, L.extent)));
        else if (c === 'farmland' && (!sc || sc === 'farmland')) out.fields.push(f.parts.map(r => conv(r, L.extent)));
        else if (c === 'grass' && (sc === 'park' || sc === 'garden')) out.parks.push(f.parts.map(r => conv(r, L.extent))); } }
    { const L = lay('housenumber');
      for (const f of L.features) if (f.type === 1 && f.props.housenumber) for (const pt of f.parts) { const q = ll(pt[0][0], pt[0][1], L.extent); q.num = String(f.props.housenumber); out.hnums.push(q); } }
    { const L = lay('park');
      for (const f of L.features) if (f.type === 3 && f.props.class === 'park') out.parks.push(f.parts.map(r => conv(r, L.extent))); }
  }
  return out;
}
// ===== END MVT =====
