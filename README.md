# ARENA PULSE

Ein düsterer 2D-Arena-Fighter (Vanilla JS, HTML5 Canvas, WebAudio) — eigenständige IP, keine Verbindung zu bestehenden Fighting-Game-Marken.

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

Siehe `js/` — modular aufgeteilt in `core` (State, Loop, Rendering, Input, Audio, Storage), `characters` (Datenmodell + Laufzeit-Fighter), `combat` (Hit-Resolution, Combo-Tracking), `ai` (Gegner-KI), `arenas` (Arena-Hintergründe), `fx` (Partikel, Kamera-Shake/Hitstop), `ui` (Menüs, HUD, Touch-Controls) und `modes` (Quick Fight, Arcade, Versus, Training).

Charaktere, Animationen, Partikel und Audio werden prozedural erzeugt (Vektorformen auf Canvas, WebAudio-Synthese). Die vier Arena-Hintergründe sind Bilddateien unter `backgrounds/`:

| Arena | Datei |
|---|---|
| Chinatown | `backgrounds/background_chinatown.png` |
| Beach | `backgrounds/background_beach.png` |
| Future City | `backgrounds/background_futurecity.png` |
| Black Mountains | `backgrounds/background_blackmountains.png` |
