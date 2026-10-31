/* Pull-my-face: WebGL mesh warp + spring/wave skin physics + expression states. No dependencies. */
(() => {
  const C = window.FACE_CONFIG, P = C.physics;
  const canvas = document.getElementById('face');
  const stage = document.getElementById('stage');
  const hero = document.querySelector('.hero');
  const hand = document.getElementById('hand');
  const steps = document.getElementById('steps');
  const headline = document.getElementById('headline');
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: true, alpha: true });
  if (!gl) { document.documentElement.classList.add('nogl'); return; }

  // ---------- geometry: image space [0,1]^2, canvas covers [-0.4, 1.4] ----------
  const PAD = 0.4, SPAN = 1 + 2 * PAD;
  const N = 64, NV = (N + 1) * (N + 1), H = 1 / N;
  const base = new Float32Array(NV * 2), disp = new Float32Array(NV * 2), vel = new Float32Array(NV * 2);
  const shade = new Float32Array(NV), w = new Float32Array(NV);
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const k = j * (N + 1) + i; base[2*k] = i * H; base[2*k+1] = j * H; }
  const idx = new Uint16Array(N * N * 6); let q = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
    idx.set([a, b, c, b, d, c], q); q += 6;
  }

  // ---------- shaders ----------
  const vs = `attribute vec2 aPos;attribute vec2 aDisp;attribute float aShade;
  uniform float uRot;uniform vec2 uPivot;uniform vec2 uOff;varying vec2 vUv;varying float vShade;
  void main(){float hw=1.-smoothstep(.5,.88,aPos.y);vec2 p=aPos+aDisp-uPivot;float c=cos(uRot*hw),s=sin(uRot*hw);p=vec2(c*p.x-s*p.y,s*p.x+c*p.y)+uPivot+uOff*hw;
  vec2 n=(p+${PAD.toFixed(2)})/${SPAN.toFixed(2)};gl_Position=vec4(n.x*2.-1.,1.-n.y*2.,0.,1.);vUv=aPos;vShade=aShade;}`;
  const fs = `precision mediump float;uniform sampler2D uA;uniform sampler2D uB;uniform float uMix;varying vec2 vUv;varying float vShade;
  void main(){vec4 c=mix(texture2D(uA,vUv),texture2D(uB,vUv),uMix);
  float d=distance(vUv,vec2(.5,.55));float m=vUv.y<.55?1.:1.-smoothstep(.455,.462,d);c*=m;
  c.rgb*=1.+vShade*.22; c.rgb+=vec3(.06,.03,.02)*max(vShade,0.)*c.a; gl_FragColor=c;}`;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(o); return o; };
  const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog); gl.useProgram(prog);
  const buf = (data, name, size, usage) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, usage); const l = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0); return b; };
  buf(base, 'aPos', 2, gl.STATIC_DRAW);
  const dispBuf = buf(disp, 'aDisp', 2, gl.DYNAMIC_DRAW), shadeBuf = buf(shade, 'aShade', 1, gl.DYNAMIC_DRAW);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  const U = n => gl.getUniformLocation(prog, n);
  const uRot = U('uRot'), uPivot = U('uPivot'), uOff = U('uOff'), uMix = U('uMix');
  gl.uniform1i(U('uA'), 0); gl.uniform1i(U('uB'), 1); gl.uniform2f(uPivot, 0.5, 0.92);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  // ---------- textures ----------
  const tex = {}; let hitMap = null;
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  const load = (name, src) => new Promise(res => { const im = new Image(); im.onload = () => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
    for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    tex[name] = t;
    if (name === 'neutral') { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 128, 128); hitMap = x.getImageData(0, 0, 128, 128).data; }
    res();
  }; im.onerror = res; im.src = src; });

  // ---------- expressions ----------
  let cur = 'neutral', prev = 'neutral', mix = 1;
  const pick = (...names) => names.find(n => tex[n]) || 'neutral';
  function setExpr(n) { if (n === cur || !tex[n]) return; prev = mix > 0.5 ? cur : prev; cur = n; mix = 0; }

  // ---------- interaction state ----------
  let state = 'idle', grabbing = false, hovering = false, inHero = false, pokeUntil = 0, gazeRot = 0;
  let grabPt = [0, 0], mouse = [0, 0], D = [0, 0], maxPull = 0, pulls = 0, intro = false;
  let letgoUntil = 0, doneUntil = 0, nextBlink = performance.now() + 2500, blinkUntil = 0, grabAt = 0;
  let rot = 0, rotV = 0, off = [0, 0], offV = [0, 0];

  const toImg = (x, y) => { const r = canvas.getBoundingClientRect(); return [-PAD + SPAN * (x - r.left) / r.width, -PAD + SPAN * (y - r.top) / r.height]; };
  function hit(p) {
    if (!hitMap || p[0] < 0 || p[0] >= 1 || p[1] < 0 || p[1] >= 1) return false;
    if (p[1] > .55 && Math.hypot(p[0] - .5, p[1] - .55) > .455) return false;
    return hitMap[(Math.floor(p[1] * 128) * 128 + Math.floor(p[0] * 128)) * 4 + 3] > 120;
  }
  function setStep(s) { steps.querySelectorAll('span').forEach(e => e.classList.toggle('on', e.dataset.s === s)); }

  addEventListener('pointermove', e => {
    mouse = toImg(e.clientX, e.clientY);
    if (!grabbing) hand.style.transform = `translate(${e.clientX}px,${e.clientY}px) translate(-50%,-50%)`;
    hovering = hit(mouse);
    const hr = hero.getBoundingClientRect();
    inHero = e.clientX >= hr.left && e.clientX <= hr.right && e.clientY >= hr.top && e.clientY <= hr.bottom;
    hand.classList.toggle('show', inHero || grabbing);
    hero.classList.toggle('hovering', inHero || grabbing);
  }, { passive: true });
  addEventListener('pointerdown', e => {
    const p = toImg(e.clientX, e.clientY); mouse = p;
    if (!hit(p)) return;
    e.preventDefault();
    grabbing = true; grabPt = p; maxPull = 0; grabAt = performance.now();
    const s2 = 2 * P.grabRadius * P.grabRadius;
    for (let k = 0; k < NV; k++) { const dx = base[2*k] + disp[2*k] - p[0], dy = base[2*k+1] + disp[2*k+1] - p[1]; w[k] = Math.exp(-(dx*dx + dy*dy) / s2); }
    // the grabbed point should be the CURRENT deformed position; re-center on rest pos
    hand.textContent = '✊'; hand.classList.add('show'); window.SFX && SFX.grab();
    hand.style.transform = `translate(${e.clientX}px,${e.clientY}px) translate(-50%,-50%)`;
  });
  const release = () => {
    if (!grabbing) return; grabbing = false; hand.textContent = '🖐️';
    const now = performance.now();
    if (now - grabAt < 230 && maxPull < 0.03) { // quick tap = poke / slap
      pokeUntil = now + 750; window.SFX && SFX.poke && SFX.poke();
      for (let k = 0; k < NV; k++) { if (w[k] < 0.01) continue; const dx = base[2*k] - grabPt[0], dy = base[2*k+1] - grabPt[1], r = Math.hypot(dx, dy) + 1e-3; vel[2*k] += dx / r * w[k] * 0.9; vel[2*k+1] += dy / r * w[k] * 0.9; }
      rotV += (grabPt[0] < 0.5 ? 1 : -1) * 0.9;
      return;
    }
    window.SFX && SFX.release(maxPull);
    if (maxPull > 0.06) pulls++;
    if (pulls >= C.pullsUntilDone) { pulls = 0; doneUntil = now + 2600; if (!intro) showIntro(); }
    letgoUntil = now + 1500;
  };
  addEventListener('pointerup', release); addEventListener('pointercancel', release); addEventListener('blur', release);

  function showIntro() {
    intro = true;
    headline.classList.add('swap');
    headline.innerHTML = `<span class="l1">Hey!</span><span class="l2">I'm <mark>${C.name}</mark></span><span class="l3" style="font-size:.38em;letter-spacing:-.01em;font-weight:500;margin-top:.6em">I make small, useful software.</span>`;
    steps.innerHTML = 'Pull responsibly.';
  }

  // ---------- physics ----------
  function step(dt) {
    const k = P.stiffness, c = P.coupling, damp = P.damping, G = 2600, R = N + 1;
    if (grabbing) {
      let dx = mouse[0] - grabPt[0], dy = mouse[1] - grabPt[1];
      const len = Math.hypot(dx, dy), L = P.maxStretch;
      if (len > 1e-5) { const s = L * Math.tanh(len / L) / len; dx *= s; dy *= s; }
      D = [dx, dy]; maxPull = Math.max(maxPull, Math.hypot(dx, dy));
    }
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const kk = j * R + i, x = 2 * kk;
      let lx = 0, ly = 0, n = 0;
      if (i > 0) { lx += disp[x-2]; ly += disp[x-1]; n++; }
      if (i < N) { lx += disp[x+2]; ly += disp[x+3]; n++; }
      if (j > 0) { lx += disp[x-2*R]; ly += disp[x-2*R+1]; n++; }
      if (j < N) { lx += disp[x+2*R]; ly += disp[x+2*R+1]; n++; }
      lx -= n * disp[x]; ly -= n * disp[x+1];
      let ax = -k * disp[x] + c * lx, ay = -k * disp[x+1] + c * ly;
      let d = damp;
      if (grabbing && w[kk] > 0.01) { const ww = w[kk]; ax += G * ww * (ww * D[0] - disp[x]); ay += G * ww * (ww * D[1] - disp[x+1]); d *= 1 - 0.08 * ww; }
      vel[x] = (vel[x] + ax * dt) * d; vel[x+1] = (vel[x+1] + ay * dt) * d;
    }
    for (let x = 0; x < NV * 2; x++) disp[x] += vel[x] * dt;
    // head sway springs
    const tr = grabbing ? Math.max(-.14, Math.min(.14, D[0] * .28 * (grabPt[1] < .8 ? 1 : .3))) : gazeRot;
    rotV += ((tr - rot) * 90 - rotV * 7) * dt; rot += rotV * dt;
    for (let a = 0; a < 2; a++) { const t = grabbing ? D[a] * .07 : 0; offV[a] += ((t - off[a]) * 110 - offV[a] * 8) * dt; off[a] += offV[a] * dt; }
  }
  function computeShade() {
    const R = N + 1;
    for (let j = 1; j < N; j++) for (let i = 1; i < N; i++) {
      const kk = j * R + i, x = 2 * kk;
      const dudx = (disp[x+2] - disp[x-2]) / (2 * H), dvdy = (disp[x+2*R+1] - disp[x-2*R+1]) / (2 * H);
      const dudy = (disp[x+2*R] - disp[x-2*R]) / (2 * H), dvdx = (disp[x+3] - disp[x-1]) / (2 * H);
      const stretch = Math.sqrt(dudx*dudx + dvdy*dvdy + dudy*dudy + dvdx*dvdx);
      // light from top-left: surfaces facing it brighten, others darken
      const facing = -(dudx + dvdy) * 0.5 + (dvdx - dudy) * 0.15;
      shade[kk] = Math.max(-.7, Math.min(.7, stretch * 0.18 + facing * 0.12));
    }
  }

  // ---------- loop ----------
  function resize() { const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); const W = Math.round(r.width * dpr), Hh = Math.round(r.height * dpr); if (canvas.width !== W || canvas.height !== Hh) { canvas.width = W; canvas.height = Hh; } gl.viewport(0, 0, canvas.width, canvas.height); }
  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; acc += dt;
    while (acc > 1 / 120) { step(1 / 120); acc -= 1 / 120; }
    computeShade();
    if (grabbing) { // keep the fist glued to the stretched skin tip
      const r = canvas.getBoundingClientRect(), tx = grabPt[0] + D[0] + off[0], ty = grabPt[1] + D[1] + off[1];
      hand.style.transform = `translate(${r.left + (tx + PAD) / SPAN * r.width}px,${r.top + (ty + PAD) / SPAN * r.height}px) translate(-50%,-50%)`;
    }

    // expression + step logic
    let s, e;
    const pullLen = Math.hypot(D[0], D[1]);
    if (grabbing && window.SFX) { SFX.stretch(pullLen, Math.abs(pullLen - (frame.pl || 0)) / Math.max(dt, 1e-3)); frame.pl = pullLen; }
    gazeRot = 0;
    if (grabbing) {
      const early = now - grabAt < 280 && pullLen < .05; s = pullLen > .03 ? 'pull' : 'grab';
      const ax = Math.abs(D[0]);
      if (early || pullLen < .03) e = 'shock';
      else if (pullLen > .33) e = pick('yell', 'pain');            // pulled way too far
      else if (D[1] < -0.7 * ax) e = pick('pain_up', 'pain');       // pulled upward
      else if (D[1] > 0.7 * ax) e = pick('yell', 'pain');           // pulled downward
      else e = 'pain';                                               // pulled sideways
    }
    else if (now < pokeUntil) { s = 'grab'; e = pick('flinch', 'shock'); }
    else if (now < doneUntil) { s = 'letgo'; e = 'done'; }
    else if (now < letgoUntil) { s = 'letgo'; e = 'dizzy'; }
    else if (hovering) { s = 'hover'; e = (mouse[1] > .3 && mouse[1] < .45) ? pick('flinch', 'annoyed') : 'annoyed'; }
    else {
      s = ''; e = 'neutral';
      if (inHero) { // watch the fist
        const dx = mouse[0] - .5, dy = mouse[1] - .42, d = Math.hypot(dx, dy);
        gazeRot = Math.max(-.035, Math.min(.035, dx * .03));
        if (d < .55) e = pick('wary', 'annoyed');
        else if (Math.abs(dx) > Math.abs(dy) * 0.8) e = pick(dx < 0 ? 'look_left' : 'look_right', 'neutral');
        else e = pick(dy < 0 ? 'look_up' : 'look_down', 'neutral');
      }
      if (now > nextBlink) { blinkUntil = now + 140; nextBlink = now + 2200 + Math.random() * 3800; }
      if (now < blinkUntil && (e === 'neutral' || !inHero)) e = 'blink';
    }
    if (s !== state) { state = s; if (!intro) setStep(s); }
    setExpr(e);
    mix = Math.min(1, mix + dt / 0.09);

    resize();
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, dispBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, disp);
    gl.bindBuffer(gl.ARRAY_BUFFER, shadeBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, shade);
    const breathe = Math.sin(now / 900) * 0.003;
    gl.uniform1f(uRot, rot + Math.sin(now / 1700) * 0.006); gl.uniform2f(uOff, off[0], off[1] + breathe);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[prev] || tex.neutral);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[cur] || tex.neutral);
    gl.uniform1f(uMix, mix);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    requestAnimationFrame(frame);
  }
  load('neutral', C.faces.neutral).then(() => {
    requestAnimationFrame(frame);
    Object.entries(C.faces).forEach(([n, src]) => n !== 'neutral' && load(n, src));
  });
  window.__face = { get state() { return { state, cur, pulls, intro }; } };
})();
