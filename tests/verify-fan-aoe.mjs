import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

// Capture page console logs
page.on('console', msg => console.log('[PAGE]', msg.text()));

await page.goto('http://localhost:8765/');
await page.waitForLoadState('networkidle');

// Patch AoeEngine to force fan type on first spawn
await page.evaluate(() => {
  const origSpawn = AoeEngine.prototype._spawn;

  AoeEngine.prototype._spawn = function() {
    if (!this._active) return;
    console.log('[patch] _spawn called, forcing fan AoE');

    // Restore original for subsequent spawns
    AoeEngine.prototype._spawn = origSpawn;

    // Force side='L' and type='fan' directly
    this._side = 'L';

    // Override Math.random only for the type selection inside _buildAoeData
    const origRandom = Math.random;
    let typeSelectDone = false;

    // _buildAoeData('fan') needs Math.random for halfAngle and baseAngle
    // No need to override - just directly set type and call _buildAoeData
    this._type = 'fan';
    this._aoeData = this._buildAoeData('fan');

    console.log('[patch] fan aoeData:', JSON.stringify(this._aoeData));
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

  console.log('[patch] AoeEngine._spawn patched');
});

// Enable start button and start game
await page.evaluate(() => {
  document.getElementById('btn-start').disabled = false;
});
await page.locator('#btn-start').click();
await page.waitForTimeout(300);
console.log('Game started');

// Wait for AoE to spawn (3-7s delay) then warning phase (3s)
// The patched _spawn fires first time AoE triggers
let fanFound = false;
for (let t = 1; t <= 15; t++) {
  await page.waitForTimeout(1000);

  const info = await page.evaluate(() => {
    const el = document.getElementById('aoe-zone-L');
    return { classes: el?.className || '', hasChildren: (el?.children?.length || 0) };
  });

  if (info.classes.includes('aoe-zone--fan')) {
    fanFound = true;
    await page.screenshot({ path: 'tests/screenshot-fan-aoe-found.png' });
    console.log(`Fan AoE visible at t=${t}s. Classes: ${info.classes}`);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/screenshot-fan-aoe-found2.png' });
    break;
  }

  if ([5, 10].includes(t)) {
    await page.screenshot({ path: `tests/screenshot-t${t}s.png` });
    console.log(`t=${t}s: aoe-zone-L classes = "${info.classes}", children = ${info.hasChildren}`);
  }
}

if (!fanFound) {
  await page.screenshot({ path: 'tests/screenshot-fan-aoe-found.png' });
  const info = await page.evaluate(() => {
    const el = document.getElementById('aoe-zone-L');
    return el?.className || 'not found';
  });
  console.log('Fan AoE not found after 15s. Final aoe-zone-L class:', info);
}

await browser.close();
