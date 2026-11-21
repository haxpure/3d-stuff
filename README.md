# 3d-stuff

Browser tools for multi-color 3D printing. Each tool is a single HTML file that runs entirely in the browser and exports a multi-part 3MF (Orca / Snapmaker Orca / Bambu Studio format, filaments pre-assigned) or a zip of STLs.

| Tool | What it makes |
|---|---|
| [Relief Maker](relief-maker.html) | Terrain relief of any location: custom 4-color modes (contours / elevation bands) or realistic satellite colors, trails (GPX/KML/GeoJSON, drawn, OSM routes), POI markers, detailed water, label strip |
| [Landscape Maker](landscape-maker.html) | Relief Maker terrain plus every building in 3D (real footprints, heights and pitched roofs, roof colors from the satellite image). Realistic preview with satellite photo and shadows; buildings print as exact walls & roofs at large scale or as blocks on the mesh grid for whole regions (default 10 km radius) |
| [Fin Studio](fin-studio.html) | Orient & support: loads STL/OBJ/3MF/PLY, suggests the best orientation, builds breakaway support fins, exports 3MF (model + supports as two parts) or STL |
| [Town Maker](town-maker.html) | 3D town model: buildings with hip roofs, roads, railways, trees, plowed fields, water; buildings at your address highlighted |

Live site (GitHub Pages): open `index.html` from the Pages URL of this repo.

## Data sources
- Elevation: AWS Terrain Tiles (Mapzen terrarium)
- Buildings, roads, water, landcover: OpenFreeMap vector tiles (OpenStreetMap data), Overpass API as fallback / for water in Relief & Landscape Maker
- Satellite imagery: Esri World Imagery, Sentinel-2 cloudless (EOX)
- Address search: Photon (komoot), Nominatim as fallback
- Map: Esri World Topo tiles

Map data © OpenStreetMap contributors.

## Editing
The HTML files in the root are generated. Edit the files in `src/` and rebuild:

```
python3 src/build.py
```

- `src/core.mjs` – mesh helpers, 3MF/STL writers (shared)
- `src/relief_maker.html` – Relief Maker V2 (self-contained: color modes, trails, POIs, detailed water)
- `src/town_shared.html` – V1 relief page; Town Maker borrows its geocoder, DEM loader and label code
- `src/town_app.html`, `src/town_core.mjs`, `src/mvt.mjs` – Town Maker page, model builder, vector-tile decoder
- `src/landscape_maker.html`, `src/landscape_bld.mjs` – Landscape Maker page (based on Relief Maker V2) and the building geometry (footprints from vector tiles, gable / hip roofs, printable solids)
- `src/fin_studio.html` – Fin Studio (self-contained, bundles three.js under the MIT licence)
- `src/earcut_inline.js` – [earcut](https://github.com/mapbox/earcut) polygon triangulation (ISC license, notice included in the file)

## Printing notes
- Relief Maker: slice with the layer height set in the tool (default 0.2 mm) so contour lines land on whole layers.
- Overlapping parts are resolved by part order in the slicer; buildings come first in the file on purpose.
