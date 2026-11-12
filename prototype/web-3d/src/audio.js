// prototype/web-3d/src/audio.js — procedural wind and footsteps (WebAudio, no assets).
// Wind is information here: it rises with weather severity before the fog closes in.

export function createAudio() {
  let ctx = null;
  let windGain = null;
  let windFilter = null;
  let howlGain = null;
  let howlFilter = null;
  let master = null;
  let noiseBuffer = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
    } catch (_) {
      return false;
    }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);

    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.04 * white) / 1.04; // brown-ish
      data[i] = last * 3.2;
    }
    const mk = () => {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;
      src.start();
      return src;
    };
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 420;
    windGain = ctx.createGain();
    windGain.gain.value = 0.05;
    mk().connect(windFilter).connect(windGain).connect(master);

    howlFilter = ctx.createBiquadFilter();
    howlFilter.type = 'bandpass';
    howlFilter.frequency.value = 620;
    howlFilter.Q.value = 6;
    howlGain = ctx.createGain();
    howlGain.gain.value = 0;
    mk().connect(howlFilter).connect(howlGain).connect(master);
    return true;
  }

  return {
    /** Must be called from a user gesture. */
    start() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    update(wind, gust) {
      if (!ctx) return;
      const now = ctx.currentTime;
      const w = Math.max(0, Math.min(1.3, wind));
      windGain.gain.setTargetAtTime(0.03 + w * 0.34, now, 0.4);
      windFilter.frequency.setTargetAtTime(260 + w * 900, now, 0.4);
      howlGain.gain.setTargetAtTime(Math.max(0, w - 0.45) * 0.3 * (0.4 + gust * 0.6), now, 0.5);
      howlFilter.frequency.setTargetAtTime(480 + gust * 420 + w * 180, now, 0.6);
    },
    step(intensity = 1, snow = false) {
      if (!ctx || muted) return;
      const now = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      src.playbackRate.value = snow ? 2.4 : 3.6 + Math.random();
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = snow ? 900 : 1700 + Math.random() * 500;
      f.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.16 * intensity, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, now + (snow ? 0.16 : 0.09));
      src.connect(f).connect(g).connect(master);
      src.start(now, Math.random() * 2);
      src.stop(now + 0.25);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05);
      return muted;
    },
    get muted() { return muted; },
  };
}
