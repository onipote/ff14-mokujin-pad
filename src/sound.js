class SoundManager {
  constructor() {
    this._ctx = null;
    this.muted = false;
    this._rhythmId    = null;
    this._rhythmBeat  = 0;
    this._rhythmBurst = false;
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
    this._beep(160, 'triangle', 0.18, 0.09);
    this._beep(110, 'triangle', 0.22, 0.07, 0.10);
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

  playChestOpen() {
    this._beep(880,  'sine', 0.18, 0.10, 0.00);
    this._beep(1318, 'sine', 0.14, 0.08, 0.05);
  }

  playGimmickSuccess() {
    this._beep(523, 'sine', 0.15, 0.20, 0.00);
    this._beep(659, 'sine', 0.15, 0.20, 0.08);
    this._beep(784, 'sine', 0.20, 0.22, 0.16);
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

  playTimeUpJingle() {
    if (this.muted) return;
    const v = 0.20;
    // ファンファーレ: タタタ（G4×3）→ 上昇（C5-E5-G5）→ フィナーレ（C6+コード）
    this._beep(392,  'sine', 0.07, v,        0.00); // G4
    this._beep(392,  'sine', 0.07, v,        0.09); // G4
    this._beep(392,  'sine', 0.07, v,        0.18); // G4
    this._beep(523,  'sine', 0.11, v,        0.29); // C5
    this._beep(659,  'sine', 0.11, v,        0.42); // E5
    this._beep(784,  'sine', 0.14, v,        0.55); // G5
    this._beep(1047, 'sine', 0.70, v + 0.04, 0.72); // C6 メロディ頂点
    this._beep(784,  'sine', 0.65, v * 0.80, 0.72); // G5
    this._beep(659,  'sine', 0.60, v * 0.72, 0.72); // E5
    this._beep(523,  'sine', 0.58, v * 0.68, 0.72); // C5
    this._beep(262,  'sine', 0.52, v * 0.65, 0.72); // C4 低音ルート
  }

  startRhythm(isBurst) {
    this.stopRhythm();
    // 8分音符単位: 通常 140BPM=214ms/step、バースト 175BPM=171ms/step
    const stepMs = Math.round(60000 / ((isBurst ? 175 : 140) * 2));
    this._rhythmBeat = 0;
    this._rhythmBurst = isBurst;

    // [freq, type, dur, vol] の配列 or null（休符）
    // 通常: キック(1,3拍) + スネア風(2,4拍) + ウォーキングベース
    const normPattern = [
      [[65,'sine',0.18,0.072],[131,'sine',0.14,0.040]],          // 0: C2+C3 キック（1拍）
      [[6400,'square',0.014,0.016]],                              // 1: ハイハット裏
      [[196,'sine',0.14,0.055]],                                  // 2: G3 ベース
      [[200,'triangle',0.06,0.058]],                              // 3: スネア風（2拍）
      [[65,'sine',0.16,0.060],[174,'sine',0.14,0.048]],           // 4: キック+F3（3拍）
      [[6400,'square',0.014,0.014]],                              // 5: ハイハット裏
      [[233,'sine',0.14,0.050]],                                  // 6: Bb3 ベース
      [[200,'triangle',0.06,0.058]],                              // 7: スネア風（4拍）
    ];
    // バースト: より速く高音・スネアも強め
    const burstPattern = [
      [[73,'sine',0.16,0.095],[147,'sine',0.12,0.052]],           // 0: D2+D3 キック（1拍）
      [[220,'sine',0.09,0.042]],                                  // 1: A3 フィル
      [[131,'sine',0.13,0.070]],                                  // 2: C3 ベース
      [[220,'triangle',0.06,0.065]],                              // 3: スネア風（2拍）
      [[73,'sine',0.14,0.068],[196,'sine',0.13,0.060]],           // 4: キック+G3（3拍）
      [[220,'sine',0.09,0.040]],                                  // 5: A3 フィル
      [[220,'sine',0.13,0.065]],                                  // 6: A3 ベース
      [[220,'triangle',0.06,0.065]],                              // 7: スネア風（4拍）
    ];
    const pattern = isBurst ? burstPattern : normPattern;

    const fire = () => {
      const notes = pattern[this._rhythmBeat % 8];
      if (notes) notes.forEach(([f, t, d, v]) => this._beep(f, t, d, v));
      this._rhythmBeat++;
    };
    fire();
    this._rhythmId = setInterval(fire, stepMs);
  }

  resumeRhythm(isBurst, savedBeat) {
    this.stopRhythm();
    const stepMs = Math.round(60000 / ((isBurst ? 175 : 140) * 2));
    this._rhythmBeat  = savedBeat || 0;
    this._rhythmBurst = isBurst;
    const normPattern = [
      [[65,'sine',0.18,0.072],[131,'sine',0.14,0.040]],
      [[6400,'square',0.014,0.016]],
      [[196,'sine',0.14,0.055]],
      [[200,'triangle',0.06,0.058]],
      [[65,'sine',0.16,0.060],[174,'sine',0.14,0.048]],
      [[6400,'square',0.014,0.014]],
      [[233,'sine',0.14,0.050]],
      [[200,'triangle',0.06,0.058]],
    ];
    const burstPattern = [
      [[73,'sine',0.16,0.095],[147,'sine',0.12,0.052]],
      [[220,'sine',0.09,0.042]],
      [[131,'sine',0.13,0.070]],
      [[220,'triangle',0.06,0.065]],
      [[73,'sine',0.14,0.068],[196,'sine',0.13,0.060]],
      [[220,'sine',0.09,0.040]],
      [[220,'sine',0.13,0.065]],
      [[220,'triangle',0.06,0.065]],
    ];
    const pattern = isBurst ? burstPattern : normPattern;
    const fire = () => {
      const notes = pattern[this._rhythmBeat % 8];
      if (notes) notes.forEach(([f, t, d, v]) => this._beep(f, t, d, v));
      this._rhythmBeat++;
    };
    this._rhythmId = setInterval(fire, stepMs);
  }

  stopRhythm() {
    if (this._rhythmId !== null) {
      clearInterval(this._rhythmId);
      this._rhythmId = null;
    }
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
