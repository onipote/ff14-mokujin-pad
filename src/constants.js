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
  slow:   { timeMs: 3500, label: "わかば",   sublabel: "GCD 3.5s", baseScore: 150 },
  normal: { timeMs: 2500, label: "チョコボ", sublabel: "GCD 2.5s", baseScore: 250 },
  fast:   { timeMs: 1500, label: "光の戦士", sublabel: "GCD 1.5s", baseScore: 350 },
};

const FEEDBACK_SUCCESS_MS    = 350;
const FEEDBACK_FAIL_MS       = 550;
const GAME_DURATION_MS       = 60_000;
const MISS_PENALTY_MS        = 5_000;
const LIMIT_GAUGE_COUNT      = 3;
const LIMIT_GAUGE_THRESHOLDS = { slow: 3, normal: 5, fast: 6 }; // 1ゲージを貯めるのに必要な大成功数
const LIMIT_GAUGE_BONUS_MS   = [1_000, 2_000, 3_000]; // ゲージ1個目・2個目・3個目完成時のボーナス（ms）
const BURST_DURATION_MS      = 10_000;
const BURST_GCD_MULTIPLIER   = 1.4;
const BURST_SCORE_MULTIPLIER = 2;
const GREAT_RATIO_MIN        = 0.75;

// 各難易度の理論最高得点（全GREAT・全リミット時間ボーナス・全バースト得点ボーナス取得時）
// 計算方法は docs/designs/plan_score_rating.md を参照
const THEORETICAL_MAX_SCORE = {
  slow:   10_500,
  normal: 16_650,
  fast:   35_200,
};

// AOE dodge mechanic
const AOE_WARNING_MS   = 3000;
const AOE_FIRE_MS      = 500;
const AOE_MIN_DELAY_MS = 3000;
const AOE_MAX_DELAY_MS = 7000;
const STICK_SPEED      = 1.275; // normalized units per second (keyboard & gamepad)
const STICK_SPEED_L    = STICK_SPEED * 0.85; // 左スティックのみ15%減速
const STICK_DEADZONE   = 0.15;

// 頭割りギミック（右パネル）
const STK_FRAME_W_PCT  = 48.875;   // フレーム幅（フィールドwidth比%）
const STK_FRAME_H_PCT  = 48.875;   // フレーム高さ（フィールドheight比%）= W_PCTと同値→3:2比率
const STK_FRAME_HALF_W = 0.48875; // 正規化半幅 = (STK_FRAME_W_PCT/2) / 50
const STK_FRAME_HALF_H = 0.48875; // 正規化半高 = (STK_FRAME_H_PCT/2) / 50
const STK_MARKER_RANGE    = 0.8;  // マーカースポーン範囲 ±0.8（正規化）
const STK_CENTER_EXCLUDE_R = STK_FRAME_HALF_W * 0.25; // 中央除外半径 ≈ 0.122（辺の1/4相当）

// AoE サイズランダム振れ幅（±15%）
const AOE_SIZE_SCALE_BASE  = 0.85;
const AOE_SIZE_SCALE_RANGE = 0.30; // 0.85〜1.15
