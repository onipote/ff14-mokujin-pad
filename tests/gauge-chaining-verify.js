/**
 * ゲージ連鎖（GCD キューイング）動作の Playwright 検証スクリプト
 *
 * 使い方:
 *   npm start          # 別ターミナルでサーバーを起動しておく
 *   node tests/gauge-chaining-verify.js
 *
 * テスト内容:
 *   A. ゲージ100%到達時に次のスロットが出現し、ゲージが開始すること
 *   B. ゲージ200%相当（timeMs * 2）経過後に失敗となること
 *   C. ゲージ100%〜200%の猶予ウィンドウ内でボタンを押すと成功し、
 *      pendingスロットのゲージが引き継がれること
 */

const { chromium } = require('playwright');
const path = require('path');

const BASE_URL  = process.env.BASE_URL || 'http://localhost:3000';
const HEADLESS  = process.env.HEADLESS !== 'false';
const SNAP_DIR  = path.join(__dirname, '..', 'talklog');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.log(`  ❌ ${msg}`);
    failed++;
  }
}

(async () => {
  const browser = await chromium.launch({ headless: HEADLESS });
  const page    = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 800 });
  page.on('pageerror', err => console.warn(`[PAGEERR] ${err.message}`));

  // ── ヘルパー ──────────────────────────────────────────────
  async function startGame(diff = '遅い') {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.click(`button:has-text("${diff}")`);
    // コントローラー要件をバイパス
    await page.evaluate(() => { document.getElementById('btn-start').disabled = false; });
    await page.click('#btn-start');
    await page.waitForTimeout(400);
  }

  const getActiveIds  = () => page.$$eval('.xhb-slot--active',  e => e.map(x => x.id));
  const getSuccessIds = () => page.$$eval('.xhb-slot--success', e => e.map(x => x.id));
  const getRecastPct  = (slotId) =>
    page.$eval(`#${slotId} .slot-recast`, e => e.style.getPropertyValue('--recast-pct') || 'none')
      .catch(() => 'not-found');

  // ── TEST A: ゲージ連鎖 ────────────────────────────────────
  console.log('\n=== TEST A: ゲージ100%到達で次スロットが出現 ===');
  await startGame('遅い'); // timeMs = 4000ms

  let ids = await getActiveIds();
  const slotA = ids[0];
  assert(ids.length === 1, `開始直後はスロット1個 (got ${ids.length})`);

  // 4.3s 後: ゲージ100%到達済みのはず
  await page.waitForTimeout(4300);
  ids = await getActiveIds();
  assert(ids.length === 2,           `ゲージ100%後はスロット2個 (got ${ids.length})`);
  assert(ids.includes(slotA),        `元スロット ${slotA} がまだアクティブ`);

  const pendingSlotA = ids.find(x => x !== slotA);
  assert(!!pendingSlotA, `pendingスロットが出現した (${pendingSlotA})`);

  if (pendingSlotA) {
    const pct = await getRecastPct(pendingSlotA);
    const val = parseFloat(pct);
    assert(!isNaN(val) && val > 0 && val < 1, `pendingスロットのゲージが進行中 (pct=${pct})`);
  }

  await page.screenshot({ path: path.join(SNAP_DIR, 'gauge_A_two_slots.png') });

  // ── TEST B: ゲージ200%で失敗 ─────────────────────────────
  console.log('\n=== TEST B: ゲージ200%（timeMs*2）経過で失敗 ===');
  await startGame('遅い');

  ids = await getActiveIds();
  const slotB = ids[0];
  assert(ids.length === 1, `開始直後はスロット1個`);

  // 4+4+0.6=8.6s 後: 200%タイムアウト＋フィードバック済みのはず
  await page.waitForTimeout(9200);
  ids = await getActiveIds();
  assert(!ids.includes(slotB), `元スロット ${slotB} はタイムアウト後に非アクティブ`);
  assert(ids.length >= 1,      `ゲーム継続中（次スロットが表示されている）`);

  await page.screenshot({ path: path.join(SNAP_DIR, 'gauge_B_after_timeout.png') });

  // ── TEST C: 猶予ウィンドウ内での成功入力 ─────────────────
  console.log('\n=== TEST C: ゲージ100%〜200%の猶予ウィンドウで正解 ===');
  await startGame('遅い');

  ids = await getActiveIds();
  const slotC   = ids[0];
  const keyCode = await page.evaluate((id) =>
    SLOT_BY_ID[id.replace('slot-', '')]?.keyCode, slotC);
  assert(!!keyCode, `スロット ${slotC} のキーコード取得 (${keyCode})`);

  // 4.7s 後: ゲージ100%到達済み、猶予ウィンドウ中（0.7s経過 / 4s = 17.5%）
  await page.waitForTimeout(4700);
  ids = await getActiveIds();
  assert(ids.length === 2,     `猶予ウィンドウ中: スロット2個表示`);
  assert(ids.includes(slotC), `元スロット ${slotC} がまだアクティブ（入力受付中）`);

  const pendingSlotC = ids.find(x => x !== slotC);

  // 正しいキーを押す
  await page.evaluate((code) => {
    document.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
  }, keyCode);
  await page.waitForTimeout(100);

  const successIds = await getSuccessIds();
  assert(successIds.includes(slotC), `元スロット ${slotC} が成功 (success=${JSON.stringify(successIds)})`);

  // フィードバック後: pendingスロットが引き継がれている
  await page.waitForTimeout(400);
  ids = await getActiveIds();
  assert(pendingSlotC ? ids.includes(pendingSlotC) : true,
    `pendingスロット ${pendingSlotC} がゲージ引き継ぎで表示 (active=${JSON.stringify(ids)})`);

  await page.screenshot({ path: path.join(SNAP_DIR, 'gauge_C_after_success.png') });

  // ── 結果 ─────────────────────────────────────────────────
  await browser.close();
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`結果: ${passed} passed / ${failed} failed`);
  if (failed > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
