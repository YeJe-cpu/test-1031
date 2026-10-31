# Pull my face 🖐️

A personal homepage where visitors can grab and stretch your face.
Pure HTML/CSS/JS + WebGL. No build step, no dependencies.

Live: https://yeje-cpu.github.io/test-1031/

## How it works
- **Mesh warp**: the portrait is a 65×65 vertex grid rendered with WebGL (`face.js`).
- **Skin physics**: every vertex is a spring (`stiffness`) coupled to its neighbours (`coupling`), so a pull spreads like a wave and jiggles back on release.
- **Shading**: per-vertex strain brightens stretched skin.
- **Head sway**: the head (not the shoulders) tilts and shifts toward the pull.
- **Sound**: synthesized in `sound.js` with Web Audio (grab pop, rubber creak while stretching, slap + boing on release). Toggle 🔊 in the nav.
- **Gaze**: when the fist is near (not touching), he watches it: looks left/right/up/down, gets nervous when it gets close, flinches when you hover his eyes.
- **Poke**: a quick click is a poke — he winces and the skin ripples.
- **Direction-aware pain**: pull up → wide-eyed wince, pull down or too far → yells, sideways → grimace.
- **Expressions**: hover → annoyed, grab → shock, pull → pain, let go → dizzy, 3 pulls → unimpressed + headline turns into "Hey! I'm …". Random blinks when idle.

## Use your own face
1. Prepare 7 square, transparent-background photos with identical framing (head centered, shoulders at the bottom, ~768×768):
   `neutral, blink, annoyed, shock, pain, dizzy, done`
2. Overwrite the files in `assets/face/` (or change paths in `config.js`).
3. Change `name` in `config.js` and the text in `index.html`.

Tip: shoot all expressions on a green wall without moving the camera, then remove the background.

## Tuning
All physics knobs live in `config.js` → `physics`.

## Run locally
```
python3 -m http.server
```
then open http://localhost:8000
