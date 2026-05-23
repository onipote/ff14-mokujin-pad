// Flat single-row positions (4 slots per cluster, horizontal):
//   r0 = leftmost, r1, r2, r3 = rightmost
// dpad row: [←][↑][↓][→]   face row: [□][△][×][○]
const _POS = {
  r0: { posLeft: "0px",                                           posTop: "0px" },
  r1: { posLeft: "calc(var(--slot-sz) + var(--slot-gap))",       posTop: "0px" },
  r2: { posLeft: "calc((var(--slot-sz) + var(--slot-gap)) * 2)", posTop: "0px" },
  r3: { posLeft: "calc((var(--slot-sz) + var(--slot-gap)) * 3)", posTop: "0px" },
};

const SLOT_DEFS = [
  // Left XHB - D-pad  (← ↑ ↓ →)
  { id: "L-up",    side: "L", type: "dpad", sym: "↑", keyLabel: "W",   keyCode: "KeyW",       padTrigger: 6, padBtn: 12, ..._POS.r1 },
  { id: "L-down",  side: "L", type: "dpad", sym: "↓", keyLabel: "S",   keyCode: "KeyS",       padTrigger: 6, padBtn: 13, ..._POS.r2 },
  { id: "L-left",  side: "L", type: "dpad", sym: "←", keyLabel: "A",   keyCode: "KeyA",       padTrigger: 6, padBtn: 14, ..._POS.r0 },
  { id: "L-right", side: "L", type: "dpad", sym: "→", keyLabel: "D",   keyCode: "KeyD",       padTrigger: 6, padBtn: 15, ..._POS.r3 },
  // Left XHB - Face  (□ △ × ○ — corresponds to ← ↑ ↓ →)
  { id: "L-tri",   side: "L", type: "face", sym: "△", keyLabel: "R",   keyCode: "KeyR",       padTrigger: 6, padBtn: 3,  ..._POS.r1 },
  { id: "L-sq",    side: "L", type: "face", sym: "□", keyLabel: "F",   keyCode: "KeyF",       padTrigger: 6, padBtn: 2,  ..._POS.r0 },
  { id: "L-circ",  side: "L", type: "face", sym: "○", keyLabel: "G",   keyCode: "KeyG",       padTrigger: 6, padBtn: 1,  ..._POS.r3 },
  { id: "L-cross", side: "L", type: "face", sym: "×", keyLabel: "V",   keyCode: "KeyV",       padTrigger: 6, padBtn: 0,  ..._POS.r2 },
  // Right XHB - D-pad  (← ↑ ↓ →)
  { id: "R-up",    side: "R", type: "dpad", sym: "↑", keyLabel: "↑",   keyCode: "ArrowUp",    padTrigger: 7, padBtn: 12, ..._POS.r1 },
  { id: "R-down",  side: "R", type: "dpad", sym: "↓", keyLabel: "↓",   keyCode: "ArrowDown",  padTrigger: 7, padBtn: 13, ..._POS.r2 },
  { id: "R-left",  side: "R", type: "dpad", sym: "←", keyLabel: "←",   keyCode: "ArrowLeft",  padTrigger: 7, padBtn: 14, ..._POS.r0 },
  { id: "R-right", side: "R", type: "dpad", sym: "→", keyLabel: "→",   keyCode: "ArrowRight", padTrigger: 7, padBtn: 15, ..._POS.r3 },
  // Right XHB - Face  (□ △ × ○)
  { id: "R-tri",   side: "R", type: "face", sym: "△", keyLabel: "KP8", keyCode: "Numpad8",    padTrigger: 7, padBtn: 3,  ..._POS.r1 },
  { id: "R-sq",    side: "R", type: "face", sym: "□", keyLabel: "KP4", keyCode: "Numpad4",    padTrigger: 7, padBtn: 2,  ..._POS.r0 },
  { id: "R-circ",  side: "R", type: "face", sym: "○", keyLabel: "KP6", keyCode: "Numpad6",    padTrigger: 7, padBtn: 1,  ..._POS.r3 },
  { id: "R-cross", side: "R", type: "face", sym: "×", keyLabel: "KP2", keyCode: "Numpad2",    padTrigger: 7, padBtn: 0,  ..._POS.r2 },
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
