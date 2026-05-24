class XHBRenderer {
  constructor() {
    this.slots  = {};
    this.halves = {};
  }

  build() {
    this.halves.L = document.getElementById('xhb-half-L');
    this.halves.R = document.getElementById('xhb-half-R');

    ['L', 'R'].forEach(side => {
      ['dpad', 'face'].forEach(type => {
        const container = document.getElementById(`xhb-${side}-${type}`);
        SLOT_DEFS
          .filter(s => s.side === side && s.type === type)
          .forEach(def => {
            const el = this._createSlot(def);
            container.appendChild(el);
            this.slots[def.id] = el;
          });
      });
    });
  }

  _createSlot(def) {
    const el = document.createElement('div');
    el.className = 'xhb-slot';
    el.id = `slot-${def.id}`;
    el.style.left = def.posLeft;
    el.style.top  = def.posTop;

    const sym = document.createElement('span');
    sym.className   = 'slot-sym';
    sym.textContent = def.sym;

    const recast = document.createElement('div');
    recast.className = 'slot-recast';

    const recastNum = document.createElement('span');
    recastNum.className = 'slot-recast-num';

    const sectorSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sectorSvg.setAttribute('class', 'slot-recast-sector');
    sectorSvg.setAttribute('viewBox', '0 0 44 44');
    const sectorPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    sectorPath.setAttribute('class', 'recast-sector-path');
    sectorSvg.appendChild(sectorPath);

    el.appendChild(sym);
    el.appendChild(recast);
    el.appendChild(recastNum);
    el.appendChild(sectorSvg);
    return el;
  }

  // side: 'L' | 'R' | null
  setHalfActive(side) {
    Object.entries(this.halves).forEach(([s, el]) => {
      if (el) el.classList.toggle('xhb-half--active', s === side);
    });
  }

  // state: 'default' | 'active' | 'success' | 'fail'
  setSlotState(slotId, state) {
    const el = this.slots[slotId];
    if (!el) return;
    el.className = 'xhb-slot' + (state && state !== 'default' ? ` xhb-slot--${state}` : '');
    el.querySelector('.slot-recast')?.style.setProperty('--recast-pct', '0');
    const numEl = el.querySelector('.slot-recast-num');
    if (numEl) numEl.textContent = '';
    el.querySelector('.recast-sector-path')?.setAttribute('d', '');
  }

  // elapsedRatio: 0.0=開始 → 1.0=完了, remainingMs: 残りミリ秒
  setSlotRecast(slotId, elapsedRatio, remainingMs) {
    const el = this.slots[slotId];
    if (!el) return;
    const recastEl = el.querySelector('.slot-recast');
    if (recastEl) {
      if (elapsedRatio >= 1) {
        recastEl.style.display = 'none';
      } else {
        recastEl.style.display = '';
        recastEl.style.setProperty('--recast-pct', elapsedRatio.toFixed(4));
      }
    }
    const numEl = el.querySelector('.slot-recast-num');
    if (numEl) numEl.textContent = elapsedRatio >= 1 ? '' : (remainingMs / 1000).toFixed(1);
    this._updateSectorBorder(el, elapsedRatio);
  }

  _updateSectorBorder(el, elapsedRatio) {
    const path = el.querySelector('.recast-sector-path');
    if (!path) return;
    if (elapsedRatio <= 0 || elapsedRatio >= 1) {
      path.setAttribute('d', '');
      return;
    }
    const cx = 22, cy = 22, r = 19;
    const angle = elapsedRatio * 2 * Math.PI;
    const ex = cx + r * Math.sin(angle);
    const ey = cy - r * Math.cos(angle);
    const largeArc = elapsedRatio > 0.5 ? 1 : 0;
    path.setAttribute('d',
      `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${ex.toFixed(2)} ${ey.toFixed(2)} Z`
    );
  }

  // 入力拒否時の白フラッシュ（早押し・誤ボタン共通）
  setSlotFlash(slotId) {
    const el = this.slots[slotId];
    if (!el) return;
    el.classList.add('xhb-slot--flash');
    setTimeout(() => el.classList.remove('xhb-slot--flash'), 300);
  }

  clearAllStates() {
    Object.values(this.slots).forEach(el => {
      el.className = 'xhb-slot';
      el.querySelector('.slot-recast')?.style.setProperty('--recast-pct', '0');
      const numEl = el.querySelector('.slot-recast-num');
      if (numEl) numEl.textContent = '';
      el.querySelector('.recast-sector-path')?.setAttribute('d', '');
    });
    this.setHalfActive(null);
  }
}
