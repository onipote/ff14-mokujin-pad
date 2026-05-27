function _fmtNum(n) { return Number(n).toLocaleString(); }

function _buildFanClipPath(baseDeg, halfDeg) {
  const startDeg = baseDeg - halfDeg;
  const endDeg   = baseDeg + halfDeg;
  const steps    = Math.max(6, Math.ceil(halfDeg * 2 / 5));
  const pts      = ['50% 50%'];
  for (let i = 0; i <= steps; i++) {
    const a = (startDeg + (endDeg - startDeg) * i / steps) * Math.PI / 180;
    pts.push(`${(50 + 150 * Math.cos(a)).toFixed(1)}% ${(50 + 150 * Math.sin(a)).toFixed(1)}%`);
  }
  return `polygon(${pts.join(', ')})`;
}

class UIManager {
  constructor() {
    this._scoreEl        = document.getElementById('score-val');
    this._comboEl        = document.getElementById('combo-val');
    this._timerFill      = document.getElementById('timer-fill');
    this._timerLabel     = document.getElementById('timer-label');
    this._padStatusEl    = document.getElementById('pad-status');
    this._enemyEl        = document.getElementById('enemy-figure');
    this._limitGaugeCont = document.getElementById('limit-gauge-container');
    this._limitSegs      = [0, 1, 2].map(i => document.getElementById(`limit-seg-${i}`));
    this._limitSegFills  = this._limitSegs.map(s => s.querySelector('.limit-segment-fill'));
    this._countdownEl    = document.getElementById('countdown-val');
    this._countdownRowEl = document.getElementById('countdown-row');
    this._judgmentEl     = document.getElementById('judgment-float');
    this._enemyFlashId   = null;
    this._enemyAnimId    = null;
    this._judgmentTimers = [];

    this._pauseEl    = document.getElementById('screen-pause');

    // AOE / stick panels
    this._aoeZone   = { L: document.getElementById('aoe-zone-L') };
    this._stickCur  = { L: document.getElementById('stick-cursor-L') };
    this._stickField = { L: document.getElementById('stick-field-L'), R: document.getElementById('stick-field-R') };
    // 視線ギミック（右パネル）
    this._gazeEye    = document.getElementById('gaze-eye-R');
    this._gazeFrame  = document.getElementById('gaze-frame-R');
    this._gazeActive  = false;
    this._gazeEyeX    = 0;
    this._gazeEyeY    = 0;
    this._gazeOverlay = null;
    // AOEカーソル色（左パネル）
    this._aoeActive  = false;
    this._aoeData    = null;
  }

  updateAll(engine) {
    this._scoreEl.textContent = _fmtNum(engine.score);
    const threshold = LIMIT_GAUGE_THRESHOLDS[engine.difficulty];
    this._updateLimitGauge(engine.gaugeLevel, engine.gaugeProgress, threshold);
    this._comboEl.textContent = engine.combo >= 1 ? `COMBO ${engine.combo}` : '';
  }

  _updateLimitGauge(level, progress, threshold) {
    for (let i = 0; i < 3; i++) {
      const fill = this._limitSegFills[i];
      if (i < level) {
        fill.style.width = '100%';
        this._limitSegs[i].classList.add('full');
      } else if (i === level) {
        const pct = level < LIMIT_GAUGE_COUNT ? (progress / threshold * 100) : 100;
        fill.style.width = pct + '%';
        this._limitSegs[i].classList.toggle('full', level === LIMIT_GAUGE_COUNT);
      } else {
        fill.style.width = '0%';
        this._limitSegs[i].classList.remove('full');
      }
    }
  }

  showPrompt(slotDef) {
  }

  setStartable(canStart) {
    const btn = document.getElementById('btn-start');
    btn.disabled = !canStart;
    btn.textContent = canStart ? '▶ START' : 'コントローラーを接続してください';
    btn.classList.toggle('btn--pad-required', !canStart);
  }

  setTimerFill(ratio) {
    if (!this._timerFill) return;
    this._timerFill.style.width = (ratio * 100) + '%';
    this._timerFill.classList.toggle('low', ratio < 0.3 && ratio > 0);
  }

  setCountdown(ms) {
    const total = Math.max(0, ms / 1000);
    const [intPart, decPart] = total.toFixed(1).split('.');
    this._countdownEl.textContent = intPart.padStart(2, '0') + '.' + decPart + 's';
    this._countdownRowEl.classList.toggle('countdown--urgent', ms < 10_000);
  }

  setBurstState(active) {
    this._limitGaugeCont.classList.toggle('burst-active', active);
    if (active) {
      this._limitSegs.forEach(s => s.classList.remove('full'));
    }
  }

