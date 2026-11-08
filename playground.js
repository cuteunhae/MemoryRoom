"use strict";

const playgroundAnimation = { swingUntil: 0, seesawUntil: 0, slideUntil: 0 };

// 시설 그림을 미리 불러온다. 놀이공원(park.js)도 같은 함수를 쓴다. 불러오지 못한 그림은 기존 임시 도형으로 그린다.
function loadSpriteImages(sprites) {
  const images = {};
  if (typeof Image !== "function") return images;
  for (const [kind, sprite] of Object.entries(sprites)) {
    const image = new Image();
    image.src = sprite.src;
    images[kind] = image;
  }
  return images;
}
function spriteImageReady(image) {
  return !!image && image.complete && image.naturalWidth > 0;
}
// 그림의 frame번째 칸을 crop 범위만 잘라, 가로 width·세로 height 사각형 안에 비율을 유지해 맞추고 바닥(아래쪽 가운데)에 붙여 그린다.
// ctx는 대상 사각형의 중심으로 옮겨진 상태여야 한다.
function drawSpriteImage(image, sprite, frame, width, height) {
  const columns = sprite.columns || 1, rows = sprite.rows || 1;
  const cellWidth = image.naturalWidth / columns, cellHeight = image.naturalHeight / rows;
  const sourceX = (frame % columns) * cellWidth + sprite.crop.x, sourceY = Math.floor(frame / columns) * cellHeight + sprite.crop.y;
  const scale = Math.min(width / sprite.crop.width, height / sprite.crop.height);
  const drawWidth = sprite.crop.width * scale, drawHeight = sprite.crop.height * scale;
  ctx.drawImage(image, sourceX, sourceY, sprite.crop.width, sprite.crop.height, -drawWidth / 2, height / 2 - drawHeight, drawWidth, drawHeight);
}

const playgroundImages = loadSpriteImages(PLAYGROUND_DATA.sprites);
function playgroundImageReady(kind) {
  return spriteImageReady(playgroundImages[kind]);
}

// 지금 보여 줄 장면 번호. 움직이는 동안에는 장면을 차례로 돌리고, 멈추면 restFrame을 보여 준다.
function playgroundFrame(kind) {
  const sprite = PLAYGROUND_DATA.sprites[kind];
  if (!sprite.frameCount) return 0;
  const remaining = playgroundAnimation[`${kind}Until`] - Date.now();
  if (remaining <= 0) return sprite.restFrame;
  const elapsed = PLAYGROUND_DATA.animationMs - remaining;
  return Math.floor(Math.max(0, elapsed) / sprite.frameMs) % sprite.frameCount;
}

// 놀이터 시설 그림을 그린다. 그림이 준비되지 않았으면 false를 돌려준다. ctx는 대상 중심으로 옮겨진 상태다.
function drawPlaygroundSprite(kind, width, height) {
  if (!playgroundImageReady(kind)) return false;
  drawSpriteImage(playgroundImages[kind], PLAYGROUND_DATA.sprites[kind], playgroundFrame(kind), width, height);
  return true;
}

function playgroundLayout() {
  const place = city.locations.find(place => place.id === PLAYGROUND_DATA.placeId);
  const bounds = locationBounds(place), scale = settings.worldScale;
  const convert = rectangle => ({ x: (place.x + rectangle.x) * scale, y: (place.y + rectangle.y) * scale,
    width: rectangle.width * scale, height: rectangle.height * scale });
  return {
    left: (bounds.x - bounds.width / 2 + PLAYGROUND_DATA.fenceInset) * scale,
    right: (bounds.x + bounds.width / 2 - PLAYGROUND_DATA.fenceInset) * scale,
    top: (bounds.y - bounds.height / 2 + PLAYGROUND_DATA.fenceInset) * scale,
    bottom: (bounds.y + bounds.height / 2 - PLAYGROUND_DATA.fenceInset) * scale,
    gateX: (place.x + PLAYGROUND_DATA.gateX) * scale,
    swing: convert(PLAYGROUND_DATA.swing), seesaw: convert(PLAYGROUND_DATA.seesaw),
    slide: convert(PLAYGROUND_DATA.slide), gift: convert(PLAYGROUND_DATA.gift),
  };
}

function playgroundFences(layout) {
  const { left, right, top, bottom, gateX } = layout;
  const thickness = PLAYGROUND_DATA.fenceThickness * settings.worldScale;
  const gap = PLAYGROUND_DATA.gateWidth * settings.worldScale;
  return [
    { x: (left + right) / 2, y: top, width: right - left, height: thickness },
    { x: left, y: (top + bottom) / 2, width: thickness, height: bottom - top },
    { x: right, y: (top + bottom) / 2, width: thickness, height: bottom - top },
    { x: (left + gateX - gap / 2) / 2, y: bottom, width: gateX - gap / 2 - left, height: thickness },
    { x: (gateX + gap / 2 + right) / 2, y: bottom, width: right - gateX - gap / 2, height: thickness },
  ];
}

function playgroundGiftVisible() {
  return gameState.swingUsed && gameState.seesawUsed && !gameState.acquiredItems[PLAYGROUND_DATA.toyId];
}

function playgroundTargets() {
  const layout = playgroundLayout();
  return ["swing", "seesaw", "slide", ...(playgroundGiftVisible() ? ["gift"] : [])].map(kind => ({ kind, ...layout[kind] }));
}

