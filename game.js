"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const pressedKeys = new Set();
const movementKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

// 월드 배율은 논리 좌표 1칸에 대응하는 픽셀 수, 이동 속도는 초당 픽셀 수다.
const settings = {
  worldScale: 3,
  playerSpeed: 630,
};

// TODO: 사용자가 허용한 임시 크기·색·도로·해안선·시작 위치. 최종 아트와 동선 확정 시 교체한다.
// 기획서의 논리 좌표를 유지한다. 그리기와 충돌 판정에서 같은 배율을 사용한다.
const city = {
  width: 1000,
  height: 900,
  spawn: { x: 500, y: 450 },
  debug: false, // true로 바꿀 때만 장소명·ID·대표점을 표시한다.
  coast: [[500, 35], [650, 85], [780, 120], [900, 220], [955, 370],
    [930, 510], [940, 650], [830, 750], [710, 810], [580, 865],
    [410, 850], [280, 810], [160, 715], [70, 620], [55, 470],
    [85, 320], [170, 220], [300, 125]],
  roads: [
    [[260, 390], [350, 245], [520, 200], [680, 235], [755, 295],
      [820, 430], [760, 650], [610, 730], [420, 700], [245, 605], [260, 390]],
    [[500, 450], [520, 200]], [[500, 450], [260, 390]],
    [[500, 450], [820, 430]], [[500, 450], [610, 730]],
    [[245, 605], [170, 615], [170, 600]],
    [[260, 390], [265, 345]], [[755, 295], [774, 345]],
    [[760, 650], [765, 605], [809, 571]],
    [[610, 730], [610, 790], [585, 820], [533, 820]],
  ],
  locations: [
    { id: "C01", name: "사진관", x: 170, y: 565, width: 86, height: 64, color: "#c68f79", solid: true },
    { id: "C02", name: "학교", x: 265, y: 305, width: 126, height: 78, color: "#d4b572", solid: true },
    { id: "C03", name: "놀이공원", x: 774, y: 345, width: 134, height: 112, color: "#e9c9b1", solid: false },
    { id: "C04", name: "놀이터", x: 809, y: 571, width: 112, height: 94, color: "#e6d5a0", solid: false },
    { id: "C05", name: "집", x: 533, y: 778, width: 82, height: 62, color: "#a6b7bd", solid: true },
  ],
};
const world = {
  width: city.width * settings.worldScale,
  height: city.height * settings.worldScale,
};
const camera = { x: 0, y: 0 };
const player = {
  x: city.spawn.x * settings.worldScale,
  y: city.spawn.y * settings.worldScale,
  width: 32,
  height: 48,
  facing: "down",
  // TODO: 발밑의 원을 임시 충돌 범위로 사용한다. 최종 캐릭터에 맞춰 조정한다.
  collisionRadius: 10,
  footOffset: 18,
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
  // 작은 간격으로 나눠 검사해 벽이나 해안선을 뛰어넘지 않도록 한다.
  const distance = settings.playerSpeed * deltaSeconds;
  const steps = Math.max(1, Math.ceil(distance / (player.collisionRadius / 2)));
  for (let step = 0; step < steps; step += 1) {
    const nextX = player.x + dx * distance / steps;
    if (canStand(nextX, player.y)) player.x = nextX;
    const nextY = player.y + dy * distance / steps;
    if (canStand(player.x, nextY)) player.y = nextY;
  }
}

function pointInIsland(x, y) {
  let inside = false;
  const points = city.coast;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

function distanceToSegment(x, y, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
}

function canStand(x, y) {
  // 캐릭터 전체가 픽셀 기준 월드 경계를 넘지 못하게 한다.
  if (x < player.width / 2 || x > world.width - player.width / 2 ||
      y < player.height / 2 || y > world.height - player.height / 2) return false;

  // 발밑 충돌 원을 논리 좌표로 변환해 원본 도시 배치와 비교한다.
  const logicalX = x / settings.worldScale;
  const footY = (y + player.footOffset) / settings.worldScale;
  const radius = player.collisionRadius / settings.worldScale;
  if (!pointInIsland(logicalX, footY)) return false;
  for (let i = 0; i < city.coast.length; i += 1) {
    if (distanceToSegment(logicalX, footY, city.coast[i], city.coast[(i + 1) % city.coast.length]) < radius) return false;
  }
  for (const place of city.locations) {
    if (!place.solid) continue;
    const nearestX = Math.max(place.x - place.width / 2, Math.min(place.x + place.width / 2, logicalX));
    const nearestY = Math.max(place.y - place.height / 2, Math.min(place.y + place.height / 2, footY));
    if (Math.hypot(logicalX - nearestX, footY - nearestY) < radius) return false;
  }
  return true;
}

function updateCamera() {
  camera.x = Math.max(0, Math.min(world.width - canvas.width, player.x - canvas.width / 2));
  camera.y = Math.max(0, Math.min(world.height - canvas.height, player.y - canvas.height / 2));
}

function tracePath(points, close = false) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
  if (close) ctx.closePath();
}

function drawCity() {
  tracePath(city.coast, true);
  ctx.fillStyle = "#dbe3ce";
  ctx.fill();
  ctx.strokeStyle = "#eee0b9";
  ctx.lineWidth = 12;
  ctx.stroke();

  ctx.save();
  tracePath(city.coast, true);
  ctx.clip();
  // 바닥 무늬는 카메라가 아닌 도시 좌표에 고정한다.
  ctx.fillStyle = "#c5d3b6";
  for (let x = 32; x < city.width; x += 48) {
    for (let y = 32; y < city.height; y += 48) ctx.fillRect(x, y, 3, 3);
  }
  ctx.strokeStyle = "#f1e6cd";
  ctx.lineWidth = 28;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const road of city.roads) {
    tracePath(road);
    ctx.stroke();
  }
  ctx.restore();

  for (const place of city.locations) {
    const left = place.x - place.width / 2;
    const top = place.y - place.height / 2;
    ctx.fillStyle = place.color;
    ctx.fillRect(left, top, place.width, place.height);
    ctx.strokeStyle = place.solid ? "#746e60" : "#b5aa83";
    ctx.lineWidth = 2;
    ctx.strokeRect(left, top, place.width, place.height);
    if (place.solid) {
      ctx.fillStyle = "#ffffff45";
      ctx.fillRect(left + 8, top + 8, place.width - 16, 12);
      ctx.fillStyle = "#f7e9c8";
      ctx.fillRect(left + 12, top + 32, 14, 14);
      ctx.fillRect(left + place.width - 26, top + 32, 14, 14);
    } else {
      // 야외 장소는 테두리까지 모두 보행 가능하다.
      ctx.strokeStyle = "#ffffff88";
      ctx.beginPath();
      ctx.arc(place.x, place.y, place.id === "C03" ? 32 : 22, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawDebug() {
  if (!city.debug) return;
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  for (const place of city.locations) {
    ctx.fillStyle = "#292f35";
    ctx.fillText(`${place.id} ${place.name} (${place.x}, ${place.y})`, place.x, place.y - place.height / 2 - 10);
    ctx.fillRect(place.x - 2, place.y - 2, 4, 4);
  }
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
  ctx.fillStyle = "#a9cdd4";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  ctx.save();
  ctx.scale(settings.worldScale, settings.worldScale);
  drawCity();
  ctx.restore();
  drawPlayer();
  ctx.save();
  ctx.scale(settings.worldScale, settings.worldScale);
  drawDebug();
  ctx.restore();
  ctx.restore();
}

let previousTime = null;
function frame(time) {
  const deltaSeconds = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  update(deltaSeconds);
  updateCamera();
  draw();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
