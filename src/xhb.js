class XHBRenderer {
  constructor() {
    this.slots = {};
  }

  build() {
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
    el.style.gridColumn = def.gridCol;
    el.style.gridRow    = def.gridRow;

    const sym = document.createElement('span');
    sym.className   = 'slot-sym';
    sym.textContent = def.sym;

    el.appendChild(sym);
    return el;
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
  }
}
