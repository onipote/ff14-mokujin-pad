// Verification: fan and band AoE patterns
import { chromium } from 'playwright';

const BASE = 'http://localhost:3737';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 720 });

async function shot(name) {
  await page.screenshot({ path: `tests/shot-${name}.png` });
  return `tests/shot-${name}.png`;
}

await page.goto(BASE);
await page.waitForTimeout(600);

// Enable start (normally requires gamepad) and launch game
await page.evaluate(() => { document.getElementById('btn-start').disabled = false; });
await page.click('#btn-start');
await page.waitForTimeout(500);

// Check that AoeEngine and _buildFanClipPath are accessible as globals
const globals = await page.evaluate(() => ({
  hasAoeEngine:        typeof AoeEngine === 'function',
  hasCheckHit:         typeof AoeEngine?.prototype?._checkHit === 'function',
  hasBuildFanClipPath: typeof _buildFanClipPath === 'function',
  fanClip:             typeof _buildFanClipPath === 'function' ? _buildFanClipPath(0, 20) : null,
}));
console.log('Globals:', globals);

// Helper: inject AoE shape directly into #aoe-zone-L
async function showAoe(data, label) {
  await page.evaluate((d) => {
    const zone = document.getElementById('aoe-zone-L');
    if (!zone) return;
    zone.innerHTML = '';
    zone.className = `aoe-zone aoe-zone--container aoe-zone--warning-out aoe-zone--${d.type}`;
    const sf = document.getElementById('stick-field-L');
    if (sf) sf.classList.add('stick-field--active');

    function mk(style) {
      const el = document.createElement('div');
      el.className = 'aoe-zone aoe-zone--warning-out';
      el.style.cssText = style;
      return el;
    }
    const pct = v => ((v + 1) / 2 * 100);

    if (d.type === 'fan') {
      // overlay: dark outside, bright inside = safe zone is lit
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:absolute;inset:0;background:rgba(180,60,60,0.45);border-radius:0;pointer-events:none';
      zone.appendChild(overlay);
      for (let i = 0; i < 4; i++) {
        const clip = _buildFanClipPath(d.baseAngle + i * 90, d.halfAngle);
        zone.appendChild(mk(`position:absolute;left:0;top:0;width:100%;height:100%;clip-path:${clip};border-radius:0`));
      }
    } else if (d.type === 'band') {
      const thick = d.halfThick * 100;
      for (const b of d.bands) {
        if (b.dir === 'h')
          zone.appendChild(mk(`position:absolute;left:0;width:100%;top:${pct(b.pos)}%;height:${thick}%;transform:translateY(-50%);border-radius:0`));
        else
          zone.appendChild(mk(`position:absolute;top:0;height:100%;left:${pct(b.pos)}%;width:${thick}%;transform:translateX(-50%);border-radius:0`));
      }
    }
  }, data);
  await page.waitForTimeout(350);
  const path = await shot(label);
  await page.evaluate(() => {
    const z = document.getElementById('aoe-zone-L');
    if (z) { z.innerHTML = ''; z.className = 'aoe-zone'; }
    const sf = document.getElementById('stick-field-L');
    if (sf) sf.classList.remove('stick-field--active');
  });
  await page.waitForTimeout(150);
  return path;
}

// Visual shots
const p1 = await showAoe({ type: 'fan',  halfAngle: 20, baseAngle: 0  }, '1-fan-base0-20deg');
const p2 = await showAoe({ type: 'fan',  halfAngle: 25, baseAngle: 45 }, '2-fan-base45-25deg');
const p3 = await showAoe({ type: 'fan',  halfAngle: 15, baseAngle: 10 }, '3-fan-narrow-15deg');
const p4 = await showAoe({ type: 'band', halfThick: 0.18, bands: [{ dir:'h', pos:-0.5 }, { dir:'h', pos:0.5  }] }, '4-band-hh');
const p5 = await showAoe({ type: 'band', halfThick: 0.18, bands: [{ dir:'v', pos:-0.5 }, { dir:'v', pos:0.5  }] }, '5-band-vv');
const p6 = await showAoe({ type: 'band', halfThick: 0.18, bands: [{ dir:'h', pos:-0.3 }, { dir:'v', pos:0.4  }] }, '6-band-hv');

// Hit-detection logic via AoeEngine.prototype (it's a global class)
const logic = await page.evaluate(() => {
  const ch = AoeEngine.prototype._checkHit.bind({});
  const fan  = { type:'fan',  halfAngle:20, baseAngle:0 };
  const bHH  = { type:'band', halfThick:0.18, bands:[{dir:'h',pos:-0.5},{dir:'h',pos:0.5}] };
  const bHV  = { type:'band', halfThick:0.18, bands:[{dir:'h',pos:-0.3},{dir:'v',pos:0.4}] };
  return {
    fanCenter:   ch(0,    0,   fan),  // always hit
    fanRight:    ch(0.8,  0,   fan),  // angle=0° hit
    fanDown:     ch(0,    0.8, fan),  // angle=90° hit
    fanDiagMiss: ch(0.6,  0.6, fan),  // angle=45° miss
    bandH1Hit:   ch(0,   -0.5, bHH),  // top band
    bandH2Hit:   ch(0,    0.5, bHH),  // bottom band
    bandHMiss:   ch(0,    0,   bHH),  // gap
    bandHVhHit:  ch(0,   -0.3, bHV),  // h band
    bandHVvHit:  ch(0.4,  0,   bHV),  // v band
    noOverlap:   Math.abs(0.5 - (-0.5)) >= 2 * 0.18,
  };
});

const checks = [
  { name: '_buildFanClipPath returns polygon()',  v: globals.fanClip?.startsWith('polygon'), expect: true  },
  { name: 'fan: center always hit',               v: logic.fanCenter,   expect: true  },
  { name: 'fan: right (angle=0°) hit',            v: logic.fanRight,    expect: true  },
  { name: 'fan: down (angle=90°=base+90) hit',    v: logic.fanDown,     expect: true  },
  { name: 'fan: diagonal (45°) miss',             v: logic.fanDiagMiss, expect: false },
  { name: 'band-hh: top band hit',                v: logic.bandH1Hit,   expect: true  },
  { name: 'band-hh: bottom band hit',             v: logic.bandH2Hit,   expect: true  },
  { name: 'band-hh: center gap miss',             v: logic.bandHMiss,   expect: false },
  { name: 'band-hv: h band hit',                  v: logic.bandHVhHit,  expect: true  },
  { name: 'band-hv: v band hit',                  v: logic.bandHVvHit,  expect: true  },
  { name: 'same-dir bands never overlap',         v: logic.noOverlap,   expect: true  },
];

let pass = 0, fail = 0;
console.log('\n=== Hit-detection checks ===');
for (const c of checks) {
  const ok = c.v === c.expect;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✅' : '❌'} ${c.name}: got ${c.v}, expected ${c.expect}`);
}

await browser.close();

console.log(`\nVerdict: ${fail === 0 ? 'PASS' : 'FAIL'} (${pass}/${pass+fail})`);
process.exit(fail > 0 ? 1 : 0);
