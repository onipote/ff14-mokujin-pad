document.addEventListener('DOMContentLoaded', () => {
  const xhb    = new XHBRenderer();
  const ui     = new UIManager();
  const input  = new InputHandler();
  const sound  = new SoundManager();
  const engine = new GameEngine(xhb, ui, input, sound);

  xhb.build();
  ui.buildHearts(PLAYER_MAX_HP);

  // Controller connection state
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

  function startGame() {
    document.getElementById('screen-start').classList.add('hidden');
    ui.hideGameOver();
    ui.showScoreAtkTimer(selectedMode === 'score_attack');
    engine.start(selectedMode, selectedDiff);
  }

  function showMenu() {
    engine.stop();
    ui.hideGameOver();
    document.getElementById('screen-start').classList.remove('hidden');
    refreshPadState();
  }

  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-retry').addEventListener('click', startGame);
  document.getElementById('btn-menu').addEventListener('click', showMenu);

  // Mute toggle
  const btnMute = document.getElementById('btn-mute');
  btnMute.addEventListener('click', () => {
    sound.muted = !sound.muted;
    btnMute.textContent = sound.muted ? '♪̶' : '♪';
    btnMute.classList.toggle('btn-mute--off', sound.muted);
  });
});
