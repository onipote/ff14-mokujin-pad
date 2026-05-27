class SoundManager {
  constructor() {
    this._ctx = null;
    this.muted = false;
  }

  _ctx_get() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Master limiter: prevents clipping when multiple oscillators overlap
      this._limiter = this._ctx.createDynamicsCompressor();
      this._limiter.threshold.value = -3;
      this._limiter.knee.value      = 0;
      this._limiter.ratio.value     = 20;
      this._limiter.attack.value    = 0.001;
      this._limiter.release.value   = 0.1;
      this._limiter.connect(this._ctx.destination);
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
      gain.connect(this._limiter);

      osc.type      = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

      gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } catch (_) {}
  }

  playHit(combo, judgment = 'great', burst = false) {
    const base = 440 + Math.min(combo - 1, 9) * 40;
    if (judgment === 'great') {
      const vol = burst ? 0.24 : 0.20;
      this._beep(base,       'sine', 0.10, vol);
      this._beep(base * 1.5, 'sine', 0.08, vol * 0.55, 0.05);
      if (burst) {
        this._beep(base * 0.5, 'sine', 0.07, 0.14, 0.01);  // bass octave
        this._beep(base * 2,   'sine', 0.05, 0.12, 0.02);  // octave up
        this._beep(base * 3,   'sine', 0.03, 0.07, 0.04);  // sparkle harmonic
      }
    } else {
      this._beep(base * 0.9, 'sine', 0.08, burst ? 0.17 : 0.14);
      if (burst) {
        this._beep(base * 1.35, 'sine', 0.07, 0.11, 0.04);
      }
    }
  }

  playMiss() {
    this._beep(160, 'sawtooth', 0.18, 0.09);
    this._beep(110, 'sawtooth', 0.22, 0.07, 0.10);
  }

  // type: 'gauge' (ゲージ完成) | 'burst' (バースト発動)
  playCombo(type) {
    if (type === 'gauge') {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => this._beep(f, 'sine', 0.12, 0.15, i * 0.07));
    } else if (type === 'burst') {
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((f, i) => this._beep(f, 'sine', 0.14, 0.18, i * 0.06));
    }
  }

  playGaugeMax() {
    const notes = [784, 1047, 1319, 1568];
    notes.forEach((f, i) => this._beep(f, 'sine', 0.18, 0.22, i * 0.03));
    this._beep(1568, 'sine', 0.28, 0.12, 0.14);
  }

  playBurstStart() {
    // Bright ascending arpeggio (extended)
    const notes = [523, 659, 784, 1047, 1319, 1568, 2093];
    notes.forEach((f, i) => this._beep(f, 'sine', 0.14, 0.22, 0.14 + i * 0.045));
  }

  playBurstEnd() {
    // Descending resolution fanfare
    const notes = [2093, 1568, 1047, 784, 523];
    notes.forEach((f, i) => this._beep(f, 'sine', 0.12, 0.16, i * 0.06));
  }

  playGameOver() {
    const notes = [392, 349, 330, 294]; // G4 F4 E4 D4 descending
    notes.forEach((f, i) => this._beep(f, 'triangle', 0.20, 0.14, i * 0.14));
  }

  playClear() {
    const notes = [523, 659, 784, 1047, 1319]; // C5 E5 G5 C6 E6
    notes.forEach((f, i) => this._beep(f, 'sine', 0.15, 0.16, i * 0.09));
  }

  playGateJoined() {
    // 三連符の1・2音目を鳴らし3音目は休符 × 3
    [0, 0.45, 0.90].forEach(t => {
      this._beep(440, 'sine', 0.13, 0.13, t);        // 1音目
      this._beep(440, 'sine', 0.10, 0.10, t + 0.15); // 2音目（スタッカート）
      // 3音目（t+0.30）は休符
    });
  }
}
