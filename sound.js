/* Synthesized sound effects (Web Audio, no audio files). */
window.SFX = (() => {
  let ac = null, master, creak, creakGain, creakFilter, lfo, on = localStorage.getItem('pmf-sound') !== 'off';
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ac = new AC(); master = ac.createGain(); master.gain.value = on ? 0.9 : 0; master.connect(ac.destination);
    // continuous rubber creak while stretching
    creak = ac.createOscillator(); creak.type = 'sawtooth'; creak.frequency.value = 140;
    creakFilter = ac.createBiquadFilter(); creakFilter.type = 'bandpass'; creakFilter.Q.value = 6; creakFilter.frequency.value = 700;
    creakGain = ac.createGain(); creakGain.gain.value = 0;
    lfo = ac.createOscillator(); lfo.frequency.value = 28; const lg = ac.createGain(); lg.gain.value = 40; lfo.connect(lg); lg.connect(creak.frequency);
    creak.connect(creakFilter); creakFilter.connect(creakGain); creakGain.connect(master); creak.start(); lfo.start();
    return true;
  }
  const noise = (dur) => { const b = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); s.buffer = b; return s; };
  function grab() {
    if (!init()) return; const t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(1100, t + 0.07);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.15);
    const n = noise(0.05), f = ac.createBiquadFilter(), ng = ac.createGain(); f.type = 'highpass'; f.frequency.value = 2500; ng.gain.value = 0.12;
    n.connect(f); f.connect(ng); ng.connect(master); n.start(t);
  }
  function stretch(len, speed) {
    if (!ac) return; const t = ac.currentTime;
    creak.frequency.setTargetAtTime(110 + len * 420, t, 0.03);
    creakFilter.frequency.setTargetAtTime(500 + len * 2200, t, 0.03);
    creakGain.gain.setTargetAtTime(Math.min(0.22, speed * 0.9) * (len > 0.02 ? 1 : 0), t, 0.04);
  }
  function stopStretch() { if (ac) creakGain.gain.setTargetAtTime(0, ac.currentTime, 0.02); }
  function release(amount) {
    if (!init()) return; stopStretch(); const t = ac.currentTime, a = Math.min(1, amount / 0.4);
    if (a < 0.05) return;
    // slap
    const n = noise(0.08), lp = ac.createBiquadFilter(), ng = ac.createGain(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    ng.gain.setValueAtTime(0.5 * a + 0.1, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    n.connect(lp); lp.connect(ng); ng.connect(master); n.start(t);
    // boing: pitch drop + decaying vibrato
    const o = ac.createOscillator(), g = ac.createGain(), v = ac.createOscillator(), vg = ac.createGain(), dur = 0.5 + a * 0.5;
    o.type = 'triangle'; o.frequency.setValueAtTime(260 + a * 260, t); o.frequency.exponentialRampToValueAtTime(110, t + dur);
    v.frequency.setValueAtTime(14, t); v.frequency.linearRampToValueAtTime(7, t + dur);
    vg.gain.setValueAtTime(60 * a + 15, t); vg.gain.exponentialRampToValueAtTime(1, t + dur);
    v.connect(vg); vg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4 * a + 0.1, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); v.start(t); o.stop(t + dur + 0.05); v.stop(t + dur + 0.05);
  }
  function toggle() { on = !on; localStorage.setItem('pmf-sound', on ? 'on' : 'off'); if (on) init(); if (master) master.gain.setTargetAtTime(on ? 0.9 : 0, ac.currentTime, 0.02); return on; }
  return { grab, stretch, stopStretch, release, toggle, get on() { return on; } };
})();
