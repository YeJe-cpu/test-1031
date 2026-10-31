(() => {
  const $ = id => document.getElementById(id);
  const store = JSON.parse(localStorage.getItem('dario-pinch') || '{"pull":0,"poke":0,"throw":0,"msgs":[]}');
  const save = () => localStorage.setItem('dario-pinch', JSON.stringify(store));
  // sound toggle
  const sb = $('snd'); const upd = () => sb.textContent = SFX.on ? '🔊' : '🔇'; upd(); sb.onclick = () => { SFX.toggle(); upd(); };

  // ---- Responsible Pinching Policy meter ----
  const LV = [
    [0, 'ASL-1', '基本无害。目前只是被盯着看。'],
    [3, 'ASL-2', '出现早期风险信号：脸部有轻微形变。'],
    [10, 'ASL-3', '形变能力显著提升，建议启动额外防护措施。'],
    [25, 'ASL-4', '已具备“把 CEO 捏成表情包”的危险能力。董事会紧急开会中。'],
    [50, 'ASL-5', '全面失控。表弟决定改行做 OpenAI CEO。']
  ];
  function render(bump) {
    const score = store.pull * 1 + store.poke * 0.5 + store.throw * 1.5;
    let i = 0; while (i + 1 < LV.length && score >= LV[i + 1][0]) i++;
    const lo = LV[i][0], hi = (LV[i + 1] || [lo + 50])[0];
    $('aslLevel').textContent = LV[i][1]; $('aslText').textContent = LV[i][2];
    $('aslFill').style.width = Math.min(100, (i + (score - lo) / (hi - lo)) / LV.length * 100 + 4) + '%';
    $('nPull').textContent = store.pull; $('nPoke').textContent = store.poke; $('nThrow').textContent = store.throw;
    if (bump) { const a = $('asl'); a.classList.remove('bump'); void a.offsetWidth; a.classList.add('bump'); }
  }
  addEventListener('face:pull', () => { store.pull++; save(); render(true); });
  addEventListener('face:poke', () => { store.poke++; save(); render(true); });
  render();

  // ---- danmaku ----
  const seed = ['什么时候对中国开放？', '我的号又没了', '芯片还我', 'Claude 真好用，就是用不了', '表弟加油', '捏一下解解气', 'Pro 会员退钱！', '求不封号'];
  const dm = $('danmaku'); let lane = 0;
  function bullet(text, mine) {
    const b = document.createElement('div'); b.className = 'bullet'; b.textContent = text;
    if (mine) { b.style.background = 'var(--accent)'; b.style.color = '#fff'; b.style.borderColor = 'transparent'; }
    const h = dm.clientHeight, L = lane++ % 6, top = L < 3 ? 70 + L * 34 : h - 40 - (L - 3) * 34; b.style.top = top + 'px'; b.style.left = '100%';
    b.style.animationDuration = (9 + Math.random() * 6) + 's'; dm.appendChild(b);
    b.addEventListener('animationend', () => b.remove());
  }
  const pool = () => seed.concat(store.msgs);
  const isMine = t => store.msgs.includes(t);
  setInterval(() => { if (!document.hidden && dm.childElementCount < 7) { const p = pool(), t = p[Math.floor(Math.random() * p.length)]; bullet(t, isMine(t)); } }, 2200);
  setTimeout(() => bullet(seed[0]), 400);

  // ---- throw a message at his face ----
  function throwMsg(text, fromEl) {
    if (!text) return;
    const r = fromEl.getBoundingClientRect(); const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
    const stage = $('stage').getBoundingClientRect();
    const needScroll = stage.bottom < 0 || stage.top > innerHeight;
    const go = () => {
      const tu = .4 + Math.random() * .2, tv = (FACE_CONFIG.faceCenter || [.5, .5])[1] + (Math.random() - .5) * .12;
      const [tx, ty] = window.__face.faceScreenPoint(tu, tv);
      const m = document.createElement('div'); m.className = 'missile'; m.textContent = text; document.body.appendChild(m);
      const fr = needScroll ? [innerWidth * .2, innerHeight * 1.1] : [sx, sy];
      const t0 = performance.now(), dur = 650;
      (function anim(now) {
        const k = Math.min(1, (now - t0) / dur), e = k * k * (3 - 2 * k);
        const x = fr[0] + (tx - fr[0]) * e, y = fr[1] + (ty - fr[1]) * e - Math.sin(k * Math.PI) * 160;
        m.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${k * 540}deg) scale(${1 - k * .5})`;
        if (k < 1) return requestAnimationFrame(anim);
        m.remove(); window.__face.hitAt(tx, ty, 1.6);
        const b = document.createElement('div'); b.className = 'boom'; b.textContent = '💥'; b.style.left = tx + 'px'; b.style.top = ty + 'px'; document.body.appendChild(b); setTimeout(() => b.remove(), 650);
        setTimeout(() => bullet(text, true), 300);
      })(t0);
      store.throw++; save(); render(true);
    };
    if (needScroll) { scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(go, 650); } else go();
  }
  document.querySelectorAll('.throw').forEach(b => b.addEventListener('click', () => throwMsg(b.dataset.msg, b)));
  const mine = $('mine');
  const showMine = () => { mine.innerHTML = ''; store.msgs.slice(-20).reverse().forEach(t => { const li = document.createElement('li'); li.textContent = t; mine.appendChild(li); }); };
  showMine();
  $('say').addEventListener('submit', e => {
    e.preventDefault(); const inp = $('msg'); const t = inp.value.trim(); if (!t) return;
    store.msgs.push(t); store.msgs = store.msgs.slice(-50); save(); showMine(); throwMsg(t, inp); inp.value = '';
  });
})();