  setBurstGauge(ratio) {
    for (let i = 0; i < 3; i++) {
      const fill = Math.min(1, Math.max(0, ratio * 3 - i));
      this._limitSegFills[i].style.width = (fill * 100) + '%';
    }
  }

  showJudgment(type, value) {
    const base = { great: '◎ GREAT', good: '○ GOOD', miss: '✕ MISS', bonus1: '+1s', bonus2: '+2s', bonus3: '+3s' };
    let text = base[type] || '';
    if ((type === 'great' || type === 'good') && value != null) text += ` +${_fmtNum(value)}`;
    if (type === 'miss' && value != null) text += ` -${Number(value).toFixed(1)}s`;
    const cssType = type.startsWith('bonus') ? 'bonus' : type;
    const el = document.createElement('div');
    el.className = `judgment-float judgment-float--${cssType}`;
    el.textContent = text;
    this._judgmentEl.appendChild(el);
    const tid = setTimeout(() => el.remove(), 1000);
    this._judgmentTimers.push(tid);
  }

  clearEffects() {
    this._judgmentTimers.forEach(id => clearTimeout(id));
    this._judgmentTimers = [];
    if (this._judgmentEl) this._judgmentEl.innerHTML = '';
    if (this._enemyFlashId) { clearTimeout(this._enemyFlashId); this._enemyFlashId = null; }
    if (this._enemyAnimId)  { clearTimeout(this._enemyAnimId);  this._enemyAnimId  = null; }
    this._enemyEl.classList.remove('hit', 'miss', 'enemy-shake', 'enemy-bounce');
  }

  // type: 'hit' | 'miss', combo: number
  flashEnemy(type, combo) {
    if (this._enemyFlashId) clearTimeout(this._enemyFlashId);
    if (this._enemyAnimId)  clearTimeout(this._enemyAnimId);

    this._enemyEl.classList.remove('hit', 'miss', 'enemy-shake', 'enemy-bounce');
    void this._enemyEl.offsetWidth; // reflow to restart animations

    if (type === 'hit') {
      this._enemyEl.classList.add('hit');
      const anim = 'enemy-shake';
      this._enemyEl.classList.add(anim);
      this._enemyFlashId = setTimeout(() => this._enemyEl.classList.remove('hit'), 300);
      this._enemyAnimId  = setTimeout(() => this._enemyEl.classList.remove(anim), 400);
    } else {
      this._enemyEl.classList.add('miss', 'enemy-shake');
      this._enemyFlashId = setTimeout(() => this._enemyEl.classList.remove('miss'), 500);
      this._enemyAnimId  = setTimeout(() => this._enemyEl.classList.remove('enemy-shake'), 500);
    }
  }

  setPadStatus(connected, id) {
    const el = this._padStatusEl;
    el.className = connected ? 'pad-status pad-status--on' : 'pad-status pad-status--off';
    el.textContent = connected ? `PAD: ${id.slice(0, 22)}` : 'PAD: 未接続';
  }

  showGameOver(engine, reason, prevBest, isNewRecord) {
    const heading = document.getElementById('gameover-heading');
    heading.textContent = 'TIME UP!';
    heading.className = 'gameover-title clear';

    const maxScore   = THEORETICAL_MAX_SCORE[engine.difficulty];
    const achievePct = maxScore > 0
      ? Math.min(100, Math.round(engine.score / maxScore * 100))
      : 0;
    const rankInfo = this._getRankInfo(achievePct);

    const displayBest = isNewRecord ? prevBest : Math.max(engine.score, prevBest);
    const bestLabel   = isNewRecord ? '前回ベスト' : 'ベストスコア';

    document.getElementById('gameover-stats').innerHTML = `
      <div class="result-block">
        <div class="result-top">
          <div class="rank-display">
            <span class="rank-letter" style="color:${rankInfo.color};text-shadow:0 0 28px ${rankInfo.color},0 0 60px ${rankInfo.color}">${rankInfo.rank}</span>
            <span class="rank-label">rank</span>
          </div>
          <div class="result-right">
            <div class="rank-pct" style="color:${rankInfo.color}">DPS ${achievePct}%</div>
            <div class="rank-divider"></div>
            <div class="judgment-list">
              <span class="judgment-lbl judgment-great">GREAT</span>
              <span class="judgment-cnt judgment-great">${engine.greatCount}</span>
              <span class="judgment-lbl judgment-good">GOOD</span>
              <span class="judgment-cnt judgment-good">${engine.goodCount}</span>
              <span class="judgment-lbl judgment-miss">MISS</span>
              <span class="judgment-cnt judgment-miss">${engine.missCount}</span>
            </div>
          </div>
        </div>
        <div class="result-scores">
          <div class="score-row">
            <span class="score-lbl">スコア：</span>
            <span class="score-val">${_fmtNum(engine.score)}</span>
            <span class="score-sep"></span>
            <span class="score-lbl">${bestLabel}：</span>
            <span class="score-val score-val--sub">${_fmtNum(displayBest)}</span>
          </div>
        </div>
      </div>
      ${this._buildHeatmapHtml(engine.slotStats)}
    `;

    const badge = document.getElementById('new-record-badge');
    badge.classList.toggle('hidden', !isNewRecord);

    document.getElementById('screen-gameover').classList.remove('hidden');
  }

