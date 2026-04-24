// Simple synthesized dice-roll sound via Web Audio API.
// Returns a function playDice() that a component can call on demand.

let ctx = null;
function getCtx() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function playClick(ac, t, volume = 0.6) {
  // Short burst of filtered noise to mimic dice clacking.
  const bufferSize = Math.floor(ac.sampleRate * 0.05);
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const env = Math.exp(-i / (bufferSize * 0.25));
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;

  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 800;

  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2200 + Math.random() * 800;
  bp.Q.value = 1.5;

  const gain = ac.createGain();
  gain.gain.value = volume;

  src.connect(hp);
  hp.connect(bp);
  bp.connect(gain);
  gain.connect(ac.destination);

  src.start(t);
  src.stop(t + 0.08);
}

export function playDiceSound() {
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === 'suspended') {
    try { ac.resume(); } catch { /* ignore */ }
  }
  const t0 = ac.currentTime;
  // A cluster of 4-6 clacks simulating dice tumbling
  const n = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const delay = i * 0.045 + Math.random() * 0.03;
    const vol = 0.35 + Math.random() * 0.3;
    playClick(ac, t0 + delay, vol);
  }
}
