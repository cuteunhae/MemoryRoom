"use strict";

// 한 번 연 봉지에서 모은 별만 센다. 부분 수집 기록은 저장하지 않는다.
const snackCollection = new Set();

function inEasterShop() { return scene.interiorId === EASTER_EGG_DATA.interior.placeId; }

function nearEasterShop() {
  if (!inEasterShop()) return false;
  const p = EASTER_EGG_DATA.counter;
  return Math.hypot(Math.max(0, Math.abs(player.x - p.x) - p.width / 2),
    Math.max(0, Math.abs(player.y + player.footOffset - p.y) - p.height / 2)) <= EASTER_EGG_DATA.interactDistance;
}

function easterOwnerObject() {
  const d = EASTER_EGG_DATA;
  return { id: d.id, type: "dialogue", name: d.text.owner, ...d.owner,
    messages: { dialogue: d.text.dialogue.join("\n"), keyHint: d.text.keyHint, keyHintClick: d.text.keyHintClick } };
}

function meetEasterOwner() {
  if (isGameInputBlocked() || !nearEasterShop()) return false;
  gameState.easterEgg.shopMet = true;
  openInspection(easterOwnerObject()); saveProgress();
  return true;
}

function updateEasterEgg() {
  if (isGameInputBlocked() || document.hidden || Date.now() < scene.nextTransitionAt) return;
  const d = EASTER_EGG_DATA;
  if (scene.interiorId === null) {
    const x = player.x / settings.worldScale, footY = (player.y + player.footOffset) / settings.worldScale;
    if (!insideRect(x, footY, d.entrance)) return;
    const r = d.returnPoint, room = d.interior;
    scene.returnPoint = { x: r.x * settings.worldScale, y: r.footY * settings.worldScale - player.footOffset, facing: r.facing };
    scene.interiorId = room.placeId; scene.schoolFloor = 1;
    player.x = room.spawn.x; player.y = room.spawn.footY - player.footOffset; player.facing = room.spawn.facing;
    finishMapTransition();
  } else if (inEasterShop()) {
    if (insideRect(player.x, player.y + player.footOffset, d.interior.exit)) { exitInterior(); return; }
    if (!gameState.easterEgg.shopMet && nearEasterShop()) meetEasterOwner();
  }
}

function handleEasterClick(x, y) {
  if (!inEasterShop()) return false;
  const d = EASTER_EGG_DATA;
  const snack = insideRect(x, y, d.snack, d.clickPadding);
  if (!snack && !insideRect(x, y, d.counter) && !insideRect(x, y, d.owner, d.clickPadding)) return false;
  if (!nearEasterShop()) { showDoorMessage(d.text.tooFar); return true; }
  if (!gameState.easterEgg.shopMet || !snack) return meetEasterOwner();
  if (acquireItem(d.itemId)) showDoorMessage(d.text.acquired);
  openInspection({ type: d.viewer, name: d.text.snack, rewardId: d.itemId });
  return true;
}

function hitsEasterFurniture(x, footY, radius) {
  return [EASTER_EGG_DATA.counter, EASTER_EGG_DATA.owner, ...EASTER_EGG_DATA.shelves]
    .some(rect => circleHitsRectangle(x, footY, radius, rect));
}

