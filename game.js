const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const startButton = document.getElementById("startButton");
const scoreEl = document.getElementById("score");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Game state
let bird;
let pipes;
let score;
let bestScore = 0;
let isRunning = false;
let lastTime = 0;

// Physics
const GRAVITY = 1600; // px/s^2
const JUMP_VELOCITY = -480; // px/s
const PIPE_SPEED = 220; // px/s
const PIPE_GAP = 160;
const PIPE_WIDTH = 64;
const PIPE_SPAWN_INTERVAL = 1500; // ms
let pipeSpawnTimer = 0;

// Bird visual
const BIRD_RADIUS = 16;

function resetGame() {
  bird = {
    x: WIDTH * 0.32,
    y: HEIGHT * 0.5,
    vy: 0,
    angle: 0,
  };
  pipes = [];
  score = 0;
  pipeSpawnTimer = 0;
  scoreEl.textContent = "0";
}

function startGame() {
  resetGame();
  isRunning = true;
  overlay.classList.remove("visible");
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function endGame() {
  isRunning = false;
  bestScore = Math.max(bestScore, score);
  const title = overlay.querySelector(".title");
  const subtitle = overlay.querySelector(".subtitle");
  title.textContent = "Game Over";
  subtitle.innerHTML =
    "<span style='font-size:14px'>Score " +
    score +
    " · Best " +
    bestScore +
    "</span><br /><span style='font-size:12px;opacity:.7'>Press R to Restart</span>";
  overlay.classList.add("visible");
}

function spawnPipe() {
  const marginTop = 60;
  const marginBottom = 80;
  const totalSpace = HEIGHT - marginTop - marginBottom - PIPE_GAP;
  const offset = Math.random() * totalSpace;
  const gapY = marginTop + offset + PIPE_GAP / 2;

  pipes.push({
    x: WIDTH + PIPE_WIDTH,
    gapY,
    passed: false,
  });
}

function update(dt) {
  // Bird physics
  bird.vy += GRAVITY * dt;
  bird.y += bird.vy * dt;

  // Ease bird rotation toward target angle based on velocity
  const targetAngle = Math.max(-0.5, Math.min(0.7, bird.vy / 520));
  const rotateLerpSpeed = 10; // larger = snappier, still smooth
  bird.angle += (targetAngle - bird.angle) * rotateLerpSpeed * dt;

  // Ground / ceiling collision
  if (bird.y + BIRD_RADIUS > HEIGHT || bird.y - BIRD_RADIUS < 0) {
    endGame();
    return;
  }

  // Pipes
  pipeSpawnTimer += dt * 1000;
  if (pipeSpawnTimer >= PIPE_SPAWN_INTERVAL) {
    pipeSpawnTimer -= PIPE_SPAWN_INTERVAL;
    spawnPipe();
  }

  pipes.forEach((pipe) => {
    pipe.x -= PIPE_SPEED * dt;
  });

  // Remove off-screen pipes
  pipes = pipes.filter((p) => p.x + PIPE_WIDTH > -10);

  // Scoring and collisions
  for (const pipe of pipes) {
    const inPipeX =
      bird.x + BIRD_RADIUS > pipe.x && bird.x - BIRD_RADIUS < pipe.x + PIPE_WIDTH;
    const inGapY =
      bird.y - BIRD_RADIUS > pipe.gapY - PIPE_GAP / 2 &&
      bird.y + BIRD_RADIUS < pipe.gapY + PIPE_GAP / 2;

    if (inPipeX && !inGapY) {
      endGame();
      return;
    }

    if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
      pipe.passed = true;
      score += 1;
      scoreEl.textContent = String(score);

      // subtle score bump animation
      scoreEl.classList.remove("bump");
      // force reflow so animation can retrigger
      // eslint-disable-next-line no-void
      void scoreEl.offsetWidth;
      scoreEl.classList.add("bump");
    }
  }
}

function drawBackground() {
  // solid sky background (uses CSS canvas base color)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawPipes() {
  pipes.forEach((pipe) => {
    const topBottom = pipe.gapY - PIPE_GAP / 2;
    const bottomTop = pipe.gapY + PIPE_GAP / 2;

    const radius = 14;

    ctx.save();
    ctx.fillStyle = "#b5d5ff";

    // Top pipe
    roundRect(ctx, pipe.x, 0, PIPE_WIDTH, topBottom, radius);
    ctx.fill();

    // Bottom pipe
    roundRect(ctx, pipe.x, bottomTop, PIPE_WIDTH, HEIGHT - bottomTop, radius);
    ctx.fill();
    ctx.restore();
  });
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.angle);

  // subtle squash & stretch for feel
  const stretch = 1 + Math.max(-0.18, Math.min(0.18, -bird.vy / 900));
  const squashX = 1 + (1 - stretch) * 0.5;
  ctx.scale(squashX, stretch);

  // main circle (simple pastel)
  ctx.fillStyle = "#ffc9d0";
  ctx.beginPath();
  ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // minimal eye using background/text colors to stay within palette
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(4, -4, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1f2933";
  ctx.beginPath();
  ctx.arc(5, -4, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function draw() {
  drawBackground();
  drawPipes();
  drawBird();
}

function loop(timestamp) {
  if (!isRunning) return;
  const dt = Math.min(0.033, (timestamp - lastTime) / 1000);
  lastTime = timestamp;

  update(dt);
  draw();

  if (isRunning) {
    requestAnimationFrame(loop);
  }
}

function jump() {
  if (!isRunning) {
    startGame();
    return;
  }
  bird.vy = JUMP_VELOCITY;
}

// Input
startButton.addEventListener("click", () => {
  startGame();
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    jump();
  } else if (e.code === "KeyR" || e.key === "r" || e.key === "R") {
    if (!isRunning) {
      startGame();
    }
  }
});

canvas.addEventListener("mousedown", () => {
  jump();
});

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  jump();
});

// Initial state
resetGame();
draw();
overlay.classList.add("visible");

