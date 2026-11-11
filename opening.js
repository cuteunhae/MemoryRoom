"use strict";

const openingUi = { active: false, elapsedMs: 0, line: -1, lastTick: 0,
  path: [], lastRouteAt: -Infinity, routeOrigin: null };
const openingDialog = document.getElementById("opening-dialog");

function initializeOpening() {
  openingUi.active = false;
  openingUi.path = [];
  openingUi.routeOrigin = null;
  openingUi.lastRouteAt = -Infinity;
  if (openingDialog.open) openingDialog.close();
  if (gameState.onboarding.introSeen) return;
  // 최초 표시를 즉시 저장하므로 독백 도중 재접속해도 처음부터 반복하지 않는다.
  gameState.onboarding.introSeen = true;
  openingUi.active = true;
  openingUi.elapsedMs = 0;
  openingUi.line = -1;
  openingUi.lastTick = Date.now();
  pressedKeys.clear(); heldMovementCodes.clear();
  player.moving = false;
  stopBubbleDrag();
  openingDialog.showModal(); openingDialog.focus();
  updateOpening();
}

function updateOpening() {
  if (!openingUi.active) return;
  const now = Date.now();
  if (!document.hidden) openingUi.elapsedMs += Math.max(0, now - openingUi.lastTick);
  openingUi.lastTick = now;
  let remaining = openingUi.elapsedMs;
  const index = OPENING_DATA.lines.findIndex(line => {
    if (remaining < line.durationMs) return true;
    remaining -= line.durationMs;
    return false;
  });
  if (index < 0) {
    openingUi.active = false;
    openingDialog.close();
    pressedKeys.clear(); heldMovementCodes.clear(); canvas.focus();
    saveProgress();
  } else if (openingUi.line !== index) {
    openingUi.line = index;
    document.getElementById("opening-text").textContent = OPENING_DATA.lines[index].text;
  }
}

function finishOpeningGuide(placeId) {
  if (placeId !== OPENING_DATA.destinationId) return;
  gameState.onboarding.studioVisited = true;
  openingUi.path = [];
}

function openingGuideVisible() {
  return gameState.onboarding.introSeen && !gameState.onboarding.studioVisited && !openingUi.active && !scene.interiorId;
}

// 화면용 직선이 아니라 실제 플레이어 발밑 충돌 판정으로 길을 찾는다.
function openingSegmentWalkable(a, b) {
  const count = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / OPENING_DATA.route.sampleStep));
  for (let i = 0; i <= count; i++) {
    const x = a[0] + (b[0] - a[0]) * i / count, y = a[1] + (b[1] - a[1]) * i / count;
    if (!canStandCity(x * settings.worldScale, y * settings.worldScale - player.footOffset)) return false;
  }
  return true;
}

function findOpeningRoute(start) {
  const target = city.accessPoints.find(point => point.placeId === OPENING_DATA.destinationId);
  if (!target) return [];
  const goal = [target.x, target.y], step = OPENING_DATA.route.gridStep;
  if (openingSegmentWalkable(start, goal)) return [start, goal];
  const point = (x, y) => [goal[0] + x * step, goal[1] + y * step];
  const key = (x, y) => `${x},${y}`;
  const heap = [], costs = new Map(), parents = new Map(), nodes = new Map();
  const push = node => {
    heap.push(node);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent].score <= node.score) break;
      heap[i] = heap[parent]; i = parent;
    }
    heap[i] = node;
  };
  const pop = () => {
    const first = heap[0], last = heap.pop();
    if (heap.length) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let child = i * 2 + 1;
        if (child + 1 < heap.length && heap[child + 1].score < heap[child].score) child++;
        if (last.score <= heap[child].score) break;
        heap[i] = heap[child]; i = child;
      }
      heap[i] = last;
    }
    return first;
  };
  const sx = Math.round((start[0] - goal[0]) / step), sy = Math.round((start[1] - goal[1]) / step);
  // 도로 가장자리에서도 벽을 가로지르지 않고 가까운 격자에 연결한다.
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const x = sx + dx, y = sy + dy, p = point(x, y), id = key(x, y);
    if (!openingSegmentWalkable(start, p)) continue;
    const cost = Math.hypot(p[0] - start[0], p[1] - start[1]);
    const node = { x, y, id, cost, score: cost + Math.hypot(x, y) * step };
    costs.set(id, cost); nodes.set(id, p); parents.set(id, null); push(node);
  }
  const edges = new Map();
  let visited = 0;
  while (heap.length && visited++ < OPENING_DATA.route.maxNodes) {
    const node = pop();
    if (node.cost !== costs.get(node.id)) continue;
    if (node.x === 0 && node.y === 0) {
      const path = [];
      for (let id = node.id; id !== null; id = parents.get(id)) path.push(nodes.get(id));
      return [start, ...path.reverse()];
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = node.x + dx, y = node.y + dy, p = point(x, y), id = key(x, y), cost = node.cost + step;
      if (p[0] < 0 || p[1] < 0 || p[0] > city.width || p[1] > city.height || cost >= (costs.get(id) ?? Infinity)) continue;
      const edge = [node.id, id].sort().join("/");
      if (!edges.has(edge)) edges.set(edge, openingSegmentWalkable(nodes.get(node.id), p));
      if (!edges.get(edge)) continue;
      costs.set(id, cost); parents.set(id, node.id); nodes.set(id, p);
      push({ x, y, id, cost, score: cost + Math.hypot(x, y) * step });
    }
  }
  // 경로가 없으면 장애물을 가로지르는 가짜 안내선을 그리지 않는다.
  return [];
}

