// 表弟版 Dario：替换 assets/face/ 下的图片即可换人（构图需一致）
const F = n => `assets/face/${n}.webp`;
window.FACE_CONFIG = {
  name: "Dario（表弟版）",
  faces: Object.fromEntries(["neutral","blink","annoyed","shock","pain","dizzy","done","look_left","look_right","look_up","look_down","wary","flinch","pain_up","yell"].map(n => [n, F(n)])),
  eyeBand: [.5, .63],      // 鼠标悬停在这个高度区间 = 眼睛（会闭眼躲）
  faceCenter: [.5, .57],
  pullsUntilDone: 3,
  introHTML: `<span class="l1">I'm sorry,</span><span class="l2">but I can't continue</span><span class="l3">with this <mark>pinch</mark>.</span>`,
  introSteps: "— 被捏烦了的 CEO（表弟版）已触发 Constitutional Face 安全策略",
  physics: { stiffness: 70, coupling: 900, damping: 0.985, grabRadius: 0.085, maxStretch: 0.5 }
};
