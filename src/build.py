"""Assemble the single-file tools from src/. Run from the repo root: python3 src/build.py"""
import os
S = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(S)
rd = lambda f: open(os.path.join(S, f), encoding='utf-8').read()
core = rd('core.mjs'); core = core[:core.index('export {')]
app = rd('app.html')
open(os.path.join(R, 'relief-maker.html'), 'w', encoding='utf-8').write(app.replace('/*CORE*/', core))
cut = lambda a, b: app[app.index(a):app.index(b)]
t = rd('town_app.html')
for k, v in [('/*CORE*/', core), ('/*EARCUT*/', rd('earcut_inline.js')), ('/*TOWNCORE*/', rd('town_core.mjs')), ('/*MVT*/', rd('mvt.mjs')),
             ('/*PARSE*/', cut('function parseCoords', 'function params()')), ('/*GEOCODE*/', cut('async function geocode', 'function applyPlace')),
             ('/*DEM*/', cut('const tileCache', 'const waterCache').replace('let z = 14;', 'let z = 15;')), ('/*LABEL*/', cut('async function textCanvas', '// ---------- 3D preview'))]:
    assert k in t, k; t = t.replace(k, v)
open(os.path.join(R, 'town-maker.html'), 'w', encoding='utf-8').write(t)
print('built relief-maker.html, town-maker.html')