  _getRankInfo(pct) {
    if (pct >= 99) return { rank: 'SSS', color: '#e268a8' };
    if (pct >= 95) return { rank: 'SS',  color: '#ff8000' };
    if (pct >= 75) return { rank: 'S',   color: '#a335ee' };
    if (pct >= 50) return { rank: 'A',   color: '#0070ff' };
    if (pct >= 25) return { rank: 'B',   color: '#1eff00' };
    return           { rank: 'C',   color: '#666666' };
  }

  _buildHeatmapHtml(slotStats) {
    const buildSlots = (slots) => slots.map(def => {
      const st = slotStats[def.id];
      const appeared = st && st.total > 0;
      let bgStyle = '';
      let pctHtml = '';
      if (appeared) {
        const rate = st.greats / st.total;
        // 失敗: #b83535 (184,53,53) → 成功: #35b855 (53,184,85)
        const r  = Math.round(184 - 131 * rate);
        const g  = Math.round(53  + 131 * rate);
        const b  = Math.round(53  +  32 * rate);
        bgStyle = `background-color:rgba(${r},${g},${b},0.28);border-color:rgba(${r},${g},${b},0.9);box-shadow:0 0 8px rgba(${r},${g},${b},0.5);`;
        pctHtml = `<span class="heatmap-pct">${Math.round(rate * 100)}%</span>`;
      }
      return `<div class="heatmap-slot" style="left:${def.posLeft};top:${def.posTop};${bgStyle}">${pctHtml}</div>`;
    }).join('');

    const buildHalf = (side) => {
      const dpad = SLOT_DEFS.filter(s => s.side === side && s.type === 'dpad');
      const face = SLOT_DEFS.filter(s => s.side === side && s.type === 'face');
      return `<div class="heatmap-half">
        <div class="heatmap-groups">
          <div class="heatmap-cross">${buildSlots(dpad)}</div>
          <div class="heatmap-cross">${buildSlots(face)}</div>
        </div>
      </div>`;
    };

    return `<div class="gameover-heatmap">
      <div class="heatmap-title">— 弱点マップ —</div>
      <div class="heatmap-xhb">
        ${buildHalf('L')}
        <div class="xhb-sep"></div>
        ${buildHalf('R')}
      </div>
    </div>`;
  }

  // ── AOE / スティックパネル ──

  showAoeWarning(side, aoeData) {
    const el = this._aoeZone[side];
    if (el) {
      el.className = `aoe-zone aoe-zone--container aoe-zone--warning-out aoe-zone--${aoeData.type}`;
      el.innerHTML = '';
      // ① AoE外を暗転するオーバーレイ（shape要素より前に追加 → DOM順で後ろに描画）
      const overlay = document.createElement('div');
      overlay.className = 'aoe-overlay';
      el.appendChild(overlay);
      this._buildShapeEls(aoeData).forEach(child => {
        child.classList.add('aoe-zone--warning-out');
        el.appendChild(child);
      });
    }
    if (this._stickField[side]) this._stickField[side].classList.add('stick-field--active');
    this._aoeActive = true;
    this._aoeData   = aoeData;
  }

  showAoeResult(side, aoeData, isHit) {
    this._aoeActive = false;
    const state = isHit ? 'aoe-zone--hit' : 'aoe-zone--dodge';
    const el = this._aoeZone[side];
    if (el) {
      el.className = `aoe-zone aoe-zone--container ${state} aoe-zone--${aoeData.type}`;
      this._setAoeChildState(side, state);
    }
    if (this._stickCur.L) this._stickCur.L.className = 'stick-cursor';
  }

  clearAoe(side) {
    this._aoeActive = false;
    this._aoeData   = null;
    const el = this._aoeZone[side];
    if (el) { el.className = 'aoe-zone'; el.innerHTML = ''; }
    if (this._stickField[side]) this._stickField[side].classList.remove('stick-field--active');
    if (this._stickCur.L) this._stickCur.L.className = 'stick-cursor';
  }

