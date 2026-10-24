"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const pressedKeys = new Set();
const movementKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  width: 32,
  height: 48,
  speed: 210, // 초당 이동 거리 (논리 픽셀)
  facing: "down",
};

window.addEventListener("keydown", (event) => {
  if (!movementKeys.has(event.key)) return;
  event.preventDefault();
  pressedKeys.add(event.key);
});

window.addEventListener("keyup", (event) => {
  if (!movementKeys.has(event.key)) return;
  event.preventDefault();
  pressedKeys.delete(event.key);
});

// 다른 창이나 탭으로 이동할 때 키가 눌린 상태로 남지 않도록 처리한다.
window.addEventListener("blur", () => pressedKeys.clear());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pressedKeys.clear();
});
canvas.addEventListener("pointerdown", () => canvas.focus());

function update(deltaSeconds) {
  let dx = Number(pressedKeys.has("ArrowRight")) - Number(pressedKeys.has("ArrowLeft"));
  let dy = Number(pressedKeys.has("ArrowDown")) - Number(pressedKeys.has("ArrowUp"));
  const length = Math.hypot(dx, dy);
  if (length === 0) return;

  if (dy !== 0) player.facing = dy > 0 ? "down" : "up";
  else player.facing = dx > 0 ? "right" : "left";

  // 대각선 이동도 상하좌우 이동과 같은 속도를 사용한다.
  dx /= length;
  dy /= length;
  player.x += dx * player.speed * deltaSeconds;
  player.y += dy * player.speed * deltaSeconds;
  player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
  player.y = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.y));
}

function drawPlayer() {
  const x = Math.round(player.x);
  const y = Math.round(player.y);

  ctx.fillStyle = "#00000018";
  ctx.beginPath();
  ctx.ellipse(x, y + 20, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 임시 캐릭터: 신발, 바지, 상의, 얼굴, 머리카락.
  ctx.fillStyle = "#485159";
  ctx.fillRect(x - 10, y + 10, 8, 14);
  ctx.fillRect(x + 2, y + 10, 8, 14);
  ctx.fillStyle = "#b46e4f";
  ctx.fillRect(x - 13, y - 4, 26, 19);
  ctx.fillStyle = "#efd0ac";
  ctx.fillRect(x - 16, y + 2, 4, 10);
  ctx.fillRect(x + 12, y + 2, 4, 10);
  ctx.fillRect(x - 11, y - 20, 22, 19);
  ctx.fillStyle = "#514237";
  ctx.fillRect(x - 12, y - 24, 24, 8);
  ctx.fillRect(x - 12, y - 16, 4, 8);
  ctx.fillRect(x + 8, y - 16, 4, 8);

  if (player.facing === "up") {
    ctx.fillRect(x - 11, y - 20, 22, 17);
  } else {
    ctx.fillStyle = "#3e3935";
    if (player.facing !== "right") ctx.fillRect(x - 6, y - 11, 3, 3);
    if (player.facing !== "left") ctx.fillRect(x + 3, y - 11, 3, 3);
  }
}

function draw() {
  ctx.fillStyle = "#dbe3ce";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 이동을 알아보기 위한 바닥 격자.
  ctx.strokeStyle = "#cdd7c0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= canvas.width; x += 64) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  }
  for (let y = 0; y <= canvas.height; y += 64) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }
  ctx.stroke();
  drawPlayer();
}

let previousTime = null;
function frame(time) {
  const deltaSeconds = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  update(deltaSeconds);
  draw();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
