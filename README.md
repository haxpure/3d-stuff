# 3d-stuff

Browser tools for multi-color 3D printing. Each tool is a single HTML file that runs entirely in the browser and exports a multi-part 3MF (Orca / Snapmaker Orca / Bambu Studio format, filaments pre-assigned) or a zip of STLs.

| Tool | What it makes |
|---|---|
| [Relief Maker](relief-maker.html) | Terrain relief of any location: contour lines on whole print layers, rivers and lakes inlaid, label strip |
| [Town Maker](town-maker.html) | 3D town model: buildings with hip roofs, roads, railways, trees, plowed fields, water; buildings at your address highlighted |

Live site (GitHub Pages): open `index.html` from the Pages URL of this repo.

## Data sources
- Elevation: AWS Terrain Tiles (Mapzen terrarium)
- Buildings, roads, water, landcover: OpenFreeMap vector tiles (OpenStreetMap data), Overpass API as fallback
- Address search: Photon (komoot), Nominatim as fallback
- Map: Esri World Topo tiles

Map data © OpenStreetMap contributors.

## Editing
The HTML files in the root are generated. Edit the files in `src/` and rebuild:

```
python3 src/build.py
```

- `src/core.mjs` – mesh helpers, 3MF/STL writers (shared)
- `src/app.html` – Relief Maker page
- `src/town_app.html`, `src/town_core.mjs`, `src/mvt.mjs` – Town Maker page, model builder, vector-tile decoder
- `src/earcut_inline.js` – [earcut](https://github.com/mapbox/earcut) polygon triangulation (ISC license, notice included in the file)

## Printing notes
- Relief Maker: slice with the layer height set in the tool (default 0.2 mm) so contour lines land on whole layers.
- Overlapping parts are resolved by part order in the slicer; buildings come first in the file on purpose.
