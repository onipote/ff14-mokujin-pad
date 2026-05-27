(function () {
  var canvas = document.getElementById('bg-canvas');
  var ctx = canvas.getContext('2d');
  var width, height;
  var particles = [];
  var COUNT = 45;
  var lastTime = 0;
  var INTERVAL = 1000 / 30; // 30fps cap

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function Particle() { this.reset(true); }
  Particle.prototype.reset = function (initial) {
    this.x = Math.random() * width;
    this.y = initial ? Math.random() * height : height + Math.random() * 50;
    this.r = Math.random() * 2 + 0.5;
    this.vy = Math.random() * 0.8 + 0.2;
    this.vx = (Math.random() - 0.5) * 0.3;
    // pre-compute fillStyle to avoid string alloc every frame
    var op = (Math.random() * 0.35 + 0.08).toFixed(2);
    this.style = 'rgba(180,220,248,' + op + ')';
  };
  Particle.prototype.update = function () {
    this.y -= this.vy;
    this.x += this.vx;
    if (this.y < -10) this.reset(false);
  };

  function init() {
    resize();
    window.addEventListener('resize', resize);
    for (var i = 0; i < COUNT; i++) particles.push(new Particle());
    requestAnimationFrame(tick);
  }

  function tick(ts) {
    requestAnimationFrame(tick);
    if (ts - lastTime < INTERVAL) return;
    lastTime = ts;

    ctx.clearRect(0, 0, width, height);
    for (var i = 0; i < COUNT; i++) {
      var p = particles[i];
      p.update();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.style;
      ctx.fill();
    }
  }

  init();
})();
