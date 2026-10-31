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

## /dario/ — 表弟版 Dario（恶搞页）
`dario/` 复用同一套 `face.js` + `sound.js`，只换了 `dario/config.js` 和表情图：
- 捏 / 戳 / 砸留言都会推高 “Responsible Pinching Policy” 的 ASL 等级
- 吐槽卡片“替网友捏一下”和留言框：文字会飞过去砸在脸上，再变成弹幕（存在访客自己的浏览器 localStorage）
- 被拉 3 次后标题变成 “I'm sorry, but I can't continue with this pinch.”

## 版本 / 回退
- `v1-base` 初版
- `v2-reactions` 音效 + 盯拳头 / 戳脸 / 方向表情
- `v3-dario` 新增 /dario/ 页面
回退示例：`git checkout v1-base -- .`
