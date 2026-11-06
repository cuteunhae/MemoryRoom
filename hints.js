"use strict";

const hintUi = { open: false, current: null };
const hintRuntime = { lastTick: Date.now(), lastCheckpoint: Date.now(), active: !document.hidden, known: new Set() };

function hintProgressTokens() {
  return [...Object.keys(gameState.acquiredItems).filter(id => gameState.acquiredItems[id]).map(id => `item:${id}`),
    ...HINT_DATA.progressFlags.filter(flag => gameState[flag]), ...gameState.hints.clues.map(id => `clue:${id}`)];
}

function syncHintProgress() {
  const tokens = hintProgressTokens();
  const changed = tokens.some(token => !hintRuntime.known.has(token));
  hintRuntime.known = new Set(tokens);
  if (changed) {
    gameState.hints.lastProgressAt = Date.now();
    gameState.hints.idleMs = 0;
    gameState.hints.received = [];
    hintRuntime.lastTick = Date.now();
  }
  return changed;
}

function initializeHintSession() {
  hintRuntime.known = new Set(hintProgressTokens());
  hintRuntime.lastTick = hintRuntime.lastCheckpoint = Date.now();
  hintRuntime.active = !document.hidden && (!document.hasFocus || document.hasFocus());
  hintUi.open = false;
  hintUi.current = null;
  renderHintButton();
}

function markHintClue(id) {
  if (!HINT_DATA.clueIds.includes(id) || gameState.hints.clues.includes(id)) return;
  gameState.hints.clues.push(id);
  syncHintProgress();
  if (typeof saveProgress === "function") saveProgress();
}

function recordInspectionHint() {
  const mode = inspectionUiState.mode;
  if (HINT_DATA.clueModes[mode]) markHintClue(HINT_DATA.clueModes[mode]);
  if (mode === "photo") markHintClue(inspectionUiState.back ? "photo-back" : "photo-front");
  if (mode === "desk" && inspectionUiState.object.number === 1) markHintClue("desk-one");
}

function insideHintClassroom() {
  if (scene.interiorId !== SCHOOL_DATA.placeId || scene.schoolFloor !== CLASSROOM_DATA.floor) return false;
  const room = classroomRoom(), y = player.y + player.footOffset;
  return player.x > room.x && player.x < room.x+room.width && y > room.y && y < room.y+room.height;
}

function hintCandidates() {
  const result = [], has = key => !!gameState.acquiredItems[HINT_DATA.items[key]];
  const add = (id, target = null, floor = null) => {
    const entry = HINT_DATA.entries.find(entry => entry.id === id);
    result.push({ ...entry, target, floor });
  };
  if (!has("photo")) add("HNT-01", INSPECTION_OBJECTS.find(object => object.type === "album"));
  if (!has("notebook") || !has("crayon")) {
    if (insideHintClassroom() || gameState.hints.clues.includes("class-nine")) add("HNT-03", classroomObjects().find(object => object.number === 1), CLASSROOM_DATA.floor);
    else add("HNT-02", SCHOOL_DATA.objects.find(object => object.type === "board"), 1);
  }
  // 필요한 크레파스가 없으면 명부 대신 교실에서 물건을 찾는 활동이 후보가 된다.
  if (!gameState.registrySolved && has("crayon")) add("HNT-04", INSPECTION_OBJECTS.find(object => object.type === "registry"), 1);
  const park = parkLayout(), playground = playgroundLayout();
  if (!has("headband")) add("HNT-09", park.ticket);
  if (!gameState.carouselSolved) add("HNT-05", park.center);
  else if (!has("balloon")) add("HNT-10", park.stand);
  else if (!has("memo") || !gameState.playgroundMemoViewed) add("HNT-11", park.stand);
  if (!gameState.swingUsed || !gameState.seesawUsed) add("HNT-06", gameState.swingUsed ? playground.seesaw : playground.swing);
  else if (!has("toy")) add("HNT-12", playground.gift);
  if (!gameState.slideUsed) add("HNT-13", playground.slide);
  const homeNeeded = !has("bear") || CABINET_DATA.answer.every(id => gameState.acquiredItems[id]);
  if (!gameState.endingReached && homeNeeded) {
    if (scene.interiorId !== HOUSE_DATA.placeId) add("HNT-07");
    else if (!has("bear")) add("HNT-14", HOUSE_DATA.dolls.find(doll => doll.itemId === HINT_DATA.items.bear));
    else if (!gameState.cabinetSolved && CABINET_DATA.answer.every(id => gameState.acquiredItems[id])) add("HNT-08", HOUSE_DATA.cabinet);
    else if (gameState.cabinetSolved && !gameState.childRoomUnlocked) add("HNT-15", houseDoor(HOUSE_DATA.rooms.find(room => room.id === "child")));
    else if (gameState.childRoomUnlocked) add("HNT-16", DIARY_DATA.book);
  }
  return result;
}

