# 3d-stuff

Browser tools for multi-color 3D printing. Each tool is a single HTML file that runs entirely in the browser and exports a multi-part 3MF (Orca / Snapmaker Orca / Bambu Studio format, filaments pre-assigned) or a zip of STLs.

| Tool | What it makes |
|---|---|
| [Relief Maker](relief-maker.html) | Terrain relief of any location: custom 4-color modes (contours / elevation bands) or realistic satellite colors, trails (GPX/KML/GeoJSON, drawn, OSM routes), POI markers, detailed water, label strip |
| [Fin Studio](fin-studio.html) | Orient & support: loads STL/OBJ/3MF/PLY, suggests the best orientation, builds breakaway support fins, exports 3MF (model + supports as two parts) or STL |
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
- `src/relief_maker.html` – Relief Maker V2 (self-contained: color modes, trails, POIs, detailed water)
- `src/town_shared.html` – V1 relief page; Town Maker borrows its geocoder, DEM loader and label code
- `src/town_app.html`, `src/town_core.mjs`, `src/mvt.mjs` – Town Maker page, model builder, vector-tile decoder
- `src/fin_studio.html` – Fin Studio (self-contained, bundles three.js under the MIT licence)
- `src/earcut_inline.js` – [earcut](https://github.com/mapbox/earcut) polygon triangulation (ISC license, notice included in the file)

## Printing notes
- Relief Maker: slice with the layer height set in the tool (default 0.2 mm) so contour lines land on whole layers.
- Overlapping parts are resolved by part order in the slicer; buildings come first in the file on purpose.

## Login (Supabase)

`login.html` (log in / register / forgot password) and the start page `index.html` (tool picker) use Supabase Auth.
Every tool page loads `auth-config.js` + `auth-guard.js` and sends visitors without a session to the login page.

Setup: put the Supabase **Project URL** and the **anon / publishable key** into `auth-config.js`.
While both are empty the login is off and all tools open without an account.
In Supabase → Authentication → URL Configuration set the Site URL to `https://haxpure.github.io/3d-stuff/login.html`
and add `https://haxpure.github.io/3d-stuff/*` to the Redirect URLs.

Note: the repo and GitHub Pages are public, so the login keeps people out of the normal way in, but the tool files
themselves are still downloadable. Real protection needs the tools served from a private place (e.g. Supabase Storage with a policy).
