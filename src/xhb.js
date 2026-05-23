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

    el.appendChild(sym);
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
  }

  clearAllStates() {
    Object.values(this.slots).forEach(el => {
      el.className = 'xhb-slot';
    });
    this.setHalfActive(null);
  }
}