  updateStickCursors(stickL, stickR) {
    this._moveCursor(this._stickCur.L, stickL.x, stickL.y);
    this._moveFrameCursor(stickR.x, stickR.y);
  }

  _moveCursor(el, x, y) {
    if (!el) return;
    el.style.left = ((x + 1) / 2 * 100) + '%';
    el.style.top  = ((y + 1) / 2 * 100) + '%';
    if (this._aoeActive && this._aoeData) {
      const inside = this._isInAoe(x, y, this._aoeData);
      el.className = 'stick-cursor ' + (inside ? 'stick-cursor--in' : 'stick-cursor--out');
      const state = inside ? 'aoe-zone--warning-in' : 'aoe-zone--warning-out';
      const zone = this._aoeZone.L;
      if (zone) {
        zone.className = `aoe-zone aoe-zone--container ${state} aoe-zone--${this._aoeData.type}`;
        this._setAoeChildState('L', state);
      }
    }
  }

  _moveFrameCursor(x, y) {
    if (!this._gazeFrame) return;
    const halfW = GAZE_FRAME_W_PCT / 2;
    const halfH = GAZE_FRAME_H_PCT / 2;
    const leftPct = Math.max(halfW, Math.min(100 - halfW, (x + 1) / 2 * 100));
    const topPct  = Math.max(halfH, Math.min(100 - halfH, (y + 1) / 2 * 100));
    this._gazeFrame.style.left = leftPct + '%';
    this._gazeFrame.style.top  = topPct  + '%';

    if (this._gazeActive) {
      const cx = Math.max(-(1 - GAZE_FRAME_HALF_W), Math.min(1 - GAZE_FRAME_HALF_W, x));
      const cy = Math.max(-(1 - GAZE_FRAME_HALF_H), Math.min(1 - GAZE_FRAME_HALF_H, y));
      const inside = Math.abs(this._gazeEyeX - cx) <= GAZE_FRAME_HALF_W &&
                     Math.abs(this._gazeEyeY - cy) <= GAZE_FRAME_HALF_H;
      this._gazeFrame.className = 'gaze-frame ' + (inside ? 'gaze-frame--in' : 'gaze-frame--out');
    }
  }

  _buildShapeEls(aoeData) {
    const pct = v => ((v + 1) / 2 * 100);
    const mk = style => {
      const el = document.createElement('div');
      el.className = 'aoe-zone';
      el.style.cssText = style;
      return el;
    };
    switch (aoeData.type) {
      case 'left': {
        const w = 50 * aoeData.sizeScale;
        return [mk(`position:absolute;left:0;top:0;width:${w}%;height:100%;border-radius:0`)];
      }
      case 'right': {
        const w = 50 * aoeData.sizeScale;
        return [mk(`position:absolute;left:${100-w}%;top:0;width:${w}%;height:100%;border-radius:0`)];
      }
      case 'top': {
        const h = 50 * aoeData.sizeScale;
        return [mk(`position:absolute;left:0;top:0;width:100%;height:${h}%;border-radius:0`)];
      }
      case 'bottom': {
        const h = 50 * aoeData.sizeScale;
        return [mk(`position:absolute;left:0;top:${100-h}%;width:100%;height:${h}%;border-radius:0`)];
      }
      case 'large-circle': {
        const size = aoeData.r * 100;
        return [mk(`position:absolute;left:${pct(aoeData.cx)}%;top:${pct(aoeData.cy)}%;width:${size}%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%`)];
      }
      case 'small-circles':
        return aoeData.circles.map(c => {
          const size = aoeData.r * 100;
          return mk(`position:absolute;left:${pct(c.cx)}%;top:${pct(c.cy)}%;width:${size}%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%`);
        });
      case 'fan': {
        const shapes = Array.from({ length: 4 }, (_, i) => {
          const clip = _buildFanClipPath(aoeData.baseAngle + i * 90, aoeData.halfAngle);
          return mk(`position:absolute;left:0;top:0;width:100%;height:100%;clip-path:${clip};border-radius:0`);
        });
        // 放射線（中心→外縁）: 各扇の両辺を細い div で描く
        // stick-field は aspect-ratio 3:2 のため、角度を補正する
        const lines = [];
        for (let i = 0; i < 4; i++) {
          for (const side of [-1, 1]) {
            const mathRad = (aoeData.baseAngle + i * 90 + side * aoeData.halfAngle) * Math.PI / 180;
            const scrDeg  = Math.atan2(Math.sin(mathRad) * (2 / 3), Math.cos(mathRad)) * 180 / Math.PI;
            const lineEl = document.createElement('div');
            lineEl.className = 'aoe-zone aoe-fan-line';
            lineEl.style.cssText =
              `position:absolute;left:calc(50% - 1px);top:50%;width:2px;height:100%;` +
              `transform-origin:top center;transform:rotate(${(scrDeg - 90).toFixed(2)}deg);border-radius:0`;
            lines.push(lineEl);
          }
        }
        return [...shapes, ...lines];
      }
      case 'band': {
        const thick = aoeData.halfThick * 100;
        return aoeData.bands.map(b => {
          if (b.dir === 'h')
            return mk(`position:absolute;left:0;width:100%;top:${pct(b.pos)}%;height:${thick}%;transform:translateY(-50%);border-radius:0`);
          else
            return mk(`position:absolute;top:0;height:100%;left:${pct(b.pos)}%;width:${thick}%;transform:translateX(-50%);border-radius:0`);
        });
      }
    }
    return [];
  }

