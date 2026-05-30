// 宝箱SVG（閉じた状態：teal/cyan色系、ぼんやり発光）
const _STK_CHEST_CLOSED_SVG = `<svg viewBox="-20 -20 40 40" width="60" height="60" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 0 6px rgba(160,220,255,0.7)) drop-shadow(0 0 14px rgba(100,180,255,0.4))">
  <rect x="-14" y="-4" width="28" height="14" rx="1.5" fill="rgba(100,180,255,0.08)" stroke="#a0e8f8" stroke-width="1.8"/>
  <rect x="-14" y="-14" width="28" height="11" rx="1.5" fill="rgba(100,180,255,0.06)" stroke="#a0e8f8" stroke-width="1.8"/>
  <rect x="-3.5" y="-6.5" width="7" height="5.5" rx="1" fill="none" stroke="#a0e8f8" stroke-width="1.6"/>
  <line x1="-14" y1="-3.5" x2="14" y2="-3.5" stroke="#a0e8f8" stroke-width="1.2" opacity="0.5"/>
</svg>`;

// 宝箱SVG（開いた状態：黄金色、輝き演出）
const _STK_CHEST_OPEN_SVG = `<svg viewBox="-20 -20 40 40" width="60" height="60" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 0 8px rgba(255,215,0,0.9)) drop-shadow(0 0 18px rgba(255,180,0,0.6))">
  <rect x="-14" y="0" width="28" height="14" rx="1.5" fill="rgba(255,210,0,0.12)" stroke="#ffe080" stroke-width="1.8"/>
  <rect x="-14" y="-14" width="28" height="11" rx="1.5" fill="rgba(255,210,0,0.08)" stroke="#ffe080" stroke-width="1.8" transform="rotate(-45 -14 -3.5)"/>
  <circle cx="0" cy="6" r="4.5" fill="rgba(255,220,80,0.35)" stroke="none"/>
  <line x1="0" y1="-16" x2="0" y2="-12" stroke="#ffe080" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="11" y1="-13" x2="9" y2="-10" stroke="#ffe080" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="-11" y1="-13" x2="-9" y2="-10" stroke="#ffe080" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="15" y1="-6" x2="12" y2="-4" stroke="#ffe080" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="-15" y1="-6" x2="-12" y2="-4" stroke="#ffe080" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

function _fmtNum(n) { return Number(n).toLocaleString(); }

function _buildFanClipPath(baseDeg, halfDeg, cx = 0, cy = 0) {
  const startDeg = baseDeg - halfDeg;
  const endDeg   = baseDeg + halfDeg;
  const steps    = Math.max(6, Math.ceil(halfDeg * 2 / 5));
  const cxPct    = (cx + 1) / 2 * 100;
  const cyPct    = (cy + 1) / 2 * 100;
  const pts      = [`${cxPct.toFixed(1)}% ${cyPct.toFixed(1)}%`];
  for (let i = 0; i <= steps; i++) {
    const a = (startDeg + (endDeg - startDeg) * i / steps) * Math.PI / 180;
    pts.push(`${(cxPct + 150 * Math.cos(a)).toFixed(1)}% ${(cyPct + 150 * Math.sin(a)).toFixed(1)}%`);
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
    // 宝箱ギミック（右パネル）
    this._stkFrame      = document.getElementById('stk-frame-R');
    this._stkChest      = document.getElementById('stk-chest-R');
    this._stkDirection  = document.getElementById('stk-direction-R');
    this._stkActive     = false;
    this._stkMarkerX    = 0;
    this._stkMarkerY    = 0;
    this._stkChestOpened = false;
    this._worldOffsetX  = 0;
    this._worldOffsetY  = 0;
    this._stkOverlay    = null;
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

  resetLimitGaugeInstant() {
    this._limitGaugeCont.classList.remove('burst-active');
    this._limitSegFills.forEach((f, i) => {
      f.style.transition = 'none';
      f.style.width = '0%';
      this._limitSegs[i].classList.remove('full');
    });
    this._limitSegFills[0].getBoundingClientRect(); // force reflow to commit styles before restoring transition
    this._limitSegFills.forEach(f => { f.style.transition = ''; });
  }

  resetHUDForStart() {
    this._scoreEl.textContent = '0';
    this._comboEl.textContent = '';
    this.setTimerFill(0);
    this.setCountdown(GAME_DURATION_MS);
    this.resetLimitGaugeInstant();
  }

  resetStickCursors() {
    if (this._stickCur.L) {
      this._stickCur.L.style.left = '50%';
      this._stickCur.L.style.top  = '50%';
      this._stickCur.L.className  = 'stick-cursor';
    }
    if (this._stkFrame) {
      this._stkFrame.style.left = '50%';
      this._stkFrame.style.top  = '50%';
      this._stkFrame.className  = 'stk-frame';
    }
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
    this._moveWorldCursor(stickR.x, stickR.y);
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

  _moveWorldCursor(x, y) {
    this._worldOffsetX = x;
    this._worldOffsetY = y;

    // グリッド背景をスクロール
    const field = this._stickField.R;
    if (field) {
      const W = field.offsetWidth;
      const H = field.offsetHeight;
      const cellW = W * 0.20;
      const cellH = H * 0.30;
      const bpx = ((-x * W / 2) % cellW + cellW) % cellW;
      const bpy = ((-y * H / 2) % cellH + cellH) % cellH;
      field.style.backgroundPosition = `${bpx}px ${bpy}px`;
    }

    if (!this._stkActive) return;

    // 宝箱のスクリーン位置を更新
    const sx = this._stkMarkerX - x;
    const sy = this._stkMarkerY - y;
    if (this._stkChest) {
      this._stkChest.style.left = ((sx + 1) / 2 * 100) + '%';
      this._stkChest.style.top  = ((sy + 1) / 2 * 100) + '%';
    }

    // 連続キャプチャ判定（一度開いたら維持）
    if (!this._stkChestOpened) {
      const captured = Math.abs(sx) <= STK_FRAME_HALF_W &&
                       Math.abs(sy) <= STK_FRAME_HALF_H;
      if (captured) {
        this._stkChestOpened = true;
        if (this._stkChest) {
          this._stkChest.innerHTML = _STK_CHEST_OPEN_SVG;
          this._stkChest.classList.add('stk-chest--opened');
        }
        if (this._stkFrame) {
          this._stkFrame.className = 'stk-frame stk-frame--in';
        }
      }
    }

    // 方向インジケーター更新
    this._updateDirectionIndicator(sx, sy);
  }

  _updateDirectionIndicator(sx, sy) {
    const el = this._stkDirection;
    if (!el) return;
    const onScreen = Math.abs(sx) <= 1 && Math.abs(sy) <= 1;
    if (onScreen || this._stkChestOpened) {
      el.classList.remove('stk-direction--active');
      return;
    }
    el.classList.add('stk-direction--active');
    const scale = Math.max(Math.abs(sx), Math.abs(sy));
    const PADDING = 0.08;
    const ex = Math.max(-1 + PADDING, Math.min(1 - PADDING, sx / scale));
    const ey = Math.max(-1 + PADDING, Math.min(1 - PADDING, sy / scale));
    el.style.left = ((ex + 1) / 2 * 100) + '%';
    el.style.top  = ((ey + 1) / 2 * 100) + '%';
    const angleDeg = Math.atan2(sy, sx) * 180 / Math.PI + 90;
    el.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg)`;
    if (!el.innerHTML) {
      el.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
        <polygon points="7,0 14,14 0,14" fill="rgba(255,215,0,0.9)"
          filter="url(#dir-glow)"/>
        <defs><filter id="dir-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter></defs>
      </svg>`;
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
          const clip = _buildFanClipPath(aoeData.baseAngle + i * 90, aoeData.halfAngle, aoeData.cx, aoeData.cy);
          return mk(`position:absolute;left:0;top:0;width:100%;height:100%;clip-path:${clip};border-radius:0`);
        });
        // 放射線（中心→外縁）: 各扇の両辺を細い div で描く
        // stick-field は aspect-ratio 3:2 のため、角度を補正する
        const cxPct = (aoeData.cx + 1) / 2 * 100;
        const cyPct = (aoeData.cy + 1) / 2 * 100;
        const lines = [];
        for (let i = 0; i < 4; i++) {
          for (const side of [-1, 1]) {
            const mathRad = (aoeData.baseAngle + i * 90 + side * aoeData.halfAngle) * Math.PI / 180;
            const scrDeg  = Math.atan2(Math.sin(mathRad) * (2 / 3), Math.cos(mathRad)) * 180 / Math.PI;
            const lineEl = document.createElement('div');
            lineEl.className = 'aoe-zone aoe-fan-line';
            lineEl.style.cssText =
              `position:absolute;left:calc(${cxPct}% - 1px);top:${cyPct}%;width:2px;height:200%;` +
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
        const dx = x - d.cx;
        const dy = y - d.cy;
        if (dx === 0 && dy === 0) return true;
        const deg = Math.atan2(dy, dx) * 180 / Math.PI;
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

  showStackWarning(markerX, markerY) {
    this._stkActive      = true;
    this._stkMarkerX     = markerX;
    this._stkMarkerY     = markerY;
    this._worldOffsetX   = 0;
    this._worldOffsetY   = 0;
    this._stkChestOpened = false;

    if (this._stkChest) {
      this._stkChest.innerHTML = _STK_CHEST_CLOSED_SVG;
      this._stkChest.className = 'stk-chest stk-chest--active';
      this._stkChest.style.left = ((markerX + 1) / 2 * 100) + '%';
      this._stkChest.style.top  = ((markerY + 1) / 2 * 100) + '%';
    }
    if (this._stkFrame) {
      this._stkFrame.className = 'stk-frame';
    }
    if (this._stickField.R) {
      this._stickField.R.classList.add('stick-field--active');
      if (!this._stkOverlay) {
        this._stkOverlay = document.createElement('div');
        this._stkOverlay.className = 'stk-overlay';
        this._stickField.R.appendChild(this._stkOverlay);
      }
    }
  }

  showStackResult(isHit) {
    this._stkActive = false;
    if (this._stkFrame) {
      this._stkFrame.className = 'stk-frame ' + (isHit ? 'stk-frame--hit' : 'stk-frame--dodge');
    }
  }

  showGimmickSuccess(side) {
    const field = this._stickField[side];
    if (!field) return;
    const el = document.createElement('div');
    el.className = 'gimmick-success';
    el.innerHTML = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(0,255,130,1)" stroke-width="5"/>
      <polyline points="25,52 42,68 75,32" fill="none" stroke="rgba(0,255,130,1)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    field.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 1500);
  }

  clearStack() {
    this._stkActive      = false;
    this._stkChestOpened = false;
    if (this._stkChest)     this._stkChest.className = 'stk-chest';
    if (this._stkDirection) this._stkDirection.classList.remove('stk-direction--active');
    if (this._stkFrame)     this._stkFrame.className  = 'stk-frame';
    if (this._stickField.R) this._stickField.R.classList.remove('stick-field--active');
    if (this._stkOverlay) { this._stkOverlay.remove(); this._stkOverlay = null; }
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
