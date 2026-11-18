"""Assemble the single-file tools from src/. Run from the repo root: python3 src/build.py"""
import os
S = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(S)
rd = lambda f: open(os.path.join(S, f), encoding='utf-8').read()
core = rd('core.mjs'); core = core[:core.index('export {')]
# Relief Maker (V2) is maintained as one self-contained file
I18N = '<script>\n' + rd('fullspectrum.js') + rd('i18n.js') + '</script>'
open(os.path.join(R, 'relief-maker.html'), 'w', encoding='utf-8').write(rd('relief_maker.html').replace('<!--I18N-->', I18N))
# Town Maker reuses a few blocks (coords, geocoder, DEM loader, label) from the V1 relief page
app = rd('town_shared.html')
cut = lambda a, b: app[app.index(a):app.index(b)]
t = rd('town_app.html')
for k, v in [('/*CORE*/', core), ('/*EARCUT*/', rd('earcut_inline.js')), ('/*TOWNCORE*/', rd('town_core.mjs')), ('/*MVT*/', rd('mvt.mjs')),
             ('/*PARSE*/', cut('function parseCoords', 'function params()')), ('/*GEOCODE*/', cut('async function geocode', 'function applyPlace')),
             ('/*DEM*/', cut('const tileCache', 'const waterCache').replace('let z = 14;', 'let z = 15;')), ('/*LABEL*/', cut('async function textCanvas', '// ---------- 3D preview'))]:
    assert k in t, k; t = t.replace(k, v)
open(os.path.join(R, 'town-maker.html'), 'w', encoding='utf-8').write(t.replace('<!--I18N-->', I18N))
# Fin Studio is maintained as one self-contained file
open(os.path.join(R, 'fin-studio.html'), 'w', encoding='utf-8').write(rd('fin_studio.html'))
print('built relief-maker.html, town-maker.html, fin-studio.html')
