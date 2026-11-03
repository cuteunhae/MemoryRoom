"use strict";

const bubbleEffect = { particles: [], pointerId: null, lastCreatedAt: -Infinity };

function canUseBubbleToy() {
  return !isGameInputBlocked() && gameState.inventory.selectedItemId === PLAYGROUND_DATA.toyId &&
    gameState.inventory.itemIds.includes(PLAYGROUND_DATA.toyId);
}

function emitBearBubble() {
  if (!canUseBubbleToy() || Date.now() - bubbleEffect.lastCreatedAt < BUBBLE_DATA.intervalMs) return false;
  const bounds = currentInterior() || world, radius = BUBBLE_DATA.radius;
  const offset = (bubbleEffect.particles.length % 3 - 1) * radius;
  bubbleEffect.particles.push({
    x: Math.max(radius, Math.min(bounds.width - radius, player.x + offset)),
    y: Math.max(radius, Math.min(bounds.height - radius, player.y - 80)),
    createdAt: Date.now(), interiorId: scene.interiorId, floor: scene.schoolFloor,
  });
  bubbleEffect.particles = bubbleEffect.particles.slice(-BUBBLE_DATA.maxCount);
  bubbleEffect.lastCreatedAt = Date.now();
  return true;
}

function startBubbleDrag(event, x, y) {
  if (!canUseBubbleToy() || event.button !== 0) return;
  if (!canStand(x, y - player.footOffset)) return;
  emitBearBubble();
  bubbleEffect.pointerId = event.pointerId;
  if (event.pointerId !== undefined) canvas.setPointerCapture(event.pointerId);
}

function stopBubbleDrag() {
  const id = bubbleEffect.pointerId;
  bubbleEffect.pointerId = null;
  if (id !== null && id !== undefined && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
}

function clearBubbleEffects() {
  stopBubbleDrag();
  bubbleEffect.particles = [];
}

function initBubbleInput() {
  canvas.addEventListener("pointermove", event => {
    if (bubbleEffect.pointerId === null || event.pointerId !== bubbleEffect.pointerId) return;
    if (!(event.buttons & 1) || !canUseBubbleToy()) return stopBubbleDrag();
    const rect = canvas.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientY < rect.top || event.clientX > rect.left + rect.width || event.clientY > rect.top + rect.height) return;
    emitBearBubble();
  });
  for(const name of ["pointerup", "pointercancel", "lostpointercapture"]) canvas.addEventListener(name, event => {
    if(event.pointerId === bubbleEffect.pointerId) stopBubbleDrag();
  });
  window.addEventListener("blur",stopBubbleDrag);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)stopBubbleDrag();});
}

function drawBearBubbles() {
  bubbleEffect.particles = bubbleEffect.particles.filter(bubble => Date.now() - bubble.createdAt < BUBBLE_DATA.lifetimeMs);
  ctx.save();
  for (const bubble of bubbleEffect.particles) {
    if (bubble.interiorId !== scene.interiorId || bubble.floor !== scene.schoolFloor) continue;
    const age = (Date.now() - bubble.createdAt) / 1000;
    ctx.save();
    ctx.translate(bubble.x, Math.max(BUBBLE_DATA.radius, bubble.y - age * BUBBLE_DATA.riseSpeed));
    ctx.scale(BUBBLE_DATA.radius / 52, BUBBLE_DATA.radius / 52);
    const x = 0, y = 0;
    ctx.globalAlpha = Math.min(1,(BUBBLE_DATA.lifetimeMs/1000-age)*2);
    // TODO: 둥근 귀·갈색 털·파란 리본을 가진 곰 인형 임시 그림.
    fillEllipse(x,y,52,52,"#d3eff34d");
    ctx.strokeStyle = "#d8f5ff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,52,0,Math.PI*2);ctx.stroke();
    drawBearDoll();
    ctx.restore();
  }
  ctx.restore();
}

function drawBearDoll() {
  const x=0,y=0,bear=BUBBLE_DATA.bear;
    fillEllipse(x,y+15,22,25,bear.fur);
    for(const side of [-1,1]) {
      fillEllipse(x+side*21,y-25,11,11,bear.fur);
      fillEllipse(x+side*23,y+11,10,14,bear.fur);
      fillEllipse(x+side*13,y+34,11,8,bear.fur);
    }
    fillEllipse(x,y-12,25,23,bear.fur);
    fillEllipse(x,y-4,12,9,bear.muzzle);
    for(const side of [-1,1])fillEllipse(x+side*8,y-15,2.5,3,bear.outline);
    fillEllipse(x,y-7,3,2,bear.outline);
    ctx.fillStyle=bear.ribbon;
    tracePath([[x,y+13],[x-15,y+5],[x-15,y+21]],true);ctx.fill();
    tracePath([[x,y+13],[x+15,y+5],[x+15,y+21]],true);ctx.fill();
    fillEllipse(x,y+13,4,4,bear.ribbon);
}
