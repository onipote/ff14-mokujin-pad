document.addEventListener('DOMContentLoaded', () => {
  const xhb   = new XHBRenderer();
  const ui    = new UIManager();
  const input = new InputHandler();
  const engine = new GameEngine(xhb, ui, input);

  xhb.build();
  ui.buildHearts(PLAYER_MAX_HP);

  input.onPadStatus = (connected, id) => ui.setPadStatus(connected, id);

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
  }

  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-retry').addEventListener('click', startGame);
  document.getElementById('btn-menu').addEventListener('click', showMenu);
});