function updateOpeningRoute() {
  if (!openingGuideVisible() || isGameInputBlocked()) return;
  const now = Date.now(), start = [player.x / settings.worldScale, (player.y + player.footOffset) / settings.worldScale];
  if (now - openingUi.lastRouteAt < OPENING_DATA.route.refreshMs) return;
  if (openingUi.routeOrigin && Math.hypot(start[0] - openingUi.routeOrigin[0], start[1] - openingUi.routeOrigin[1]) < OPENING_DATA.route.gridStep) return;
  openingUi.path = findOpeningRoute(start);
  openingUi.routeOrigin = start;
  openingUi.lastRouteAt = now;
}

function drawOpeningRoute() {
  if (!openingGuideVisible()) return;
  // 목적지부터 세면 걸어서 경로가 짧아져도 간식 종류와 반짝임 순서가 덜 흔들린다.
  const config = OPENING_DATA.route, points = [...openingUi.path].reverse();
  ctx.save(); ctx.scale(settings.worldScale, settings.worldScale);
  let next = 0, index = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (!length) continue;
    while (next <= length) {
      const t = next / length;
      drawOpeningMarker(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, index++);
      next += config.dotSpacing;
    }
    next -= length;
  }
  ctx.restore();
}

function drawOpeningMarker(x, y, index) {
  const config = OPENING_DATA.route;
  const pulse = (1 + Math.sin(Date.now() * Math.PI * 2 / config.sparklePeriodMs + index * 1.7)) / 2;
  ctx.save(); ctx.translate(x, y);
  if (index % config.snackEvery === 0) {
    const snack = config.snacks[Math.floor(index / config.snackEvery) % config.snacks.length];
    const image = objectSpriteImage(snack.src);
    if (image) {
      const crop = snack.crop, scale = snack.size / Math.max(crop.width, crop.height);
      ctx.globalAlpha = 0.96;
      ctx.rotate(index % 2 ? -0.12 : 0.12);
      ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height,
        -crop.width * scale / 2, -crop.height * scale / 2, crop.width * scale, crop.height * scale);
      ctx.restore();
      return;
    }
  }
  // 원형 점 대신 크기와 밝기가 서로 다른 네 갈래 별빛을 그린다.
  const radius = config.dotRadius * (0.55 + pulse * 0.65);
  ctx.globalAlpha = 0.35 + pulse * 0.65;
  ctx.fillStyle = config.color; ctx.shadowColor = config.glow; ctx.shadowBlur = 5 + pulse * 12;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4, size = i % 2 ? radius * 0.22 : radius;
    const px = Math.cos(angle) * size, py = Math.sin(angle) * size;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

openingDialog.addEventListener("cancel", event => event.preventDefault());
document.addEventListener("visibilitychange", () => { openingUi.lastTick = Date.now(); });
