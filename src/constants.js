// Diamond cross positions matching centers at (-1,0)(0,+0.5)(0,-0.5)(1,0)
// (y-up math coords, 1 unit = slot-sz + slot-gap)
// Container: width = 3*slot-sz + 2*gap, height = 2*slot-sz + gap
const _POS = {
  up:    { posLeft: "calc(var(--slot-sz) + var(--slot-gap))",       posTop: "0px" },
  down:  { posLeft: "calc(var(--slot-sz) + var(--slot-gap))",       posTop: "calc(var(--slot-sz) + var(--slot-gap))" },
  left:  { posLeft: "0px",                                          posTop: "calc((var(--slot-sz) + var(--slot-gap)) / 2)" },
  right: { posLeft: "calc((var(--slot-sz) + var(--slot-gap)) * 2)", posTop: "calc((var(--slot-sz) + var(--slot-gap)) / 2)" },
};

const SLOT_DEFS = [
  // Left XHB - D-pad
  { id: "L-up",    side: "L", type: "dpad", sym: "↑", keyLabel: "W",   keyCode: "KeyW",       padTrigger: 6, padBtn: 12, ..._POS.up    },
  { id: "L-down",  side: "L", type: "dpad", sym: "↓", keyLabel: "S",   keyCode: "KeyS",       padTrigger: 6, padBtn: 13, ..._POS.down  },
  { id: "L-left",  side: "L", type: "dpad", sym: "←", keyLabel: "A",   keyCode: "KeyA",       padTrigger: 6, padBtn: 14, ..._POS.left  },
  { id: "L-right", side: "L", type: "dpad", sym: "→", keyLabel: "D",   keyCode: "KeyD",       padTrigger: 6, padBtn: 15, ..._POS.right },
  // Left XHB - Face
  { id: "L-tri",   side: "L", type: "face", sym: "△", keyLabel: "R",   keyCode: "KeyR",       padTrigger: 6, padBtn: 3,  ..._POS.up    },
  { id: "L-sq",    side: "L", type: "face", sym: "□", keyLabel: "F",   keyCode: "KeyF",       padTrigger: 6, padBtn: 2,  ..._POS.left  },
  { id: "L-circ",  side: "L", type: "face", sym: "○", keyLabel: "G",   keyCode: "KeyG",       padTrigger: 6, padBtn: 1,  ..._POS.right },
  { id: "L-cross", side: "L", type: "face", sym: "×", keyLabel: "V",   keyCode: "KeyV",       padTrigger: 6, padBtn: 0,  ..._POS.down  },
  // Right XHB - D-pad
  { id: "R-up",    side: "R", type: "dpad", sym: "↑", keyLabel: "↑",   keyCode: "ArrowUp",    padTrigger: 7, padBtn: 12, ..._POS.up    },
  { id: "R-down",  side: "R", type: "dpad", sym: "↓", keyLabel: "↓",   keyCode: "ArrowDown",  padTrigger: 7, padBtn: 13, ..._POS.down  },
  { id: "R-left",  side: "R", type: "dpad", sym: "←", keyLabel: "←",   keyCode: "ArrowLeft",  padTrigger: 7, padBtn: 14, ..._POS.left  },
  { id: "R-right", side: "R", type: "dpad", sym: "→", keyLabel: "→",   keyCode: "ArrowRight", padTrigger: 7, padBtn: 15, ..._POS.right },
  // Right XHB - Face
  { id: "R-tri",   side: "R", type: "face", sym: "△", keyLabel: "KP8", keyCode: "Numpad8",    padTrigger: 7, padBtn: 3,  ..._POS.up    },
  { id: "R-sq",    side: "R", type: "face", sym: "□", keyLabel: "KP4", keyCode: "Numpad4",    padTrigger: 7, padBtn: 2,  ..._POS.left  },
  { id: "R-circ",  side: "R", type: "face", sym: "○", keyLabel: "KP6", keyCode: "Numpad6",    padTrigger: 7, padBtn: 1,  ..._POS.right },
  { id: "R-cross", side: "R", type: "face", sym: "×", keyLabel: "KP2", keyCode: "Numpad2",    padTrigger: 7, padBtn: 0,  ..._POS.down  },
];

const SLOT_IDS    = SLOT_DEFS.map((s) => s.id);
const KEY_TO_SLOT = Object.fromEntries(SLOT_DEFS.map((s) => [s.keyCode, s.id]));
const SLOT_BY_ID  = Object.fromEntries(SLOT_DEFS.map((s) => [s.id, s]));

const DIFFICULTIES = {
  slow:   { timeMs: 4000, label: "遅い",  sublabel: "4秒"   },
  normal: { timeMs: 2500, label: "普通",  sublabel: "2.5秒" },
  fast:   { timeMs: 1500, label: "速い",  sublabel: "1.5秒" },
};

const PLAYER_MAX_HP        = 5;
const ENEMY_MAX_HP         = 8;
const FEEDBACK_SUCCESS_MS  = 350;
const FEEDBACK_FAIL_MS     = 550;
const SCORE_ATTACK_MS      = 60_000;
const BASE_SCORE_PER_HIT   = 10;
const MAX_COMBO_MULTIPLIER = 5;

// AOE dodge mechanic
const AOE_WARNING_MS   = 1500;
const AOE_FIRE_MS      = 500;
const AOE_MIN_DELAY_MS = 3000;
const AOE_MAX_DELAY_MS = 7000;
const STICK_SPEED      = 1.5; // normalized units per second (keyboard & gamepad)
const STICK_DEADZONE   = 0.15;