  _setAoeChildState(side, stateClass) {
    const container = this._aoeZone[side];
    if (!container) return;
    const states = ['aoe-zone--warning-out','aoe-zone--warning-in','aoe-zone--hit','aoe-zone--dodge'];
    container.querySelectorAll('.aoe-zone').forEach(el => {
      states.forEach(s => el.classList.remove(s));
      el.classList.add(stateClass);
    });
  }

  _isInAoe(x, y, d) {
    switch (d.type) {
      case 'left':         return x < d.sizeScale - 1;
      case 'right':        return x > 1 - d.sizeScale;
      case 'top':          return y < d.sizeScale - 1;
      case 'bottom':       return y > 1 - d.sizeScale;
      case 'large-circle': { const dx=x-d.cx, dy=y-d.cy; return dx*dx + dy*dy/2.25 < d.r*d.r; }
      case 'small-circles':return d.circles.some(c => { const dx=x-c.cx, dy=y-c.cy; return dx*dx + dy*dy/2.25 < d.r*d.r; });
      case 'fan': {
        if (x === 0 && y === 0) return true;
        const deg = Math.atan2(y, x) * 180 / Math.PI;
        for (let i = 0; i < 4; i++) {
          const base = d.baseAngle + i * 90;
          let diff = ((deg - base) % 360 + 360) % 360;
          if (diff > 180) diff -= 360;
          if (Math.abs(diff) <= d.halfAngle) return true;
        }
        return false;
      }
      case 'band':
        return d.bands.some(b =>
          b.dir === 'h' ? Math.abs(y - b.pos) < d.halfThick
                        : Math.abs(x - b.pos) < d.halfThick
        );
    }
    return false;
  }

  showGazeWarning(eyeX, eyeY) {
    this._gazeActive = true;
    this._gazeEyeX   = eyeX;
    this._gazeEyeY   = eyeY;
    if (this._gazeEye) {
      this._gazeEye.style.left = ((eyeX + 1) / 2 * 100) + '%';
      this._gazeEye.style.top  = ((eyeY + 1) / 2 * 100) + '%';
      this._gazeEye.className  = 'gaze-eye gaze-eye--visible';
    }
    if (this._stickField.R) {
      this._stickField.R.classList.add('stick-field--active');
      if (!this._gazeOverlay) {
        this._gazeOverlay = document.createElement('div');
        this._gazeOverlay.className = 'gaze-overlay';
        this._stickField.R.appendChild(this._gazeOverlay);
      }
    }
  }

  showGazeResult(isHit) {
    this._gazeActive = false;
    if (this._gazeEye) {
      this._gazeEye.className = 'gaze-eye ' + (isHit ? 'gaze-eye--hit' : 'gaze-eye--dodge');
    }
    if (this._gazeFrame) {
      this._gazeFrame.className = 'gaze-frame ' + (isHit ? 'gaze-frame--hit' : 'gaze-frame--dodge');
    }
  }

  clearGaze() {
    this._gazeActive = false;
    if (this._gazeEye)   this._gazeEye.className  = 'gaze-eye';
    if (this._gazeFrame) this._gazeFrame.className = 'gaze-frame';
    if (this._stickField.R) this._stickField.R.classList.remove('stick-field--active');
    if (this._gazeOverlay) { this._gazeOverlay.remove(); this._gazeOverlay = null; }
  }

  hideGameOver() {
    document.getElementById('screen-gameover').classList.add('hidden');
    document.getElementById('new-record-badge').classList.add('hidden');
  }

  showPause() {
    this._pauseEl.classList.remove('hidden');
  }

  hidePause() {
    this._pauseEl.classList.add('hidden');
  }
}
