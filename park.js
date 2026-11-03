"use strict";

function parkLayout() {
  const place = city.locations.find(place => place.id === PARK_DATA.placeId);
  const bounds = locationBounds(place), scale = settings.worldScale;
  const convert = rect => ({ x: (place.x + rect.x) * scale, y: (place.y + rect.y) * scale, width: rect.width * scale, height: rect.height * scale });
  const inset = PARK_DATA.fenceInset * scale;
  return {
    left: (bounds.x - bounds.width / 2) * scale + inset,
    right: (bounds.x + bounds.width / 2) * scale - inset,
    top: (bounds.y - bounds.height / 2) * scale + inset,
    bottom: (bounds.y + bounds.height / 2) * scale - inset,
    gateY: place.y * scale,
    ticket: convert(PARK_DATA.ticket), shop: convert(PARK_DATA.shop), stand: convert(PARK_DATA.stand),
    center: { x: (place.x + PARK_DATA.carousel.x) * scale, y: (place.y + PARK_DATA.carousel.y) * scale },
  };
}

function parkFences(layout) {
  const thickness = PARK_DATA.fenceThickness * settings.worldScale;
  const gap = PARK_DATA.gateWidth * settings.worldScale;
  const { left, right, top, bottom, gateY } = layout;
  return [
    { x: (left + right) / 2, y: top, width: right - left, height: thickness },
    { x: (left + right) / 2, y: bottom, width: right - left, height: thickness },
    { x: right, y: (top + bottom) / 2, width: thickness, height: bottom - top },
    { x: left, y: (top + gateY - gap / 2) / 2, width: thickness, height: gateY - gap / 2 - top },
    { x: left, y: (bottom + gateY + gap / 2) / 2, width: thickness, height: bottom - gateY - gap / 2 },
  ];
}

function hitsPark(x, footY, radius) {
  const layout = parkLayout();
  if (x < layout.left - radius * 2 || x > layout.right + radius * 2 || footY < layout.top - radius * 2 || footY > layout.bottom + radius * 2) return false;
  if (Math.hypot(x - layout.center.x, footY - layout.center.y) < PARK_DATA.carousel.platformRadius * settings.worldScale + radius) return true;
  return [...parkFences(layout), layout.ticket, layout.shop, layout.stand].some(rect => circleHitsRectangle(x, footY, radius, rect));
}

function carouselRides() {
  const config = PARK_DATA.carousel, center = parkLayout().center;
  const total = config.horseCount + config.carriageCount;
  return Array.from({ length: total }, (_, index) => {
    const angle = index * Math.PI * 2 / total;
    const carriage = Math.floor((index + 1) * config.carriageCount / total) > Math.floor(index * config.carriageCount / total);
    return { x: center.x + Math.cos(angle) * config.rideRadius * settings.worldScale,
      y: center.y + Math.sin(angle) * config.rideRadius * settings.worldScale, type: carriage ? "carriage" : "horse" };
  });
}

function carouselOccluders() {
  const config = PARK_DATA.carousel, center = parkLayout().center;
  return [{ ...center, radius: config.coreRadius * settings.worldScale }, ...Array.from({ length: config.pillarCount }, (_, i) => ({
    x: center.x + Math.cos(i * Math.PI * 2 / config.pillarCount) * config.pillarOrbit * settings.worldScale,
    y: center.y + Math.sin(i * Math.PI * 2 / config.pillarCount) * config.pillarOrbit * settings.worldScale,
    radius: config.pillarRadius * settings.worldScale,
  }))];
}

function visibleCarouselRide(ride) {
  return !carouselOccluders().some(obstacle => distanceToSegment(obstacle.x, obstacle.y,
    [player.x, player.y + player.footOffset], [ride.x, ride.y]) < obstacle.radius);
}

