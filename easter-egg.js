"use strict";

function nearEasterShop() {
  if (scene.interiorId !== null) return false;
  const p = EASTER_EGG_DATA.approach;
  return Math.hypot(player.x / settings.worldScale - p.x,
    (player.y + player.footOffset) / settings.worldScale - p.y) <= EASTER_EGG_DATA.interactDistance;
}

function easterOwnerObject() {
  const d = EASTER_EGG_DATA, p = d.owner, scale = settings.worldScale;
  return { id: d.id, type: "dialogue", name: d.text.owner,
    hintPoint: { x: d.hint.x * scale, y: d.hint.y * scale },
    x: p.x * scale, y: p.y * scale, width: p.width * scale, height: p.height * scale,
    messages: { dialogue: d.text.dialogue.join("\n"), keyHint: d.text.keyHint, keyHintClick: d.text.keyHintClick } };
}

function meetEasterOwner() {
  if (isGameInputBlocked() || !nearEasterShop()) return false;
  gameState.easterEgg.shopMet = true;
  openInspection(easterOwnerObject());
  saveProgress();
  return true;
}

function updateEasterEgg() {
  if (gameState.easterEgg.shopMet || isGameInputBlocked() || scene.interiorId !== null || document.hidden) return;
  const p = EASTER_EGG_DATA.approach;
  if (Math.hypot(player.x / settings.worldScale - p.x,
    (player.y + player.footOffset) / settings.worldScale - p.y) <= EASTER_EGG_DATA.autoDistance) meetEasterOwner();
}

function handleEasterClick(x, y) {
  if (scene.interiorId !== null) return false;
  const d = EASTER_EGG_DATA, lx = x / settings.worldScale, ly = y / settings.worldScale;
  const hit = r => Math.abs(lx - r.x) <= r.width / 2 + d.clickPadding && Math.abs(ly - r.y) <= r.height / 2 + d.clickPadding;
  if (!hit(d.shop)) return false;
  if (!nearEasterShop()) { showDoorMessage(d.text.tooFar); return true; }
  if (!gameState.easterEgg.shopMet || !hit(d.snack)) return meetEasterOwner();
  if (acquireItem(d.itemId)) showDoorMessage(d.text.acquired);
  openInspection({ type: d.viewer, name: d.text.snack, rewardId: d.itemId });
  return true;
}

// TODO: 문방구 외관·주인·진열 물건은 교체 가능한 임시 도형이다.
function drawEasterShop() {
  const d = EASTER_EGG_DATA, s = d.shop;
  ctx.save(); ctx.scale(settings.worldScale, settings.worldScale);
  if (s.sprite && drawObjectSprite(s)) { ctx.restore(); return; }
  ctx.translate(s.x - s.width / 2, s.y - s.height / 2);
  ctx.fillStyle = "#a97752"; ctx.fillRect(0, 0, s.width, s.height);
  ctx.fillStyle = "#f2ddb0"; ctx.fillRect(3, 3, s.width - 6, s.height - 6);
  ctx.fillStyle = "#687f70"; ctx.fillRect(0, 0, s.width, 14);
  ctx.font = "bold 8px 'Malgun Gothic', sans-serif"; ctx.textAlign = "center";
  ctx.fillStyle = "#fff2cc"; ctx.fillText(d.text.shop, s.width / 2, 10);
  ctx.fillStyle = "#624c40"; ctx.fillRect(24, 19, 65, 30);
  ctx.fillStyle = "#d1bd93"; ctx.fillRect(5, 20, 16, 28);
  ctx.font = "5px 'Malgun Gothic', sans-serif"; ctx.fillStyle = "#5d4637"; ctx.fillText(d.text.draw, 13, 26);
  for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? "#e3a39a" : "#e9d27b"; ctx.fillRect(7 + i % 2 * 7, 29 + Math.floor(i / 2) * 6, 5, 4); }
  // 창가의 주인과 작은 앞치마.
  ctx.fillStyle = "#727372"; ctx.beginPath(); ctx.arc(35, 29, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#edc49e"; ctx.beginPath(); ctx.arc(35, 33, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#9db1a0"; ctx.fillRect(26, 39, 18, 12);
  ctx.fillStyle = "#46392e"; ctx.fillRect(32, 32, 1, 1); ctx.fillRect(38, 32, 1, 1);
  ctx.fillStyle = "#bc9366"; ctx.fillRect(0, 48, s.width, 12);
  // 공책·지우개·간식 바구니.
  for (let i = 0; i < 3; i++) { ctx.fillStyle = ["#8ea9af", "#c8998c", "#e4d29b"][i]; ctx.fillRect(6 + i * 5, 45 - i, 13, 6); }
  ctx.fillStyle = "#f5e9d5"; ctx.fillRect(27, 49, 7, 4);
  ctx.fillStyle = "#976a42"; ctx.fillRect(45, 47, 34, 12);
  ctx.fillStyle = "#e7c566"; ctx.fillRect(51, 44, 20, 14);
  ctx.font = "5px 'Malgun Gothic', sans-serif"; ctx.fillStyle = "#684635"; ctx.fillText(d.text.snack, 61, 53);
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
    const button = document.createElement("button"); button.type = "button"; button.className = "snack-star";
    button.dataset.starId = star.id; button.setAttribute("aria-label", d.text.star);
    button.style.left = `${star.x}%`; button.style.top = `${star.y}%`;
    const candy = document.createElement("span"); candy.className = "snack-star-shape"; candy.setAttribute("aria-hidden", "true");
    const glow = document.createElement("img"); glow.src = d.sparkleImage; glow.alt = ""; glow.className = "snack-star-glow";
    button.append(candy, glow);
    button.addEventListener("click", () => {
      glow.getAnimations().forEach(animation => animation.cancel());
      glow.animate([{ opacity: 0, transform: "scale(.6) rotate(-15deg)" },
        { opacity: 1, transform: "scale(1.15) rotate(0deg)", offset: .35 },
        { opacity: 0, transform: "scale(1.4) rotate(15deg)" }], { duration: d.sparkleMs });
    });
    panel.append(button);
  }
}
