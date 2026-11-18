// ===== DE / EN language switch (shared by all tools) =====
// Translates the page's English UI text in place; new and changed text (status, info box, lists) is caught by a MutationObserver.
(() => {
  const D = {
    // --- common ---
    'Address or place': 'Adresse oder Ort', 'Find': 'Suchen', 'Use the found place as the label name': 'Gefundenen Ort als Beschriftung verwenden',
    'Center (lat, lon) — paste from Google Maps, or click the map': 'Mittelpunkt (Breite, Länge) – aus Google Maps einfügen oder in die Karte klicken',
    'Center (lat, lon) — or click the map': 'Mittelpunkt (Breite, Länge) – oder in die Karte klicken',
    'Area width': 'Gebietsbreite', 'Area width (m)': 'Gebietsbreite (m)', 'km of real terrain across the print': 'km echtes Gelände über die Druckbreite', 'real distance across the print': 'echte Strecke über die Druckbreite',
    'Load terrain': 'Gelände laden', 'Load area': 'Gebiet laden', 'Print size': 'Druckgröße', 'Map width (mm)': 'Kartenbreite (mm)', 'Map depth (mm)': 'Kartentiefe (mm)',
    'Bed size (mm)': 'Druckbett (mm)', 'used to center the model': 'zum Zentrieren des Modells', 'Mesh resolution (mm)': 'Netzauflösung (mm)', 'smaller = finer, bigger file': 'kleiner = feiner, größere Datei',
    'ground detail: roads, trees, roofs. Smaller = finer, bigger file': 'Detail am Boden: Straßen, Bäume, Dächer. Kleiner = feiner, größere Datei',
    'Relief': 'Relief', 'Vertical exaggeration': 'Überhöhung', 'Base thickness (mm)': 'Sockeldicke (mm)', 'Min. terrain above base (mm)': 'Min. Gelände über Sockel (mm)', 'Smoothing': 'Glättung',
    'Contour lines': 'Höhenlinien', 'Interval (m)': 'Abstand (m)', 'Lowest contour (m)': 'Unterste Höhenlinie (m)', '0 = automatic': '0 = automatisch', 'Line thickness (layers)': 'Linienstärke (Schichten)',
    '0 = no contour lines': '0 = keine Höhenlinien', 'Layer height (mm)': 'Schichthöhe (mm)', 'Label strip': 'Beschriftungsleiste', 'Name': 'Name', 'Second line': 'Zweite Zeile',
    'auto-filled with coordinates until you edit it': 'wird mit Koordinaten gefüllt, bis du sie änderst', 'Strip depth (mm)': 'Leistentiefe (mm)', '0 = no label': '0 = keine Beschriftung',
    'Text height (mm)': 'Schrifthöhe (mm)', 'Text size': 'Schriftgröße', 'Download 3MF': '3MF herunterladen', 'STLs (zip)': 'STLs (ZIP)', 'Working…': 'Arbeite…',
    'Load a location to start.': 'Lade einen Ort, um zu starten.', 'Search an address to start.': 'Suche eine Adresse, um zu starten.', 'Water': 'Wasser', 'Terrain': 'Gelände',
    'Loading terrain…': 'Lade Gelände…', 'Looking up address…': 'Suche Adresse…', 'Address found.': 'Adresse gefunden.', 'Building meshes…': 'Erzeuge Modell…', 'Writing 3MF…': 'Schreibe 3MF…',
    'Compressing…': 'Komprimiere…', 'Writing STLs…': 'Schreibe STLs…', 'Preview color': 'Vorschaufarbe', 'Filament name': 'Filamentname',
    'STLs: drag all files into the slicer at once and answer "Yes" to load them as one multi-part object.': 'STLs: Alle Dateien gleichzeitig in den Slicer ziehen und mit „Ja" als ein Objekt mit mehreren Teilen laden.',
    'STLs: drag all files into the slicer at once and answer "Yes" to load them as one multi-part object. Tool numbers are in the file names.': 'STLs: Alle Dateien gleichzeitig in den Slicer ziehen und mit „Ja" als ein Objekt mit mehreren Teilen laden. Die Tool-Nummern stehen im Dateinamen.',
    'Elevation:': 'Höhendaten:', '. Address search: Photon / Nominatim. Map tiles: Esri.': '. Adresssuche: Photon / Nominatim. Kartenkacheln: Esri.',
    // --- Relief Maker ---
    'Relief Maker V2 – multi-color terrain 3MF': 'Relief Maker V2 – mehrfarbiges Gelände als 3MF',
    'Address in, multi-color multi-part 3MF out — with trails, POIs and detailed water.': 'Adresse rein, mehrfarbiges 3MF raus – mit Wegen, POIs und detailliertem Wasser.',
    'Set center': 'Mitte setzen', 'Draw trail': 'Weg zeichnen', 'Add POI': 'POI setzen', 'Undo point': 'Punkt zurück', 'Finish trail': 'Weg fertig', '+ Add found place as POI': '+ Gefundenen Ort als POI',
    'Click the map to set the center of the print.': 'In die Karte klicken, um die Mitte des Drucks zu setzen.',
    'Click along your route. Double-click or "Finish trail" when done.': 'Entlang deiner Route klicken. Doppelklick oder „Weg fertig" zum Abschließen.',
    'Click the map to drop a POI marker (shape from the POI section).': 'In die Karte klicken, um einen POI zu setzen (Form aus dem POI-Bereich).',
    'Colors & filaments': 'Farben & Filamente', 'Preset': 'Vorlage', 'replaces the list below': 'ersetzt die Liste unten', 'Choose…': 'Auswählen…', '4 colors (fixed)': '4 Farben (fix)',
    'Classic: black · gray · yellow · cyan (contours)': 'Klassisch: Schwarz · Grau · Gelb · Cyan (Höhenlinien)', 'Alpine: dark green · olive · light gray · blue': 'Alpin: Dunkelgrün · Oliv · Hellgrau · Blau',
    'Forest & gold: green · stone · gold · blue': 'Wald & Gold: Grün · Stein · Gold · Blau', 'High alpine: charcoal · rock · snow · red trail': 'Hochalpin: Anthrazit · Fels · Schnee · roter Weg',
    'More colors (slicer mixes)': 'Mehr Farben (Slicer mischt)', 'Alpine gradient: 8 terrain colors': 'Alpiner Verlauf: 8 Geländefarben', 'Satellite: 9 colors': 'Satellit: 9 Farben',
    'Mode': 'Modus', 'Coloring': 'Einfärbung', 'Elevation bands': 'Höhenstufen', 'Elevation gradient': 'Höhenverlauf', 'Satellite colors': 'Satellitenfarben',
    'Your 4 filaments': 'Deine 4 Filamente', 'Your colors': 'Deine Farben', '+ Add filament': '+ Farbe hinzufügen', 'Sort by tool': 'Nach Tool sortieren', 'Terrain coloring': 'Geländefarben',
    'Exactly 4. Name them after your spools and set the tool each one is loaded in.': 'Genau 4. Benenne sie nach deinen Spulen und stell das Tool ein, in dem sie geladen sind.',
    'Each color becomes its own filament slot (placeholder) in the 3MF. Set up the mixes in the slicer.': 'Jede Farbe wird ein eigener Filament-Platzhalter im 3MF. Die Mischungen stellst du im Slicer ein.',
    'Satellite colors are matched to the colors ticked "R". Each color becomes its own filament slot (placeholder) in the 3MF. Set up the mixes in the slicer.': 'Satellitenfarben werden den mit „R" markierten Farben zugeordnet. Jede Farbe wird ein eigener Filament-Platzhalter im 3MF. Die Mischungen stellst du im Slicer ein.',
    '+ Add band': '+ Stufe hinzufügen', 'Auto heights': 'Höhen automatisch', 'Transition height (m)': 'Übergangshöhe (m)', '0 = hard edges': '0 = harte Kanten',
    'Mix steps per transition': 'Mischstufen pro Übergang', 'extra placeholder colors in the 3MF': 'zusätzliche Platzhalterfarben im 3MF', 'Steep slopes': 'Steile Hänge',
    'Steeper than (°)': 'Steiler als (°)', 'real slope, before exaggeration': 'echte Neigung, vor der Überhöhung', 'Imagery': 'Satellitenbild', 'Esri World Imagery (sharp)': 'Esri World Imagery (scharf)',
    'Sentinel-2 cloudless (soft, even)': 'Sentinel-2 cloudless (weich, gleichmäßig)', 'Auto-levels (stretch dark imagery)': 'Auto-Tonwert (dunkle Bilder aufhellen)', 'Saturation': 'Sättigung',
    'Cleanup': 'Bereinigung', 'removes single-pixel speckles': 'entfernt einzelne Pixel-Sprenkel', 'Draw contour lines on top': 'Höhenlinien darüber zeichnen',
    'Filaments from imagery': 'Farben aus dem Satellitenbild', 'replaces the "R" filaments': 'ersetzt die „R"-Farben', 'Create': 'Erzeugen', 'Color skin (mm)': 'Farbschicht (mm)',
    'depth of the colored surface layer': 'Tiefe der farbigen Oberflächenschicht', 'Assignments': 'Zuordnung', 'Base plate': 'Sockel', 'Inner core': 'Innerer Kern',
    'hidden inside, under the color skin': 'innen versteckt, unter der Farbschicht', 'Contours & label text': 'Höhenlinien & Beschriftung', 'Trails': 'Wege', 'POI markers': 'POI-Markierungen',
    'Water (OpenStreetMap)': 'Wasser (OpenStreetMap)', 'Rivers & canals': 'Flüsse & Kanäle', 'Streams': 'Bäche', 'Lakes, ponds & reservoirs': 'Seen, Teiche & Stauseen',
    'Wide rivers as true outlines': 'Breite Flüsse mit echtem Umriss', 'Flat lake surfaces': 'Ebene Seeoberflächen', 'Rivers flow downhill (cut a clean valley floor)': 'Flüsse fließen bergab (sauberer Talboden)',
    'Use real river width from OSM where wider': 'Echte Flussbreite aus OSM verwenden, wo breiter', 'River width (mm)': 'Flussbreite (mm)', 'Stream width (mm)': 'Bachbreite (mm)',
    'Carve depth (mm)': 'Einfrästiefe (mm)', 'Water surface below shore (mm)': 'Wasseroberfläche unter Ufer (mm)', 'Smallest lake (mm²)': 'Kleinster See (mm²)', 'on the print; hides tiny ponds': 'am Druck; blendet winzige Teiche aus',
    'Import GPX / KML / GeoJSON': 'GPX / KML / GeoJSON importieren', 'OSM hiking routes': 'OSM-Wanderwege', 'Import waypoints as POIs': 'Wegpunkte als POIs importieren',
    'Or pick "Draw trail" above the map and click along the route (double-click to finish).': 'Oder oben „Weg zeichnen" wählen und entlang der Route klicken (Doppelklick zum Beenden).',
    'Style': 'Stil', 'Raised ridge': 'Erhabener Grat', 'Inlaid (flush)': 'Eingelassen (bündig)', 'Trail width (mm)': 'Wegbreite (mm)', 'Raised height (mm)': 'Erhöhung (mm)', 'Inlay depth (mm)': 'Einlasstiefe (mm)',
    '+ OSM peaks & huts': '+ OSM-Gipfel & Hütten', 'Remove all': 'Alle entfernen', 'Max. per type': 'Max. pro Art', 'highest first': 'höchste zuerst', 'Shape for new POIs': 'Form für neue POIs',
    '▲ Triangle (summit)': '▲ Dreieck (Gipfel)', '● Dot': '● Punkt', '◯ Ring': '◯ Ring', '■ Square (hut)': '■ Quadrat (Hütte)', '◆ Diamond': '◆ Raute', '★ Star': '★ Stern',
    'Marker size (mm)': 'Markergröße (mm)', 'Marker height (mm)': 'Markerhöhe (mm)', 'Show POI names in the preview': 'POI-Namen in der Vorschau zeigen',
    '(Mapzen). Water, routes, peaks: ©': '(Mapzen). Wasser, Routen, Gipfel: ©',
    'contributors. Map & imagery: Esri, Maxar, Earthstar Geographics; Sentinel-2 cloudless by': 'Mitwirkende. Karte & Satellitenbilder: Esri, Maxar, Earthstar Geographics; Sentinel-2 cloudless von',
    '(CC BY-NC-SA 4.0, non-commercial). Print with the layer height above so contour lines and bands land on whole layers.': '(CC BY-NC-SA 4.0, nicht kommerziell). Mit der oben eingestellten Schichthöhe drucken, damit Höhenlinien und Stufen auf ganzen Schichten liegen.',
    'No trails yet.': 'Noch keine Wege.', 'No POIs yet.': 'Noch keine POIs.', 'up to': 'bis', 'and above': 'und darüber', '— off —': '— aus —', 'Up to (m)': 'Bis (m)',
    'Print this trail': 'Diesen Weg drucken', 'Fit the print area to this trail': 'Druckbereich an diesen Weg anpassen', 'Remove color': 'Farbe entfernen', 'Remove filament': 'Farbe entfernen',
    'Use for the satellite surface': 'Für die Satellitenoberfläche verwenden', 'Terrain loaded — loading rivers & lakes in the background…': 'Gelände geladen – Flüsse & Seen werden im Hintergrund geladen…',
    'Terrain loaded. River data (OpenStreetMap) not reachable right now — model without rivers. Press "Load terrain" to retry.': 'Gelände geladen. Flussdaten (OpenStreetMap) gerade nicht erreichbar – Modell ohne Flüsse. „Gelände laden" für neuen Versuch.',
    'Load terrain first.': 'Zuerst Gelände laden.', 'Trail added.': 'Weg hinzugefügt.', 'A trail needs at least two points.': 'Ein Weg braucht mindestens zwei Punkte.',
    'No new marked hiking routes in this area.': 'Keine neuen markierten Wanderwege in diesem Gebiet.', 'OpenStreetMap not reachable right now — try again in a minute.': 'OpenStreetMap gerade nicht erreichbar – in einer Minute nochmal versuchen.',
    'Loading marked hiking routes from OpenStreetMap…': 'Lade markierte Wanderwege von OpenStreetMap…', 'Loading peaks and huts from OpenStreetMap…': 'Lade Gipfel und Hütten von OpenStreetMap…',
    'Loading satellite imagery…': 'Lade Satellitenbild…', 'Satellite imagery loaded.': 'Satellitenbild geladen.', 'Browser storage is full — trails/POIs will not survive a reload.': 'Browserspeicher voll – Wege/POIs gehen beim Neuladen verloren.',
    'larger than bed': 'größer als das Druckbett', 'water unavailable': 'Wasser nicht verfügbar',
    // --- Town Maker ---
    'Town Maker – 3D buildings to multi-color 3MF': 'Town Maker – 3D-Gebäude als mehrfarbiges 3MF',
    'Your street in 3D: buildings, roads and water on real terrain, as a multi-color 3MF.': 'Deine Straße in 3D: Gebäude, Straßen und Wasser auf echtem Gelände, als mehrfarbiges 3MF.',
    'Buildings': 'Gebäude', 'Show buildings': 'Gebäude anzeigen', 'Height scale': 'Höhenfaktor', 'Height if unknown (m)': 'Höhe wenn unbekannt (m)', 'Min. building height (mm)': 'Min. Gebäudehöhe (mm)',
    'Roof pitch': 'Dachneigung', '0 = all roofs flat': '0 = alle Dächer flach', 'Pitched roofs up to width (m)': 'Schrägdach bis Breite (m)', 'wider buildings stay flat': 'breitere Gebäude bleiben flach',
    'Highlight the buildings at the searched address': 'Gebäude an der gesuchten Adresse markieren', 'Include garages & sheds on the same property': 'Garagen & Schuppen am selben Grundstück mitnehmen',
    'Click any building in the 3D view to highlight it or remove the highlight.': 'Klicke ein Gebäude in der 3D-Ansicht an, um es zu markieren oder die Markierung zu entfernen.',
    'Clear highlights': 'Markierungen löschen', 'Trees & fields': 'Bäume & Felder', 'Forests (tree crowns)': 'Wälder (Baumkronen)', 'Trees in parks & gardens': 'Bäume in Parks & Gärten',
    'Tree height (m)': 'Baumhöhe (m)', 'Crown size (m)': 'Kronengröße (m)', 'Tree height scale': 'Baumhöhen-Faktor', 'Plowed-field texture on farmland': 'Ackerfurchen auf Feldern',
    'Furrow depth (mm)': 'Furchentiefe (mm)', 'Furrow spacing (mm)': 'Furchenabstand (mm)', 'Terrain, roads & water': 'Gelände, Straßen & Wasser', 'Terrain exaggeration': 'Geländeüberhöhung',
    'Terrain smoothing': 'Geländeglättung', 'Min. ground above base (mm)': 'Min. Boden über Sockel (mm)', 'Roads': 'Straßen', 'Footpaths & tracks': 'Fußwege & Feldwege',
    'Railways & trams (raised)': 'Bahn & Straßenbahn (erhaben)', 'Road width scale': 'Straßenbreiten-Faktor', 'Min. road width (mm)': 'Min. Straßenbreite (mm)', 'Rivers & lakes': 'Flüsse & Seen',
    'Small streams': 'Kleine Bäche', 'roads and water': 'Straßen und Wasser', 'Filaments & tools': 'Filamente & Tools',
    'Highlighted (your house)': 'Markiert (dein Haus)', 'Trees': 'Bäume', 'Railways': 'Bahnen', 'Roads & paths': 'Straßen & Wege', 'Ground': 'Boden', 'Base': 'Sockel', 'Label text': 'Beschriftung',
    'Drag to rotate · scroll to zoom · click a building to highlight it': 'Ziehen zum Drehen · Scrollen zum Zoomen · Gebäude anklicken zum Markieren',
    'Buildings, roads & water: ©': 'Gebäude, Straßen & Wasser: ©', 'contributors (heights from OSM tags, otherwise estimated). Elevation:': 'Mitwirkende (Höhen aus OSM-Tags, sonst geschätzt). Höhendaten:',
    'Terrain loaded — loading buildings & roads from OpenStreetMap…': 'Gelände geladen – lade Gebäude & Straßen von OpenStreetMap…', 'Loading buildings & roads (OpenFreeMap)…': 'Lade Gebäude & Straßen (OpenFreeMap)…',
    'Buildings could not be loaded (OpenStreetMap server busy). Press "Load area" to retry.': 'Gebäude konnten nicht geladen werden (OpenStreetMap-Server ausgelastet). „Gebiet laden" für neuen Versuch.',
    'Buildings not loaded yet': 'Gebäude noch nicht geladen',
    '4 colors': '4 Farben', 'More colors': 'Mehr Farben', 'My presets': 'Eigene Vorlagen', 'Name for your own preset': 'Name für eigene Vorlage', 'Save': 'Speichern', 'Delete preset': 'Vorlage löschen',
    'Browser storage is full — preset not saved.': 'Browserspeicher voll – Vorlage nicht gespeichert.',
    'This preset has more than 4 colors — switch the mode to "More colors" to use it.': 'Diese Vorlage hat mehr als 4 Farben – stell den Modus auf „Mehr Farben", um sie zu verwenden.',
    'POI in the middle of the map (your address)': 'POI in der Kartenmitte (deine Adresse)', 'Middle POI shape': 'Form des Mitte-POI', 'Center': 'Mitte',
    'Enlarge the map until this trail fits (center stays)': 'Karte vergrößern, bis dieser Weg ganz draufpasst (Mitte bleibt)', 'This trail already fits.': 'Dieser Weg passt schon ganz drauf.',
    'Max. colors': 'Max. Farben', 'the most used colors / mixes are kept': 'die am meisten genutzten Farben / Mischungen bleiben',
    'Expert settings': 'Experten-Einstellungen', 'Your filaments': 'Deine Filamente', 'The colors loaded in your printer. The suggestions below are made from them.': 'Die Farben, die in deinem Drucker geladen sind. Daraus werden die Vorschläge unten erstellt.',
    'I have the Full Spectrum pack (CMY + White/Gray)': 'Ich habe das Full-Spectrum-Set (CMY + Weiß/Grau)', 'Pack': 'Set', 'White Edition': 'White Edition', 'Gray Edition': 'Gray Edition',
    'Suggestions': 'Vorschläge', 'Load terrain to see the suggestions.': 'Lade das Gelände, um die Vorschläge zu sehen.', 'Smooth gradient': 'Weicher Verlauf',
    'Natural terrain colors mixed from the pack.': 'Natürliche Geländefarben, aus dem Set gemischt.', 'Your colors with mixed transitions. The slicer mixes them.': 'Deine Farben mit gemischten Übergängen. Der Slicer mischt sie.',
    'Real colors from satellite imagery, mixed from the pack.': 'Echte Farben aus dem Satellitenbild, aus dem Set gemischt.', 'Real colors from satellite imagery, using your colors and their mixes.': 'Echte Farben aus dem Satellitenbild, aus deinen Farben und ihren Mischungen.',
    'Light blue': 'Hellblau',
    'Hue': 'Farbton', 'Contrast': 'Kontrast',
    'Hue shifts satellite colors and Full Spectrum mixes. Contrast also moves the band borders: more area for the darkest and lightest color.': 'Der Farbton verschiebt Satellitenfarben und Full-Spectrum-Mischungen. Der Kontrast verschiebt auch die Stufengrenzen: mehr Fläche für die dunkelste und hellste Farbe.',
    "Shifts the wanted colors before they are matched to the pack's mixes.": 'Verschiebt die gewünschten Farben, bevor sie den Mischungen des Sets zugeordnet werden.',
    'Only with the Full Spectrum pack: fixed filaments cannot change their color.': 'Nur mit dem Full-Spectrum-Set: feste Filamente können ihre Farbe nicht ändern.',
    'Real-looking: colors ordered by height like in the satellite image, with mixed transitions. The slicer mixes them.': 'Natürlicher Look: Farben nach Höhe geordnet wie im Satellitenbild, mit gemischten Übergängen. Der Slicer mischt sie.',
    // --- Full Spectrum mode ---
    'Full Spectrum pack (CMY + W/G)': 'Full-Spectrum-Set (CMY + W/G)', 'Filament pack': 'Filament-Set', 'T1 Cyan · T2 Magenta · T3 Yellow · T4 White / Gray': 'T1 Cyan · T2 Magenta · T3 Gelb · T4 Weiß / Grau',
    'Full Spectrum White Edition': 'Full Spectrum White Edition', 'Full Spectrum Gray Edition': 'Full Spectrum Gray Edition', 'Your colors (Full Spectrum)': 'Deine Farben (Full Spectrum)',
    'Pick any colors. Each one is moved to the nearest mix the pack can make (shown on the right, approximate). Set up those mixes in Snapmaker Orca → Color Mixing. Pure white (Gray Edition) and black cannot be mixed.': 'Wähle beliebige Farben. Jede wird auf die nächste Mischung gesetzt, die das Set schafft (rechts angezeigt, ungefähr). Diese Mischungen legst du in Snapmaker Orca → Color Mixing an. Reines Weiß (Gray Edition) und Schwarz lassen sich nicht mischen.',
    'Pick any color per part. It is moved to the nearest mix the pack can make (approximate); every mix gets its own placeholder filament from T5. Set up the mixes in Snapmaker Orca → Color Mixing.': 'Wähle pro Teil eine beliebige Farbe. Sie wird auf die nächste Mischung gesetzt, die das Set schafft (ungefähr); jede Mischung bekommt ab T5 einen eigenen Filament-Platzhalter. Die Mischungen legst du in Snapmaker Orca → Color Mixing an.',
    'Nearest mix of the pack': 'Nächste Mischung des Sets', 'Wanted color': 'Gewünschte Farbe',
    'e.g. Hauptplatz 1, 8010 Graz': 'z. B. Hauptplatz 1, 8010 Graz', 'e.g. Schöckl, Graz  ·  Hauptplatz 1, 8010 Graz': 'z. B. Schöckl, Graz  ·  Hauptplatz 1, 8010 Graz',
  };
  // patterns for messages that contain numbers or names (applied in order)
  const R = [
    [/^(.+) terrain with (.+) contour lines\.$/, 'Gelände in $1 mit Höhenlinien in $2.'],
    [/^Elevation tiles (\d+)\/(\d+) \(zoom (\d+)\)…$/, 'Höhendaten $1/$2 (Zoom $3)…'], [/^Imagery tiles (\d+)\/(\d+) \(zoom (\d+)\)…$/, 'Satellitenbild $1/$2 (Zoom $3)…'],
    [/^Found (\d+) matches — using the first, click another to switch\.$/, '$1 Treffer – der erste wird verwendet, klicke einen anderen zum Wechseln.'],
    [/^Nothing found for "(.*)"\.$/, 'Nichts gefunden für „$1".'], [/^Could not read the coordinates — use e\.g\. "(.*)"\.$/, 'Koordinaten nicht lesbar – z. B. „$1" verwenden.'],
    [/ — check your internet connection\.$/, ' – prüfe deine Internetverbindung.'], [/ — try the other imagery source\.$/, ' – probiere die andere Bildquelle.'],
    [/^Export failed: /, 'Export fehlgeschlagen: '], [/^Import failed: /, 'Import fehlgeschlagen: '], [/^Imagery failed: /, 'Satellitenbild fehlgeschlagen: '],
    [/^Trying backup source: (.*)…$/, 'Versuche Ersatzquelle: $1…'],
    [/^Terrain and water loaded \((\d+) river segments, (\d+) water areas\)\.$/, 'Gelände und Wasser geladen ($1 Flussabschnitte, $2 Wasserflächen).'],
    [/^Added (\d+) hiking routes \(switched off\) — tick the ones you want printed\.$/, '$1 Wanderwege hinzugefügt (ausgeschaltet) – hake die an, die gedruckt werden sollen.'],
    [/^Added (\d+) POIs \((\d+) peaks, (\d+) huts\)\.$/, '$1 POIs hinzugefügt ($2 Gipfel, $3 Hütten).'], [/^Added POI "(.*)"\.$/, 'POI „$1" hinzugefügt.'],
    [/^Imported (\d+) trail\(s\), (\d+) waypoint\(s\) — moved the print area onto the track\.$/, '$1 Weg(e), $2 Wegpunkt(e) importiert – Druckbereich auf den Track verschoben.'],
    [/^Imported (\d+) trail\(s\) — map enlarged to ([\d.]+) km so the whole track fits \(center unchanged\)\.$/, '$1 Weg(e) importiert – Karte auf $2 km vergrößert, damit der ganze Track draufpasst (Mitte bleibt).'],
    [/^Trail added — map enlarged to ([\d.]+) km so it fits\.$/, 'Weg hinzugefügt – Karte auf $1 km vergrößert, damit er draufpasst.'], [/^Map enlarged to ([\d.]+) km\.$/, 'Karte auf $1 km vergrößert.'],
    [/^Imported (\d+) trail\(s\), (\d+) waypoint\(s\) as POIs\.$/, '$1 Weg(e) und $2 Wegpunkt(e) als POIs importiert.'], [/^Imported (\d+) trail\(s\)\.$/, '$1 Weg(e) importiert.'],
    [/^Created (\d+) filaments from the imagery — rename them to your spools and match the tools\.$/, '$1 Farben aus dem Satellitenbild erzeugt – benenne sie nach deinen Spulen und ordne die Tools zu.'],
    [/^3MF: (\d+) parts, ([\d.]+) M triangles, ([\d.]+) MB\. Load these filaments: /, '3MF: $1 Teile, $2 Mio. Dreiecke, $3 MB. Diese Filamente laden: '],
    [/^3MF: (\d+) parts, ([\d.]+) M triangles, ([\d.]+) MB\. /, '3MF: $1 Teile, $2 Mio. Dreiecke, $3 MB. '],
    [/Loaded (\d+) buildings \((.+?)\)\./, '$1 Gebäude geladen ($2).'],
    [/Highlighted (\d+) buildings? at the center point\./, '$1 Gebäude beim Mittelpunkt markiert.'], [/Highlighted (\d+) buildings? at (.+?)( \(house number not in map data, used the nearest building\))?\.$/, (m, n, w, h) => `${n} Gebäude bei ${w} markiert${h ? ' (Hausnummer nicht in den Kartendaten, nächstes Gebäude verwendet)' : ''}.`],
    [/No building found at the center point — click one in the 3D view to highlight it\./, 'Kein Gebäude beim Mittelpunkt – klicke eines in der 3D-Ansicht an, um es zu markieren.'],
    [/No building found at (.+?) — click one in the 3D view to highlight it\./, 'Kein Gebäude bei $1 gefunden – klicke eines in der 3D-Ansicht an, um es zu markieren.'],
    [/^Elevation (.+?) m · scale 1:/, 'Höhe $1 m · Maßstab 1:'], [/^Scale 1:/, 'Maßstab 1:'], [/ · elevation (-?\d)/, ' · Höhe $1'],
    [/^4 colors · /, '4 Farben · '], [/^Full Spectrum · /, 'Full Spectrum · '], [/^more colors · /, 'mehr Farben · '], [/elevation bands/, 'Höhenstufen'], [/elevation gradient/, 'Höhenverlauf'], [/contour lines/, 'Höhenlinien'],
    [/satellite \(imagery loading…\)/, 'Satellit (Bild lädt…)'], [/satellite colors/, 'Satellitenfarben'], [/ · (\d+) mix colors/, ' · $1 Mischfarben'], [/(\d+) filaments on (\d+) tools/, '$1 Filamente auf $2 Tools'],
    [/^(\d+) contours · /, '$1 Höhenlinien · '], [/water on \((\d+) lakes\)/, 'Wasser an ($1 Seen)'], [/water unavailable/, 'Wasser nicht verfügbar'], [/ · (\d+) trails · /, ' · $1 Wege · '],
    [/\((\d+) too close to the edge\)/, '($1 zu nah am Rand)'],
    [/^(\d+) buildings \((\d+) pitched roofs\) · (\d+) trees · (\d+) highlighted$/, '$1 Gebäude ($2 mit Schrägdach) · $3 Bäume · $4 markiert'],
    [/^Saved preset "(.*)"\.$/, 'Vorlage „$1" gespeichert.'], [/^(.+) \((\d+) colors\)$/, '$1 ($2 Farben)'],
    [/^(\d+) colors from low to high, water in (.+)\. One color swap per band\.$/, '$1 Farben von tief nach hoch, Wasser in $2. Ein Farbwechsel pro Stufe.'],
    [/^(\d+) colors from low to high\. One color swap per band\.$/, '$1 Farben von tief nach hoch. Ein Farbwechsel pro Stufe.'],
    [/^Preview at ([\d.]+) mm, export at ([\d.]+) mm$/, 'Vorschau mit $1 mm, Export mit $2 mm'],
  ];
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const tr = s => {
    const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/), core = norm(m[2]);
    if (!core) return s;
    if (D[core] != null) return m[1] + D[core] + m[3];
    let t = core; for (const [rx, rep] of R) t = t.replace(rx, rep);
    return t === core ? s : m[1] + t + m[3];
  };
  const orig = new WeakMap(), mine = new WeakMap(), ATTR = ['placeholder', 'title', 'label'];
  let lang = 'en';
  try { lang = localStorage.getItem('makerLang') || ((navigator.language || '').toLowerCase().startsWith('de') ? 'de' : 'en'); } catch (e) {}
  const skip = el => el && el.closest && el.closest('#map, script, style, #langSw, textarea');
  function doText(n) {
    if (skip(n.parentElement)) return;
    if (mine.get(n) === n.data) { if (lang === 'en') { const o = orig.get(n); mine.delete(n); n.data = o; } return; }
    if (lang !== 'de') return;
    const t = tr(n.data); if (t !== n.data) { orig.set(n, n.data); mine.set(n, t); n.data = t; }
  }
  function doAttrs(el) {
    if (skip(el)) return;
    for (const a of ATTR) {
      const v = el.getAttribute(a); if (v == null) continue;
      const key = a + '\u0000', o = orig.get(el) || {}, mm = mine.get(el) || {};
      if (mm[a] === v) { if (lang === 'en') { el.setAttribute(a, o[a]); delete mm[a]; } continue; }
      if (lang !== 'de') continue;
      const t = tr(v); if (t !== v) { o[a] = v; mm[a] = t; orig.set(el, o); mine.set(el, mm); el.setAttribute(a, t); }
    }
  }
  function walk(root) {
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1) return;
    doAttrs(root);
    const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = it.nextNode(); n; n = it.nextNode()) n.nodeType === 3 ? doText(n) : doAttrs(n);
  }
  let origTitle = document.title;
  function setLang(l) {
    lang = l; try { localStorage.setItem('makerLang', l); } catch (e) {}
    document.documentElement.lang = l;
    walk(document.body);
    document.title = l === 'de' ? tr(origTitle) : origTitle;
    for (const b of sw.querySelectorAll('button')) b.classList.toggle('on', b.dataset.l === l);
  }
  // switch UI (top-right corner)
  const css = document.createElement('style');
  css.textContent = '#langSw{position:fixed;top:10px;right:12px;z-index:1000;display:flex;background:rgba(17,19,23,.88);border:1px solid #262a33;border-radius:8px;padding:3px;gap:3px}' +
    '#langSw button{width:auto;background:transparent;color:#8b919c;border:0;border-radius:5px;padding:4px 9px;font:600 12px Inter,system-ui,sans-serif;cursor:pointer}' +
    '#langSw button.on{background:#f6c21c;color:#111}';
  document.head.appendChild(css);
  const sw = document.createElement('div'); sw.id = 'langSw';
  sw.innerHTML = '<button type="button" data-l="de">DE</button><button type="button" data-l="en">EN</button>';
  sw.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setLang(b.dataset.l); });
  document.body.appendChild(sw);
  new MutationObserver(recs => {
    for (const r of recs) {
      if (r.type === 'characterData') doText(r.target);
      else if (r.type === 'attributes') doAttrs(r.target);
      else for (const n of r.addedNodes) walk(n);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTR });
  setLang(lang);
})();