function handleParkClick(x, y) {
  const layout = parkLayout();
  const headband = { x: layout.ticket.x, y: layout.ticket.y, width: 80, height: 60 };
  const hit = rectangle => Math.abs(x - rectangle.x) <= rectangle.width / 2 && Math.abs(y - rectangle.y) <= rectangle.height / 2;
  const balloon = PARK_DATA.balloon;
  const balloonHit = { x: layout.stand.x, y: layout.stand.y + balloon.offsetY, width: 2 * (balloon.radiusX + balloon.clickPadding), height: 2 * (balloon.radiusY + balloon.clickPadding) };
  const balloonAvailable = gameState.carouselSolved && !gameState.acquiredItems[PARK_DATA.balloonId];
  const isBalloon = (balloonAvailable && hit(balloonHit)) || (gameState.playgroundMemoPending && hit(layout.stand));
  const target = isBalloon ? layout.stand : hit(headband) ? headband : hit(layout.shop) ? layout.shop : null;
  if (!target) return false;
  const distance = Math.hypot(Math.max(0, Math.abs(player.x - target.x) - target.width / 2), Math.max(0, Math.abs(player.y + player.footOffset - target.y) - target.height / 2));
  // 울타리 밖에서 조사하지 못하도록 현재 위치가 공원 안인지도 검사한다.
  const inside = player.x > layout.left && player.x < layout.right && player.y + player.footOffset > layout.top && player.y + player.footOffset < layout.bottom;
  if (!inside || distance > PARK_DATA.interactDistance) showDoorMessage(PARK_DATA.text.near);
  else if (isBalloon) collectParkBalloon();
  else if (target === headband) showDoorMessage(acquireItem(PARK_DATA.headbandId) ? PARK_DATA.text.acquired : PARK_DATA.text.already);
  else openInspection({ type: "carousel", name: PARK_DATA.text.lock });
  return true;
}

function drawPark() {
  const layout = parkLayout(), config = PARK_DATA.carousel;
  ctx.save();
  const rectangle = (rect, color) => { ctx.fillStyle = color; ctx.fillRect(rect.x - rect.width / 2, rect.y - rect.height / 2, rect.width, rect.height); };
  for (const fence of parkFences(layout)) rectangle(fence, "#8f7861");
  ctx.font = "18px 'Malgun Gothic', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const [rect, name, color] of [[layout.ticket, PARK_DATA.text.ticket, "#b38c72"], [layout.shop, PARK_DATA.text.shop, "#86a493"], [layout.stand, PARK_DATA.text.stand, "#a1947d"]]) {
    rectangle(rect, color); ctx.fillStyle = "#403a32"; ctx.fillText(name, rect.x, rect.y - rect.height / 2 - 22);
  }
  if (!gameState.acquiredItems[PARK_DATA.headbandId]) {
    ctx.strokeStyle = "#efd682"; ctx.lineWidth = 12; ctx.beginPath();
    ctx.arc(layout.ticket.x, layout.ticket.y + 12, 24, Math.PI, Math.PI * 2); ctx.stroke();
  }
  fillEllipse(layout.center.x, layout.center.y, config.platformRadius * settings.worldScale, config.platformRadius * settings.worldScale, "#dec5a2");
  for (const ride of carouselRides()) {
    if (!visibleCarouselRide(ride)) continue;
    if (ride.type === "horse") {
      rectangle({ ...ride, width: 58, height: 25 }, "#936443");
      rectangle({ x: ride.x + 20, y: ride.y - 18, width: 20, height: 35 }, "#936443");
      for (const offset of [-18, 18]) rectangle({ x: ride.x + offset, y: ride.y + 18, width: 8, height: 24 }, "#664b39");
    } else {
      rectangle({ ...ride, width: 70, height: 42 }, "#628fa6");
      for (const offset of [-23, 23]) fillEllipse(ride.x + offset, ride.y + 25, 10, 10, "#3d4c58");
    }
  }
  for (const obstacle of carouselOccluders()) fillEllipse(obstacle.x, obstacle.y, obstacle.radius, obstacle.radius, "#9c7d72");
  ctx.fillStyle = "#fff4df"; ctx.fillText(PARK_DATA.text.carousel, layout.center.x, layout.center.y);
  if (gameState.carouselSolved && !gameState.acquiredItems[PARK_DATA.balloonId]) {
    ctx.strokeStyle = "#61584c"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(layout.stand.x, layout.stand.y); ctx.lineTo(layout.stand.x, layout.stand.y - 90); ctx.stroke();
    fillEllipse(layout.stand.x, layout.stand.y + PARK_DATA.balloon.offsetY, PARK_DATA.balloon.radiusX, PARK_DATA.balloon.radiusY, "#d88b8b");
  }
  ctx.restore();
}
