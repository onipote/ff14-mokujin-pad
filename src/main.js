document.addEventListener('DOMContentLoaded', () => {
  const xhb = new XHBRenderer();
  xhb.build();

  // 仮のハート表示（フェーズ5で UIManager に移動）
  const heartsEl = document.getElementById('player-hearts');
  for (let i = 0; i < PLAYER_MAX_HP; i++) {
    const h = document.createElement('div');
    h.className = 'heart';
    heartsEl.appendChild(h);
  }
});
