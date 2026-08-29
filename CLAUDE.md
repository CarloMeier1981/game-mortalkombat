# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt

**ARENA PULSE** — ein 2D-Arena-Fighter (Vanilla JS, kein Framework, kein Build-Schritt) mit einer 3D-gerenderten Kämpfer-Darstellung (Three.js/WebGL) über flacher 2D-Spiellogik. Eigenständige IP, keine Verbindung zu bestehenden Fighting-Game-Marken. Details zu Steuerung/Start siehe [README.md](README.md).

## Befehle

Es gibt **kein** `package.json`, keinen Build-Schritt, keinen Linter und keine automatisierte Test-Suite — das Projekt läuft als reine ES-Module direkt im Browser.

**Lokal starten** (ES-Module brauchen einen HTTP-Server, kein `file://`):
```bash
node dev-server.js
```
Startet einen minimalen Static-File-Server auf Port 8080 (`dev-server.js`, keine Dependencies). Danach `http://localhost:8080` öffnen. In Claude Code selbst: `.claude/launch.json` definiert dieselbe Konfiguration für das Browser-Pane (`preview_start` mit `name: "arena-pulse"`).

**Verifikation von Änderungen:** ausschließlich manuell im Browser (Konsole auf Fehler prüfen, Charakterauswahl → Kampf durchspielen). Es existiert kein automatisierter Test-Runner.

**3D-Modelle neu bauen/anpassen** (benötigt eine lokale Blender-Installation, headless per CLI):
```bash
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python tools/build_ninja_model.py
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python tools/convert_skeletal_template.py -- <input.fbx> <texture.png> <output.glb> <ziel_hoehe>
```

## Architektur

### Kein Build, vendorte Dependencies

Alle Dependencies (Three.js + drei Loader/Utils aus `three/examples/jsm/`) liegen als vendorte Dateien unter `js/vendor/` und werden über eine `<script type="importmap">` in `index.html` eingebunden (`"three" → js/vendor/three.module.min.js`). Andere Module importieren einfach `from 'three'`. Um eine vendorte Datei zu aktualisieren/zu ergänzen: `npm install three@<version> --no-save`, Datei aus `node_modules/three/...` kopieren, danach `node_modules`/`package-lock.json` wieder löschen (das Repo bleibt absichtlich frei von `node_modules`).

### Zwei überlagerte Canvas-Elemente

`index.html` enthält `#game-canvas` (2D, unten) und `#game-canvas-3d` (WebGL, transparent, darüber), beide pixelgenau übereinandergelegt. Aufteilung:
- **`Renderer`** (`js/core/Renderer.js`, 2D-Canvas): Arena-Hintergrundbild, Partikel, Projektile. Berechnet `scale`/`offsetX`/`offsetY` (Weltkoordinaten → Bildschirm-Pixel, Letterboxing) — das ist die **einzige Quelle der Wahrheit** für dieses Mapping.
- **`Renderer3D`** (`js/core/Renderer3D.js`, WebGL/Three.js): rendert ausschließlich die Kämpfer-Rigs. Übernimmt `scale`/`offsetX`/`offsetY` von `Renderer` (`Game._syncRenderers()`) und spiegelt sie in eine `OrthographicCamera`: `camera.left = -offsetX/scale`, `right = (cw-offsetX)/scale`, `top = offsetY/scale`, `bottom = (offsetY-ch)/scale`. Fighter-Weltposition wird direkt als `group.position.set(x, -y, 0)` gesetzt (Y invertiert, da Spiellogik Y-nach-unten nutzt, Three.js Y-nach-oben).

Die eigentliche Spiellogik (Position, Physik, Hitboxes, Kollision) ist **vollständig 2D** und kennt Three.js nicht — nur die Darstellung läuft über WebGL. Weltkoordinaten: `WORLD` in `js/core/World.js` (1280×720, `floorY: 560`, Schwerkraft 0.85/Tick).

### Game.js als zentraler Orchestrator

`js/core/Game.js` hält den gesamten State (`GameStates` in `GameState.js`: `MENU → CHARACTER_SELECT → ARENA_SELECT → COUNTDOWN → FIGHT/TRAINING → ROUND_END → MATCH_END`, plus `PAUSED`/`SETTINGS`/`TUTORIAL`) und fährt eine **fixed-timestep Loop** (`_loop` akkumuliert echte Zeit, tickt `_tick(1/60)` in festen Schritten). Übergänge zwischen Bannern/Countdown/Rundenende laufen über einen simplen Scheduler: `this.schedulePhase(ticks, callback)` — `_tick` zählt `phaseTimer` in Ticks herunter und feuert `phaseCallback`, wenn er 0 erreicht (kein `setTimeout`, bleibt damit `PAUSED`-sicher).

Kampf-Events (Treffer, Block, K.o., Sprung, …) laufen als **Event-Bus-Callback** von `CombatSystem` → `Game._onCombatEvent()`, der dort Sound (`AudioManager`), Partikel, Kamera-Shake/Hitstop und Trainingsstatistik auslöst — `CombatSystem` selbst kennt weder Audio noch Rendering.

### Kampfsystem

`js/characters/Fighter.js` ist die Laufzeit-Instanz eines Kämpfers (Position, Zustand, Hitstun/Blockstun-Timer, Combo-Zähler). `js/combat/CombatSystem.js` verarbeitet pro Tick beide Fighter: Facing, Körperkollision (`_separateBodies`, verhindert Durchdringen), Hit-Auflösung (Hitbox vs. Hurtbox, AABB), Block-/Grab-Logik, Combo-Scaling, Projektile.