// TODO: 작은 문방구 실내와 진열 물건은 최종 에셋으로 교체할 임시 도형이다.
function drawEasterInterior() {
  const d = EASTER_EGG_DATA, room = d.interior;
  const rect = (r, color) => { ctx.fillStyle = color; ctx.fillRect(r.x-r.width/2,r.y-r.height/2,r.width,r.height); };
  ctx.save();
  ctx.fillStyle = room.wallColor; ctx.fillRect(0,0,room.width,room.height);
  ctx.fillStyle = room.floorColor; ctx.fillRect(room.wall,room.wall,room.width-room.wall*2,room.height-room.wall*2);
  ctx.strokeStyle = "#cbb58b"; ctx.lineWidth = 1;
  for (let y=60;y<room.height-room.wall;y+=45) { ctx.beginPath();ctx.moveTo(room.wall,y);ctx.lineTo(room.width-room.wall,y);ctx.stroke(); }
  ctx.textAlign = "center";ctx.textBaseline = "middle";ctx.font = "bold 24px 'Malgun Gothic', sans-serif";
  ctx.fillStyle = "#514636";ctx.fillText(d.text.shop,room.width/2,50);
  for(const shelf of d.shelves) {
    rect(shelf,"#a5825e");
    ctx.fillStyle="#514636";ctx.font="16px 'Malgun Gothic', sans-serif";ctx.fillText(d.text[shelf.kind],shelf.x,shelf.y-shelf.height/2-18);
    for(let row=0;row<4;row++) for(let col=0;col<3;col++) {
      const x=shelf.x-36+col*30, y=shelf.y-130+row*75;
      ctx.fillStyle=["#b8c9b2","#ead6ad","#caa5a0"][col];ctx.fillRect(x,y,24,shelf.kind==="draw"?42:52);
      if(shelf.kind==="stationery") {ctx.fillStyle="#fff3db";ctx.fillRect(x+2,y+19,20,6);}
    }
  }
  // 주인 이미지를 판매대 뒤에 그린다. 불러오지 못했을 때만 임시 도형을 쓴다.
  if (!drawObjectSprite(d.owner)) {
  rect(d.owner,"#9cae93");
  ctx.fillStyle="#71665b";ctx.beginPath();ctx.arc(d.owner.x,d.owner.y-25,25,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#e6bd95";ctx.beginPath();ctx.arc(d.owner.x,d.owner.y-18,20,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#493e33";ctx.fillRect(d.owner.x-8,d.owner.y-22,3,3);ctx.fillRect(d.owner.x+6,d.owner.y-22,3,3);
  }
  rect(d.counter,"#ab8057");
  ctx.fillStyle="#f2ddb7";ctx.font="16px 'Malgun Gothic', sans-serif";ctx.fillText(d.text.owner,d.counter.x-75,d.counter.y+15);
  rect({...d.snack,width:90,height:60},"#80613d");
  if (!drawObjectSprite(d.snack)) {
  rect(d.snack,"#e7c566");
  ctx.fillStyle="#58462e";ctx.font="13px 'Malgun Gothic', sans-serif";ctx.fillText(d.text.snack,d.snack.x,d.snack.y);
  }
  rect(d.interior.exit,"#687f70");ctx.fillStyle="#fff3d7";ctx.font="17px 'Malgun Gothic', sans-serif";
  ctx.fillText(d.text.exit,d.interior.exit.x,d.interior.exit.y);
  ctx.restore();
}

function renderEasterPanel() {
  const panel = document.getElementById("easter-snack-panel"), d = EASTER_EGG_DATA;
  panel.hidden = inspectionUiState.mode !== d.viewer;
  panel.replaceChildren();
  if (panel.hidden) return;
  inspectionMessage.textContent = d.text.look;
  for (const crumb of d.crumbs) {
    const piece = document.createElement("span"); piece.className = "snack-crumb";
    piece.style.left = `${crumb.x}%`; piece.style.top = `${crumb.y}%`; piece.style.transform = `rotate(${crumb.turn}deg)`;
    piece.setAttribute("aria-hidden", "true"); panel.append(piece);
  }
  for (const star of d.stars) {
    if (snackCollection.has(star.id)) continue;
    const button = document.createElement("button"); button.type = "button"; button.className = "snack-star";
    button.dataset.starId = star.id; button.setAttribute("aria-label", d.text.star);
    button.style.left = `${star.x}%`; button.style.top = `${star.y}%`;
    const candy = document.createElement("span"); candy.className = "snack-star-shape"; candy.setAttribute("aria-hidden", "true");
    const glow = document.createElement("img"); glow.src = d.sparkleImage; glow.alt = ""; glow.className = "snack-star-glow";
    button.append(candy, glow);
    button.addEventListener("click", () => {
      if (inspectionUiState.mode !== d.viewer || snackCollection.has(star.id)) return;
      snackCollection.add(star.id);
      button.disabled = true; candy.hidden = true;
      if (d.stars.every(entry => snackCollection.has(entry.id))) {
        gameState.easterEgg.starsCompleted = true;
        updateAchievementConditions();
      }
      glow.getAnimations().forEach(animation => animation.cancel());
      const animation = glow.animate([{ opacity: 0, transform: "scale(.6) rotate(-15deg)" },
        { opacity: 1, transform: "scale(1.15) rotate(0deg)", offset: .35 },
        { opacity: 0, transform: "scale(1.4) rotate(15deg)" }], { duration: d.sparkleMs });
      animation.onfinish = () => { button.hidden = true; };
      const next = panel.querySelector(".snack-star:not(:disabled)");
      (next || inspectionClose).focus();
    });
    panel.append(button);
  }
}
