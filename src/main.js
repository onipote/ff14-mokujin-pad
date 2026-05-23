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

  // Start screen controller navigation state
  let startSectionIdx = 0; // 0=mode, 1=diff, 2=start
  let startModeIdx    = 0;
  let startDiffIdx    = 1; // default: 'normal'

  function initBtnGroup(groupId, onChange) {
    const group = document.getElementById(groupId);
    group.querySelectorAll('.btn').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.btn').forEach(b => b.classList.remove('btn--sel'));
        btn.classList.add('btn--sel');
        onChange(btn.dataset.value, idx);
      });
    });
  }

  initBtnGroup('mode-btns', (v, idx) => { selectedMode = v; startModeIdx = idx; });
  initBtnGroup('diff-btns', (v, idx) => { selectedDiff = v; startDiffIdx = idx; });

  function applyModeSelection(idx) {
    const btns = [...document.querySelectorAll('#mode-btns .btn')];
    btns.forEach((b, i) => b.classList.toggle('btn--sel', i === idx));
    if (btns[idx]) selectedMode = btns[idx].dataset.value;
  }

  function applyDiffSelection(idx) {
    const btns = [...document.querySelectorAll('#diff-btns .btn')];
    btns.forEach((b, i) => b.classList.toggle('btn--sel', i === idx));
    if (btns[idx]) selectedDiff = btns[idx].dataset.value;
  }

  function updateStartFocus() {
    document.querySelectorAll('#screen-start .btn').forEach(b => b.classList.remove('btn--focused'));
    if (startSectionIdx === 0) {
      document.querySelectorAll('#mode-btns .btn')[startModeIdx]?.classList.add('btn--focused');
    } else if (startSectionIdx === 1) {
      document.querySelectorAll('#diff-btns .btn')[startDiffIdx]?.classList.add('btn--focused');
    } else {
      document.getElementById('btn-start').classList.add('btn--focused');
    }
  }

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
      menuPrevBtns.up      = !!(initGp.buttons[12]?.pressed);
      menuPrevBtns.down    = !!(initGp.buttons[13]?.pressed);
      menuPrevBtns.left    = !!(initGp.buttons[14]?.pressed);
      menuPrevBtns.right   = !!(initGp.buttons[15]?.pressed);
      menuPrevBtns.cross   = !!(initGp.buttons[0]?.pressed);
      menuPrevBtns.options = !!(initGp.buttons[9]?.pressed);
    }

    const loop = () => {
      menuRaf = requestAnimationFrame(loop);
      const gp = getPad();
      if (!gp) return;

      const dUp    = !!(gp.buttons[12]?.pressed);
      const dDown  = !!(gp.buttons[13]?.pressed);
      const dLeft  = !!(gp.buttons[14]?.pressed);
      const dRight = !!(gp.buttons[15]?.pressed);
      const cross   = !!(gp.buttons[0]?.pressed);
      const options = !!(gp.buttons[9]?.pressed);

      const upFresh      = dUp    && !menuPrevBtns.up;
      const downFresh    = dDown  && !menuPrevBtns.down;
      const leftFresh    = dLeft  && !menuPrevBtns.left;
      const rightFresh   = dRight && !menuPrevBtns.right;
      const crossFresh   = cross  && !menuPrevBtns.cross;
      const optionsFresh = options && !menuPrevBtns.options;

      // For linear menus (pause/gameover) combine left/right with up/down
      const navUp   = upFresh   || leftFresh;
      const navDown = downFresh || rightFresh;

      if (appState === 'start') {
        const canStart = !document.getElementById('btn-start').disabled;

        if (upFresh   && startSectionIdx > 0) { startSectionIdx--; updateStartFocus(); }
        if (downFresh && startSectionIdx < 2) { startSectionIdx++; updateStartFocus(); }

        if (startSectionIdx === 0) {
          const modeCount = document.querySelectorAll('#mode-btns .btn').length;
          if (leftFresh  && startModeIdx > 0)             { startModeIdx--; applyModeSelection(startModeIdx); updateStartFocus(); }
          if (rightFresh && startModeIdx < modeCount - 1) { startModeIdx++; applyModeSelection(startModeIdx); updateStartFocus(); }
        } else if (startSectionIdx === 1) {
          const diffCount = document.querySelectorAll('#diff-btns .btn').length;
          if (leftFresh  && startDiffIdx > 0)             { startDiffIdx--; applyDiffSelection(startDiffIdx); updateStartFocus(); }
          if (rightFresh && startDiffIdx < diffCount - 1) { startDiffIdx++; applyDiffSelection(startDiffIdx); updateStartFocus(); }
        }

        if (canStart && (optionsFresh || crossFresh)) startGame();

      } else if (appState === 'paused') {
        if (navUp   && menuSelIdx > 0)                    { menuSelIdx--; updateMenuFocus(); }
        if (navDown && menuSelIdx < menuButtons.length - 1) { menuSelIdx++; updateMenuFocus(); }
        if (crossFresh)   menuButtons[menuSelIdx].action();
        if (optionsFresh) resumeGame();

      } else if (appState === 'gameover') {
        if (navUp   && menuSelIdx > 0)                    { menuSelIdx--; updateMenuFocus(); }
        if (navDown && menuSelIdx < menuButtons.length - 1) { menuSelIdx++; updateMenuFocus(); }
        if (crossFresh) menuButtons[menuSelIdx].action();
      }

      menuPrevBtns.up      = dUp;
      menuPrevBtns.down    = dDown;
      menuPrevBtns.left    = dLeft;
      menuPrevBtns.right   = dRight;
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
    startSectionIdx = 0;
    refreshPadState();
    updateStartFocus();
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
  updateStartFocus();
  startMenuLoop();
});