Angriffsdaten sind vollständig **datengetrieben** in `js/characters/CharacterData.js` (kein Balancing-Wert ist irgendwo hartkodiert):
```js
{ name, damage, startup, active, recovery, knockback, hitstun, blockstun, energyGain, range, width, height,
  multiHit?: n,        // z. B. Katana-Wirbel — mehrere Treffer in einer Attacke
  projectile?: true, projectileSpeed?: n }  // Fernkampf-Spezialangriffe (z. B. Solkans Knochenpfeil)
```
Alle Zeitwerte (`startup`/`active`/`recovery`/`hitstun`/`blockstun`) sind in **Ticks bei 60 Tick/s**, nicht Millisekunden.

### Drei Rig-Typen für die 3D-Darstellung

Acht Kämpfer, ausgewählt über `charData.rigKind` in `Renderer3D.js` (`RIG_KINDS`-Lookup-Tabelle, Fallback = `procedural`):

| `rigKind` | Kämpfer | Modul | Funktionsweise |
|---|---|---|---|
| *(kein Feld)* = procedural | Varkan, Nyra, Kael, Morvan | `FighterRig3D.js` | Reine Kapsel-/Kugel-Primitive, zur Laufzeit gebaut. `poseRig()` treibt benannte Teile (`legLPivot`, `armFrontPivot`, `head`, …) anhand von `fighter.state`. |
| `'ninja'` | Kage | `NinjaRig3D.js` | In Blender aus Primitiven gebautes GLB (`models/ninja.glb`). Die Pivot-Objekte im Blender-Rig sind **exakt** wie beim procedural-Rig benannt → nutzt dieselbe `poseRig()`-Funktion aus `FighterRig3D.js` unverändert mit. |
| `'skeletal'` | Cassius, Brannok, Solkan | `SkeletalRig3D.js` | Fertig geriggte, texturierte Charaktere aus `avatar-templates/` (Quaternius-artige FBX-Packs), per `tools/convert_skeletal_template.py` zu GLB konvertiert. Eigene `poseSkeletalRig()`-Logik (Bone-Rotation statt Pivot-Objekte). |

Jedes GLB wird per `preload*(url)` beim Spielstart einmal geladen und als Template gecacht (`Game.js`-Konstruktor); `_getRig()` in `Renderer3D.js` klont daraus pro Fighter-Instanz und rendert nichts, solange das Template noch lädt (kein Platzhalter-Rig).

**Gotchas bei neuen 3D-Kämpfern** (alle schon einmal live debuggt, siehe Git-Historie):
- `THREE.CapsuleGeometry(0.5, 1, …)` hat lokale **Höhe 2**, nicht 1 (Radius 0.5 an jeder Kappe zusätzlich zur Länge) — beim Skalieren durch 2 teilen, sonst überlappen sich alle Körperteile.
- Der glTF-Export **entfernt Punkte aus Bone-/Objektnamen** (`upper_arm.L` → `upper_armL`, `spine.003` → `spine003`). Namenslookups im JS-Code müssen die bereinigten Namen verwenden.
- Skinned-Mesh-Charaktere (rigKind `skeletal`) **müssen** mit `SkeletonUtils.clone()` (`js/vendor/utils/SkeletonUtils.js`) statt normalem `Object3D.clone(true)` instanziiert werden — sonst zeigen alle Klone auf dieselben Bone-Objekte und beeinflussen sich gegenseitig.
- Diese Skinned-Mesh-Vorlagen haben typischerweise eine **T-Pose als Bind-Pose** und keine gebackenen Animationsclips. Posen werden durch Rotation relativ zur gebackenen Rest-Rotation der Bones erreicht (`bone.rotation.set(rest.x, rest.y, rest.z + delta)`), nicht durch Setzen absoluter Winkel.
- Beim Aufräumen (`Renderer3D.clearFighters()`) wird pro Rig-Typ nur **klonierte Materialien** disposed, niemals die geteilte Template-Geometrie (die wird über die gesamte Session wiederverwendet).

### Charakter-/Arena-Daten

`js/characters/CharacterData.js` exportiert `CHARACTERS` (Array, jeder Eintrag = vollständiges Balancing + Optik + optional `model3d`/`rigKind`) und `getCharacter(id)`. `js/arenas/ArenaData.js` exportiert `ARENAS` analog — jede Arena zeichnet ihren Hintergrund über ein Foto in `backgrounds/*.png` (Cover-Crop, siehe `drawImageCover()`), keine prozeduralen Hintergründe mehr. Neue Kämpfer/Arenen hinzufügen = neuer Array-Eintrag; UI (Charakterauswahl, Arcade-Leiter, Zufallsgegner-Pool) iteriert überall dynamisch über diese Arrays, ohne Anzahl-Annahmen.

### Sonstiges

- **Audio** (`js/core/AudioManager.js`): komplett prozedural per WebAudio-API synthetisiert (Oszillatoren, gefilterter Noise-Burst, WaveShaper-Sättigung) — keine Audiodateien im Projekt.
- **Persistenz**: Settings/Fortschritt über `localStorage`, gekapselt in `js/core/Storage.js`.
- **Asset-Ordner**: `backgrounds/` (Arena-Fotos, im Spiel geladen), `models/` (kompilierte GLBs, im Spiel geladen), `avatar-pics/` (Referenzbilder für Kage, nur Doku), `avatar-templates/` (rohe FBX-Quellpacks für die Skeletal-Kämpfer). Es gibt kein `.gitignore` — `avatar-templates/` wurde bisher bewusst nie mit `git add` erfasst (reines lokales Rohmaterial, nicht laufzeitrelevant), taucht also als untracked in `git status` auf.
