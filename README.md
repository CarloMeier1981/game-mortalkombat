# ARENA PULSE

Ein düsterer 2D-Arena-Fighter (Vanilla JS, HTML5 Canvas, WebAudio, Three.js/WebGL) — eigenständige IP, keine Verbindung zu bestehenden Fighting-Game-Marken.

## Starten

Da das Projekt als ES-Module aufgebaut ist, muss es über einen lokalen HTTP-Server geöffnet werden (nicht per `file://`):

```bash
npx serve .
```

oder

```bash
python -m http.server 8080
```

Danach `index.html` im Browser öffnen (z. B. `http://localhost:8080`).

## Steuerung

**Spieler 1 (Tastatur):** A/D bewegen, W springen, S ducken, J leicht, K schwer, L Spezial, U Block, I Ausweichen, O Grab.
**Spieler 2 (Tastatur):** Pfeiltasten bewegen, Angriffe wahlweise über Numpad 1/2/3/0/Enter/. **oder** über Buchstaben N (leicht), M (schwer), B (Spezial), V (Block), C (Ausweichen), X (Grab) — praktisch für Laptops ohne Nummernblock.
**Mobile:** Touch-Steuerkreuz links, Aktionsbuttons rechts.
**Gamepad:** Erster verbundener Controller wird automatisch Spieler 1 (zweiter Controller Spieler 2).

## Architektur

Siehe `js/` — modular aufgeteilt in `core` (State, Loop, Rendering, Input, Audio, Storage), `characters` (Datenmodell + Laufzeit-Fighter + 3D-Rig), `combat` (Hit-Resolution, Combo-Tracking), `ai` (Gegner-KI), `arenas` (Arena-Hintergründe), `fx` (Partikel, Kamera-Shake/Hitstop), `ui` (Menüs, HUD, Touch-Controls) und `modes` (Quick Fight, Arcade, Versus, Training).

**Rendering:** Zwei überlagerte Canvas-Elemente. `#game-canvas` (2D) zeichnet Arena-Hintergrund, Partikel und Projektile; `#game-canvas-3d` (WebGL via Three.js, transparent) rendert die Kämpfer als echte, beleuchtete 3D-Rigs — die Spiellogik (Positionen, Hitboxes, Physik) bleibt vollständig 2D, nur die Darstellung der Figuren ist 3D. Three.js liegt als einzelne vendorte Datei unter `js/vendor/three.module.min.js` (MIT-Lizenz, siehe `js/vendor/THREE_LICENSE.txt`), per Import Map eingebunden — kein Build-Schritt, kein npm-Install zur Laufzeit nötig.

Acht Kämpfer, drei Rig-Typen (`js/core/Renderer3D.js` wählt je Charakter über `charData.rigKind` aus):

| Rig-Typ | Kämpfer | Funktionsweise |
|---|---|---|
| **procedural** (Standard) | Varkan, Nyra, Kael, Morvan | Reine Kapsel-/Kugel-Primitive, komplett zur Laufzeit gebaut (`js/characters/FighterRig3D.js`). |
| **ninja** | Kage | In Blender aus Primitiven modelliertes GLB (`models/ninja.glb`), farblich an `avatar-pics/` angelehnt. Statische Körperteile, an benannten Pivot-Objekten (`legLPivot`, `armFrontPivot`, …) aufgehängt — nutzt dieselbe `poseRig()`-Logik wie die prozeduralen Figuren (`js/characters/NinjaRig3D.js`). |
| **skeletal** | Cassius, Brannok, Solkan | Fertig geriggte, texturierte Low-Poly-Charaktere aus `avatar-templates/` (Army_Free / Skeletons_Free), per Blender zu GLB konvertiert (Textur eingebettet, auf Zielgröße skaliert). Werden über `SkeletonUtils.clone()` instanziiert (normales `Object3D.clone()` verknüpft Skinning-Bone-Referenzen falsch) und per direkter Bone-Rotation (`upper_armL`/`upper_armR`) animiert — kein Baked-Animation-Klip nötig (`js/characters/SkeletalRig3D.js`). |

Alle drei Loader (GLTFLoader, BufferGeometryUtils, SkeletonUtils) liegen als vendorte Dateien unter `js/vendor/`, per Import Map eingebunden — kein Build-Schritt, kein npm-Install zur Laufzeit nötig.

Die Modelle sind reproduzierbar/anpassbar über die Skripte in `tools/` — headless neu bauen z. B. mit:
```bash
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python tools/build_ninja_model.py
```

Animationen, Partikel und Audio werden prozedural erzeugt. Die vier Arena-Hintergründe sind Bilddateien unter `backgrounds/`:

| Arena | Datei |
|---|---|
| Chinatown | `backgrounds/background_chinatown.png` |
| Beach | `backgrounds/background_beach.png` |
| Future City | `backgrounds/background_futurecity.png` |
| Black Mountains | `backgrounds/background_blackmountains.png` |
