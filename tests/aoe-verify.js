/**
 * AOE避け / スティック入力 — Playwright 動作確認スクリプト
 *
 * 事前準備:
 *   npm install                  (playwright を devDependency として取得)
 *   npx serve . --listen 3399 &  (静的サーバーを起動)
 *
 * 実行:
 *   node tests/aoe-verify.js
 *
 * 各ステップは PASS / FAIL で出力される。
 */

'use strict';

const { chromium } = require('playwright');
const BASE_URL = process.env.TEST_URL || 'http://localhost:3399';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();

  const jsErrors = [];
  page.on('pageerror', err => jsErrors.push(err.message));

  let passed = 0;
  let failed = 0;

  function assert(label, cond, detail = '') {
    if (cond) {
      console.log('  PASS', label);
      passed++;
    } else {
      console.error('  FAIL', label, detail ? `(${detail})` : '');
      failed++;
    }
  }

  // ── 1. ページロード ──────────────────────────────────────────────
  console.log('\n[1] ページロード & DOM 構造');
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  assert('stick-panel-L が存在',    await page.locator('#stick-panel-L').count()  === 1);
  assert('stick-panel-R が存在',    await page.locator('#stick-panel-R').count()  === 1);
  assert('stick-cursor-L が存在',   await page.locator('#stick-cursor-L').count() === 1);
  assert('stick-cursor-R が存在',   await page.locator('#stick-cursor-R').count() === 1);
  assert('aoe-zone-L が存在',       await page.locator('#aoe-zone-L').count()     === 1);
  assert('aoe-zone-R が存在',       await page.locator('#aoe-zone-R').count()     === 1);
  assert('JS エラーなし (初期)',     jsErrors.length === 0, jsErrors.join('; '));

  // ── 2. ゲーム開始 & カーソル初期化 ──────────────────────────────
  console.log('\n[2] ゲーム開始 — カーソル初期位置');
  await page.click('#btn-start');
  await page.waitForTimeout(400);

  const stylL0 = await page.locator('#stick-cursor-L').getAttribute('style') || '';
  const stylR0 = await page.locator('#stick-cursor-R').getAttribute('style') || '';
  assert('Lカーソルが中央 (left:50%)', stylL0.includes('left: 50%'), stylL0);
  assert('Rカーソルが中央 (left:50%)', stylR0.includes('left: 50%'), stylR0);
  assert('Lカーソルが中央 (top:50%)',  stylL0.includes('top: 50%'),  stylL0);

  // ── 3. キーボード入力でカーソル移動 ─────────────────────────────
  console.log('\n[3] キーボード入力 — カーソル移動');

  // L カーソル: D キーで右へ
  await page.keyboard.down('D');
  await page.waitForTimeout(600);
  await page.keyboard.up('D');
  await page.waitForTimeout(50);
  const stylLd = await page.locator('#stick-cursor-L').getAttribute('style') || '';
  const lLeftD  = parseFloat(stylLd.match(/left:\s*([\d.]+)%/)?.[1] ?? '50');
  assert('D キー長押し → Lカーソルが右へ移動 (>60%)', lLeftD > 60, `left=${lLeftD}%`);

  // R カーソル: ArrowRight キーで右へ
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(600);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(50);
  const stylRr  = await page.locator('#stick-cursor-R').getAttribute('style') || '';
  const rLeftAr = parseFloat(stylRr.match(/left:\s*([\d.]+)%/)?.[1] ?? '50');
  assert('ArrowRight 長押し → Rカーソルが右へ移動 (>60%)', rLeftAr > 60, `left=${rLeftAr}%`);

  // L カーソル: W キーで上へ
  await page.keyboard.down('W');
  await page.waitForTimeout(600);
  await page.keyboard.up('W');
  await page.waitForTimeout(50);
  const stylLw  = await page.locator('#stick-cursor-L').getAttribute('style') || '';
  const lTopW   = parseFloat(stylLw.match(/top:\s*([\d.]+)%/)?.[1] ?? '50');
  assert('W キー長押し → Lカーソルが上へ移動 (<40%)', lTopW < 40, `top=${lTopW}%`);

  // ── 4. AOE ライフサイクル (warning → fire → clear) ───────────────
  console.log('\n[4] AOE ライフサイクル');

  // 新しいゲームでカーソルをリセット
  await page.click('#btn-mute'); // ミュートにして音を止める（オプション）
  // リロードして再スタート
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.click('#btn-start');
  await page.waitForTimeout(300);

  // AOE warning が出るまでポーリング (最大 10 秒)
  let warningFound = false;
  let warningClass = '';
  for (let i = 0; i < 50; i++) {
    await page.waitForTimeout(200);
    const clL = await page.locator('#aoe-zone-L').getAttribute('class') || '';
    const clR = await page.locator('#aoe-zone-R').getAttribute('class') || '';
    if (clL.includes('warning') || clR.includes('warning')) {
      warningFound = true;
      warningClass = clL.includes('warning') ? clL : clR;
      break;
    }
  }

  assert('AOE warning クラスが付与される', warningFound, warningClass);

  // warning → fire フェーズ待機 (AOE_WARNING_MS = 1500ms)
  await page.waitForTimeout(1700);
  const clLf = await page.locator('#aoe-zone-L').getAttribute('class') || '';
  const clRf = await page.locator('#aoe-zone-R').getAttribute('class') || '';
  const hasFire = clLf.includes('hit') || clLf.includes('dodge') || clRf.includes('hit') || clRf.includes('dodge');
  assert('AOE fire 後に hit/dodge クラスが付与される', hasFire, `L:${clLf} R:${clRf}`);

  // clear フェーズ待機 (AOE_FIRE_MS = 500ms)
  await page.waitForTimeout(700);
  const clLc = await page.locator('#aoe-zone-L').getAttribute('class') || '';
  const clRc = await page.locator('#aoe-zone-R').getAttribute('class') || '';
  assert('AOE クリア後にクラスが消える', clLc === 'aoe-zone' && clRc === 'aoe-zone', `L:${clLc} R:${clRc}`);

  // ── 5. AOE 被弾で HP 減少 ────────────────────────────────────────
  console.log('\n[5] AOE 被弾 → HP 減少');

  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.click('#btn-start');
  await page.waitForTimeout(300);

  const emptyBefore = await page.locator('.heart--empty').count();

  // AOE warning を待ち、その種別に合わせてカーソルを危険ゾーンへ移動させる
  // キー: 方向 → 危険側へ動かすキー (L/R パネルそれぞれ)。null = スキップ
  const DANGER_KEYS = {
    L: { left: 'A', right: 'D', top: 'W', bottom: 'S',
         'band-h': null, 'band-v': null, 'large-circle': null, 'small-circles': null },
    R: { left: 'ArrowLeft', right: 'ArrowRight', top: 'ArrowUp', bottom: 'ArrowDown' },
  };

  let hitFound = false;
  // 最大 4 AOE サイクル試みる（新タイプ混在のため増やす）
  for (let attempt = 0; attempt < 4 && !hitFound; attempt++) {
    // warning 検出までポーリング
    let warnPanel = null, warnType = null;
    for (let i = 0; i < 50; i++) {
      await page.waitForTimeout(200);
      const clL = await page.locator('#aoe-zone-L').getAttribute('class') || '';
      const clR = await page.locator('#aoe-zone-R').getAttribute('class') || '';
      const src  = clL.includes('warning') ? clL : clR;
      // ハイフン付きタイプ名（large-circle 等）に対応した正規表現
      const match = src.match(/aoe-zone--([\w-]+)$/);
      if (src.includes('warning') && match) {
        warnPanel = clL.includes('warning') ? 'L' : 'R';
        warnType  = match[1]; // 'left'|'right'|...|'large-circle' など
        break;
      }
    }

    if (!warnPanel) break;

    // warning 発見 → 危険ゾーンへカーソルを押し込む（対応キーがある場合のみ）
    const key = DANGER_KEYS[warnPanel] && DANGER_KEYS[warnPanel][warnType];
    if (key) {
      await page.keyboard.down(key);
      await page.waitForTimeout(900); // 危険ゾーンへ十分移動
      await page.keyboard.up(key);
    }

    // fire フェーズ待機
    await page.waitForTimeout(800);
    const clLf = await page.locator('#aoe-zone-L').getAttribute('class') || '';
    const clRf = await page.locator('#aoe-zone-R').getAttribute('class') || '';
    if (clLf.includes('hit') || clRf.includes('hit')) {
      hitFound = true;
    }
    // clear 待ち（次サイクルに備える）
    await page.waitForTimeout(600);
  }

  assert('AOE hit クラスが観測された', hitFound);
  if (hitFound) {
    await page.waitForTimeout(200);
    const emptyAfter = await page.locator('.heart--empty').count();
    assert('AOE 被弾後に HP が減少した', emptyAfter > emptyBefore,
      `before=${emptyBefore} after=${emptyAfter}`);
  }

  // ── 6. JS エラーなし (全体) ──────────────────────────────────────
  console.log('\n[6] 最終チェック');
  assert('テスト全体で JS エラーなし', jsErrors.length === 0, jsErrors.join('; '));

  // ── 結果 ─────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`結果: ${passed} PASS, ${failed} FAIL`);
  console.log('─'.repeat(40));

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
