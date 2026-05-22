class SoundManager {
  constructor() {
    this._ctx = null;
    this.muted = false;
  }

  _ctx_get() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  // freq: Hz, type: OscillatorType, dur: seconds, vol: 0-1
  _beep(freq, type, dur, vol = 0.18, delay = 0) {
    if (this.muted) return;
    try {
      const ctx  = this._ctx_get();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type      = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

      gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur);
    } catch (_) {}
  }

  playHit(combo) {
    // Base hit tone; pitch climbs with combo
    const base = 440 + Math.min(combo - 1, 9) * 40;
    this._beep(base,       'sine',     0.10, 0.20);
    this._beep(base * 1.5, 'sine',     0.08, 0.10, 0.06);
  }

  playMiss() {
    this._beep(160, 'sawtooth', 0.18, 0.14);
    this._beep(110, 'sawtooth', 0.22, 0.10, 0.10);
  }

  playCombo(n) {
    // Fanfare on multiples of 5 (capped at MAX_COMBO_MULTIPLIER)
    if (n % 5 !== 0) return;
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((f, i) => this._beep(f, 'sine', 0.12, 0.15, i * 0.07));
  }

  playGameOver() {
    const notes = [392, 349, 330, 294]; // G4 F4 E4 D4 descending
    notes.forEach((f, i) => this._beep(f, 'triangle', 0.20, 0.14, i * 0.14));
  }

  playClear() {
    const notes = [523, 659, 784, 1047, 1319]; // C5 E5 G5 C6 E6
    notes.forEach((f, i) => this._beep(f, 'sine', 0.15, 0.16, i * 0.09));
  }
}