function chooseHint() {
  const rank = candidate => {
    const same = candidate.placeId === scene.interiorId;
    const place = city.locations.find(place => place.id === candidate.placeId);
    const target = same ? candidate.target : scene.interiorId ? place :
      ([PARK_DATA.placeId, PLAYGROUND_DATA.placeId].includes(candidate.placeId) && candidate.target ? candidate.target : { x: place.x*settings.worldScale, y: place.y*settings.worldScale });
    const origin = scene.interiorId && !same ? city.locations.find(place => place.id === scene.interiorId) : player;
    const priority = same ? (!candidate.floor || candidate.floor === scene.schoolFloor ? 0 : 1) : 2;
    return [priority, target ? Math.hypot(origin.x-target.x, origin.y-target.y) : 0];
  };
  // 이번 대기 동안 이미 받은 힌트는 빼고, 다음으로 가까운 할 일을 고른다.
  return hintCandidates().filter(candidate => !gameState.hints.received.includes(candidate.id)).sort((a,b) => { const ar=rank(a),br=rank(b); return ar[0]-br[0] || ar[1]-br[1]; })[0] || null;
}

// 대기 시간이 한 번 지날 때마다 받을 수 있는 힌트가 하나씩 늘어난다. 최대 maxHints개다.
function unlockedHintCount() {
  const wait = city.debug ? HINT_DATA.debugWaitMs : HINT_DATA.waitMs;
  return Math.min(HINT_DATA.maxHints, Math.floor(gameState.hints.idleMs / wait));
}
function hintReady() { return gameState.hints.received.length < unlockedHintCount(); }
function renderHintButton() {
  const gift = document.getElementById("hint-gift");
  gift.hidden = !hintReady() || !chooseHint();
  gift.disabled = isGameInputBlocked();
  document.getElementById("hint-history").disabled = isGameInputBlocked();
}

function updateHintClock() {
  const now = Date.now();
  if (hintRuntime.active && !document.hidden) gameState.hints.idleMs += Math.max(0, now-hintRuntime.lastTick);
  hintRuntime.lastTick = now;
}

function updateHints() {
  updateHintClock();
  if (insideHintClassroom()) markHintClue("class-nine");
  const changed = syncHintProgress();
  renderHintButton();
  if (typeof saveProgress === "function" && (changed || Date.now()-hintRuntime.lastCheckpoint >= HINT_DATA.checkpointMs)) {
    hintRuntime.lastCheckpoint = Date.now();
    if (hintRuntime.active || changed) saveProgress();
  }
}

function openHints(receive) {
  if (isGameInputBlocked()) return;
  updateHintClock();
  const selected = receive && hintReady() ? chooseHint() : null;
  if (receive && !selected) return;
  if (selected) gameState.hints.received.push(selected.id);
  if (selected && !gameState.hints.history.includes(selected.id)) gameState.hints.history.push(selected.id);
  hintUi.current = selected?.id || null;
  hintUi.open = true;
  stopBubbleDrag();
  pressedKeys.clear();
  const list = document.getElementById("hint-list");
  list.replaceChildren();
  document.getElementById("hint-current").textContent = selected ? selected.text : HINT_DATA.text.empty;
  document.getElementById("hint-current").hidden = !selected && gameState.hints.history.length > 0;
  for (const id of gameState.hints.history) {
    const row = document.createElement("li");
    row.textContent = HINT_DATA.entries.find(entry => entry.id === id).text;
    list.append(row);
  }
  document.getElementById("hint-dialog").showModal();
  document.getElementById("hint-close").focus();
  if (typeof saveProgress === "function") saveProgress();
}

function closeHints() {
  hintUi.open = false;
  document.getElementById("hint-dialog").close();
  pressedKeys.clear();
  canvas.focus();
  renderHintButton();
}

document.getElementById("hint-gift").textContent = HINT_DATA.text.gift;
document.getElementById("hint-gift").setAttribute("aria-label", HINT_DATA.text.available);
document.getElementById("hint-history").textContent = HINT_DATA.text.history;
document.getElementById("hint-title").textContent = HINT_DATA.text.title;
document.getElementById("hint-previous").textContent = HINT_DATA.text.previous;
document.getElementById("hint-close").textContent = HINT_DATA.text.close;
document.getElementById("hint-gift").addEventListener("click", () => openHints(true));
document.getElementById("hint-history").addEventListener("click", () => openHints(false));
document.getElementById("hint-close").addEventListener("click", closeHints);
document.getElementById("hint-dialog").addEventListener("cancel", event => event.preventDefault());
function setHintActive(active) {
  updateHintClock();
  hintRuntime.active = active;
  hintRuntime.lastTick = Date.now();
  if (typeof saveProgress === "function") saveProgress();
}
window.addEventListener("blur", () => setHintActive(false));
window.addEventListener("focus", () => setHintActive(!document.hidden));
document.addEventListener("visibilitychange", () => setHintActive(!document.hidden && (!document.hasFocus || document.hasFocus())));
initializeHintSession();
