// ============================================================
//  所有可替换内容都在这里：换脸只需替换 assets/face/ 下的 7 张图
//  （同名覆盖即可），或改下面的路径。图片要求：正方形、透明背景、
//  头部居中、各表情构图一致（建议 768×768 PNG/WebP）。
// ============================================================
window.FACE_CONFIG = {
  name: "Leo",
  faces: {
    neutral: "assets/face/neutral.webp", // 默认
    blink:   "assets/face/blink.webp",   // 眨眼（空闲时随机出现）
    annoyed: "assets/face/annoyed.webp", // 悬停：嫌弃侧目
    shock:   "assets/face/shock.webp",   // 刚被抓住：吓一跳
    pain:    "assets/face/pain.webp",    // 拉扯中：龇牙喊疼
    dizzy:   "assets/face/dizzy.webp",   // 松手后：晕乎乎
    done:    "assets/face/done.webp",    // 连续被拉 3 次：彻底无语
    // ---- 可选（缺了会自动退回上面的基础表情）----
    look_left:  "assets/face/look_left.webp",  // 拳头在左边：盯着看
    look_right: "assets/face/look_right.webp", // 拳头在右边
    look_up:    "assets/face/look_up.webp",    // 拳头在上方
    look_down:  "assets/face/look_down.webp",  // 拳头在下方
    wary:       "assets/face/wary.webp",       // 拳头靠近脸：紧张
    flinch:     "assets/face/flinch.webp",     // 戳一下 / 悬停在眼睛上：闭眼躲
    pain_up:    "assets/face/pain_up.webp",    // 往上拉
    yell:       "assets/face/yell.webp"        // 往下拉 / 拉太远：大叫
  },
  pullsUntilDone: 3,
  // 物理参数（想更软 / 更弹可以调这里）
  physics: {
    stiffness: 70,     // 回弹力度
    coupling: 900,     // 皮肤波动传播强度
    damping: 0.985,    // 阻尼（越接近 1 抖得越久）
    grabRadius: 0.085, // 抓取影响半径（相对图片宽度）
    maxStretch: 0.5    // 最大拉伸距离（相对图片宽度）
  }
};