function hitsPlayground(x, footY, radius) {
  const layout = playgroundLayout();
  if (x < layout.left - radius * 2 || x > layout.right + radius * 2 || footY < layout.top - radius * 2 || footY > layout.bottom + radius * 2) return false;
  return [...playgroundFences(layout), ...playgroundTargets()].some(rectangle => circleHitsRectangle(x, footY, radius, rectangle));
}

function handlePlaygroundClick(x, y) {
  const target = [slideGraffitiTarget(), ...playgroundTargets()].find(rectangle => Math.abs(x - rectangle.x) <= rectangle.width / 2 && Math.abs(y - rectangle.y) <= rectangle.height / 2);
  if (!target) return false;
  const layout = playgroundLayout(), footY = player.y + player.footOffset;
  const distance = Math.hypot(Math.max(0, Math.abs(player.x - target.x) - target.width / 2), Math.max(0, Math.abs(footY - target.y) - target.height / 2));
  if (player.x <= layout.left || player.x >= layout.right || footY <= layout.top || footY >= layout.bottom || distance > PLAYGROUND_DATA.interactDistance) {
    showDoorMessage(PLAYGROUND_DATA.text.near);
    return true;
  }
  if (target.kind === "swing") {
    gameState.swingUsed = true;
    playgroundAnimation.swingUntil = Date.now() + PLAYGROUND_DATA.animationMs;
  } else if (target.kind === "seesaw") {
    gameState.seesawUsed = true;
    playgroundAnimation.seesawUntil = Date.now() + PLAYGROUND_DATA.animationMs;
  } else if (target.kind === "slide") {
    gameState.slideUsed = true;
    playgroundAnimation.slideUntil = Date.now() + PLAYGROUND_DATA.slideDetail.rideMs;
  } else if (target.kind === "graffiti") {
    openInspection({ type: "slideGraffiti", name: PLAYGROUND_DATA.text.graffiti });
  } else if (target.kind === "gift" && acquireItem(PLAYGROUND_DATA.toyId)) {
    showDoorMessage(PLAYGROUND_DATA.text.acquired);
  }
  updateAchievementConditions();
  return true;
}

function drawPlayground() {
  const layout = playgroundLayout();
  ctx.save();
  ctx.fillStyle = "#9a8b6a";
  // 도시 그림에 이미 울타리가 있으면 충돌용 울타리는 그리지 않는다.
  if (!cityMapReady()) for (const fence of playgroundFences(layout)) ctx.fillRect(fence.x - fence.width / 2, fence.y - fence.height / 2, fence.width, fence.height);
  ctx.font = "18px 'Malgun Gothic', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#4e5847";
  ctx.fillText(PLAYGROUND_DATA.text.entrance, layout.gateX, layout.bottom - 25);
  for (const target of playgroundTargets()) {
    ctx.save();ctx.translate(target.x, target.y);
    const w = target.width, h = target.height;
    ctx.strokeStyle = "#687966";ctx.lineWidth = 9;ctx.fillStyle = "#bd9166";
    if (drawPlaygroundSprite(target.kind, w, h)) {
      // 미끄럼틀은 그림 위에 표지·낙서·탑승 연출을 덧그린다. 출발 구멍은 그림에 있으므로 그리지 않는다.
      if (target.kind === "slide") drawSlideDetails(target, false);
    } else if (target.kind === "swing") {
      tracePath([[-w/2,h/2],[-w/3,-h/2],[w/3,-h/2],[w/2,h/2]]);ctx.stroke();
      const remaining = playgroundAnimation.swingUntil - Date.now();
      const offset = remaining > 0 ? Math.sin(remaining / 140) * w * 0.12 : 0;
      ctx.lineWidth = 3;
      tracePath([[-w/6,-h/2],[-w/6+offset,h/4],[w/6+offset,h/4],[w/6,-h/2]]);ctx.stroke();
      ctx.fillRect(-w/6+offset,h/4-6,w/3,12);
    } else if (target.kind === "seesaw") {
      tracePath([[0,0],[-24,h/2],[24,h/2]],true);ctx.fill();
      const remaining = playgroundAnimation.seesawUntil - Date.now();
      ctx.save();ctx.rotate(remaining > 0 ? Math.sin(remaining / 160) * 0.24 : 0);
      ctx.fillRect(-w/2,-8,w,16);ctx.restore();
    } else if (target.kind === "slide") {
      ctx.fillStyle = "#7199ad";
      tracePath([[-w/3,-h/2],[0,-h/2],[w/2,h/2],[w/4,h/2]],true);ctx.fill();
      tracePath([[-w/3,h/2],[-w/3,-h/2],[0,-h/2]]);ctx.stroke();
      for(let i=0;i<4;i++){tracePath([[-w/3,i*h/4-h/4],[-w/6,i*h/4-h/4]]);ctx.stroke();}
      drawSlideDetails(target);
    } else {
      ctx.fillStyle = "#c58b6f";ctx.fillRect(-w/2,-h/2,w,h);
      ctx.fillStyle = "#ead49b";ctx.fillRect(-10,-h/2,20,h);ctx.fillRect(-w/2,-9,w,18);
    }
    ctx.fillStyle = "#403a32";ctx.fillText(PLAYGROUND_DATA.text[target.kind],0,target.kind === "slide" ? h/2+24 : -h/2-24);
    ctx.restore();
  }
  // 서쪽 외곽의 큰 나무는 기존 도시 랜드마크 L04를 그대로 사용한다.
  ctx.restore();
}
