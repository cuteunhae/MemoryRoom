"use strict";

const playgroundAnimation = { swingUntil: 0, seesawUntil: 0, slideUntil: 0 };

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
  for (const fence of playgroundFences(layout)) ctx.fillRect(fence.x - fence.width / 2, fence.y - fence.height / 2, fence.width, fence.height);
  ctx.font = "18px 'Malgun Gothic', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#4e5847";
  ctx.fillText(PLAYGROUND_DATA.text.entrance, layout.gateX, layout.bottom - 25);
  for (const target of playgroundTargets()) {
    ctx.save();ctx.translate(target.x, target.y);
    const w = target.width, h = target.height;
    ctx.strokeStyle = "#687966";ctx.lineWidth = 9;ctx.fillStyle = "#bd9166";
    if (target.kind === "swing") {
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
