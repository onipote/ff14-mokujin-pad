import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });

async function captureAoe(type, stickX, stickY, label) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 800, height: 400 });

  await page.goto('http://localhost:8765/');
  await page.waitForLoadState('networkidle');

  // Freeze the game timer so we have plenty of time
  await page.evaluate(() => {
    document.getElementById('btn-start').disabled = false;
  });
  await page.locator('#btn-start').click();
  await page.waitForTimeout(200);

  // Freeze timer
  await page.evaluate(() => {
    // Patch GameEngine to not count down
    const origUpdate = GameEngine.prototype._tick ?? null;
  });

  await page.evaluate(({ t, sx, sy }) => {
    const origSpawn = AoeEngine.prototype._spawn;
    AoeEngine.prototype._spawn = function() {
      if (!this._active) return;
      AoeEngine.prototype._spawn = origSpawn;

      this.input.stickL.x = sx;
      this.input.stickL.y = sy;

      this._side = 'L';
      this._type = t;
      if (t === 'fan') {
        this._aoeData = { type: 'fan', halfAngle: 25, baseAngle: 45 };
      } else {
        this._aoeData = this._buildAoeData(t);
      }
      this.ui.showAoeWarning('L', this._aoeData);

      this._fireId = setTimeout(() => {
        if (!this._active) return;
        const isHit = this._checkHit(this.input.stickL.x, this.input.stickL.y, this._aoeData);
        this.ui.showAoeResult('L', this._aoeData, isHit);
        if (isHit) { if (this.onHit) this.onHit(); }
        else { if (this.onDodge) this.onDodge(); }
        this._clearId = setTimeout(() => {
          if (!this._active) return;
          this.ui.clearAoe('L');
          this._side = this._type = this._aoeData = null;
          this._scheduleNext();
        }, AOE_FIRE_MS);
      }, AOE_WARNING_MS);
    };
  }, { t: type, sx: stickX, sy: stickY });

  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(1000);
    const info = await page.evaluate((t) => {
      const el = document.getElementById('aoe-zone-L');
      const cls = el?.className || '';
      return { cls, match: cls.includes(`aoe-zone--${t}`) };
    }, type);
    if (info.match) {
      const rect = await page.evaluate(() => {
        const panel = document.querySelector('#stick-panel-L');
        if (panel) { const r = panel.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }
        const el = document.getElementById('aoe-zone-L');
        if (el) { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }
        return null;
      });
      const clip = rect && rect.width > 0 ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : undefined;
      const state = info.cls.includes('warning-in') ? 'IN' : 'OUT';
      await page.screenshot({ path: `tests/compare-${label}.png`, clip });
      console.log(`[OK] ${label}: warning-${state}`);
      await page.close();
      return;
    }
  }
  console.log(`[MISS] ${label}`);
  await page.close();
}

// 同じ状態 (warning-OUT) で fan vs left を比較
// fan baseAngle=45, cursor=(0.5,0) → angle≈0° outside all sectors
// left, cursor=(0.5,0) → x=0.5 > 0, outside left-half
await captureAoe('fan',  0.5, 0, 'fan-out');
await captureAoe('left', 0.5, 0, 'left-out');

// 同じ状態 (warning-IN) で fan vs left を比較
// fan, cursor=(0,0) → always inside (special case)
// left, cursor=(-0.5,0) → x < sizeScale-1 ≈ 0 → inside
await captureAoe('fan',  0.0,  0, 'fan-in');
await captureAoe('left', -0.5, 0, 'left-in');

await browser.close();
console.log('All done');
