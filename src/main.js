document.addEventListener('DOMContentLoaded', () => {
  const xhb    = new XHBRenderer();
  const ui     = new UIManager();
  const input  = new InputHandler();
  const sound  = new SoundManager();
  const engine = new GameEngine(xhb, ui, input, sound);

  xhb.build();
  ui.buildHearts(PLAYER_MAX_HP);

  // ── App state ──────────────────────────────────────────
  let appState = 'start'; // 'start' | 'playing' | 'paused' | 'gameover'

  // ── Controller connection ───────────────────────────────
  function refreshPadState() {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()] : [];
    const pad  = pads.find(g => g);
    ui.setPadStatus(!!pad, pad ? pad.id : null);
    ui.setStartable(!!pad);
  }

  window.addEventListener('gamepadconnected',    (e) => {
    ui.setPadStatus(true, e.gamepad.id);
    ui.setStartable(true);
  });
  window.addEventListener('gamepaddisconnected', () => refreshPadState());

  input.onPadStatus = (connected, id) => ui.setPadStatus(connected, id);

  refreshPadState();

  // ── Mode / difficulty selection ─────────────────────────
  let selectedMode = 'default';
  let selectedDiff = 'normal';

  function initBtnGroup(groupId, onChange) {
    const group = document.getElementById(groupId);
    group.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.btn').forEach(b => b.classList.remove('btn--sel'));
        btn.classList.add('btn--sel');
        onChange(btn.dataset.value);
      });
    });
  }

  initBtnGroup('mode-btns', v => { selectedMode = v; });
  initBtnGroup('diff-btns', v => { selectedDiff = v; });

  // ── Menu loop (controller nav on non-play screens) ──────
  let menuRaf      = null;
  let menuPrevBtns = {};
  let menuSelIdx   = 0;
  let menuButtons  = []; // [{ el, action }]

  function getPad() {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()] : [];
    return pads.find(g => g) || null;
  }

  function btn(idx) {
    const gp = getPad();
    return !!(gp && gp.buttons[idx] && gp.buttons[idx].pressed);
  }

  function updateMenuFocus() {
    menuButtons.forEach((b, i) => b.el.classList.toggle('btn--focused', i === menuSelIdx));
  }

  function startMenuLoop() {
    stopMenuLoop();

    // Pre-populate current button state to avoid spurious triggers from held buttons
    menuPrevBtns = {};
    const initGp = getPad();
    if (initGp) {
      menuPrevBtns.up      = !!(initGp.buttons[12]?.pressed || initGp.buttons[14]?.pressed);
      menuPrevBtns.down    = !!(initGp.buttons[13]?.pressed || initGp.buttons[15]?.pressed);
      menuPrevBtns.cross   = !!(initGp.buttons[0]?.pressed);
      menuPrevBtns.options = !!(initGp.buttons[9]?.pressed);
    }

    const loop = () => {
      menuRaf = requestAnimationFrame(loop);
      const gp = getPad();
      if (!gp) return;

      const up      = !!(gp.buttons[12]?.pressed || gp.buttons[14]?.pressed);
      const down    = !!(gp.buttons[13]?.pressed || gp.buttons[15]?.pressed);
      const cross   = !!(gp.buttons[0]?.pressed);
      const options = !!(gp.buttons[9]?.pressed);

      const upFresh      = up      && !menuPrevBtns.up;
      const downFresh    = down    && !menuPrevBtns.down;
      const crossFresh   = cross   && !menuPrevBtns.cross;
      const optionsFresh = options && !menuPrevBtns.options;

      if (appState === 'start') {
        const canStart = !document.getElementById('btn-start').disabled;
        if (canStart && (optionsFresh || crossFresh)) startGame();

      } else if (appState === 'paused') {
        if (upFresh   && menuSelIdx > 0)                   { menuSelIdx--; updateMenuFocus(); }
        if (downFresh && menuSelIdx < menuButtons.length - 1) { menuSelIdx++; updateMenuFocus(); }
        if (crossFresh)   menuButtons[menuSelIdx].action();
        if (optionsFresh) resumeGame();

      } else if (appState === 'gameover') {
        if (upFresh   && menuSelIdx > 0)                   { menuSelIdx--; updateMenuFocus(); }
        if (downFresh && menuSelIdx < menuButtons.length - 1) { menuSelIdx++; updateMenuFocus(); }
        if (crossFresh) menuButtons[menuSelIdx].action();
      }

      menuPrevBtns.up      = up;
      menuPrevBtns.down    = down;
      menuPrevBtns.cross   = cross;
      menuPrevBtns.options = options;
    };

    menuRaf = requestAnimationFrame(loop);
  }

  function stopMenuLoop() {
    if (menuRaf) { cancelAnimationFrame(menuRaf); menuRaf = null; }
    menuButtons.forEach(b => b.el.classList.remove('btn--focused'));
  }

  // ── System button (OPTIONS) during gameplay → pause ─────
  input.onSystemButton = () => {
    if (appState === 'playing') pauseGame();
  };

  // ── Game over callback ──────────────────────────────────
  engine.onGameOver = () => {
    appState  = 'gameover';
    menuSelIdx = 0;
    menuButtons = [
      { el: document.getElementById('btn-retry'), action: startGame },
      { el: document.getElementById('btn-menu'),  action: showMenu  },
    ];
    updateMenuFocus();
    startMenuLoop();
  };

  // ── Actions ─────────────────────────────────────────────
  function startGame() {
    stopMenuLoop();
    document.getElementById('screen-start').classList.add('hidden');
    ui.hidePause();
    ui.hideGameOver();
    ui.showScoreAtkTimer(selectedMode === 'score_attack');
    appState = 'playing';
    engine.start(selectedMode, selectedDiff);
  }

  function pauseGame() {
    engine.pause();
    ui.showPause();
    appState   = 'paused';
    menuSelIdx = 0;
    menuButtons = [
      { el: document.getElementById('btn-resume'), action: resumeGame },
      { el: document.getElementById('btn-quit'),   action: quitToMenu },
    ];
    updateMenuFocus();
    startMenuLoop();
  }

  function resumeGame() {
    stopMenuLoop();
    ui.hidePause();
    appState = 'playing';
    engine.resume();
  }

  function quitToMenu() {
    stopMenuLoop();
    ui.hidePause();
    showMenu();
  }

  function showMenu() {
    engine.stop();
    ui.hideGameOver();
    document.getElementById('screen-start').classList.remove('hidden');
    appState = 'start';
    refreshPadState();
    startMenuLoop();
  }

  // ── Click/keyboard fallback ─────────────────────────────
  document.getElementById('btn-start').addEventListener('click',  startGame);
  document.getElementById('btn-retry').addEventListener('click',  startGame);
  document.getElementById('btn-menu').addEventListener('click',   showMenu);
  document.getElementById('btn-resume').addEventListener('click', resumeGame);
  document.getElementById('btn-quit').addEventListener('click',   quitToMenu);

  // ── Mute toggle ─────────────────────────────────────────
  const btnMute = document.getElementById('btn-mute');
  btnMute.addEventListener('click', () => {
    sound.muted = !sound.muted;
    btnMute.textContent = sound.muted ? '♪̶' : '♪';
    btnMute.classList.toggle('btn-mute--off', sound.muted);
  });

  // ── Start polling on title screen ───────────────────────
  startMenuLoop();
});
