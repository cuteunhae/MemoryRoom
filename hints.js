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
    // 사용자 결정: 크레파스 힌트는 게시판·배치도 힌트 다음 순서다.
    add("HNT-18", classroomObjects().find(object => object.number === 1), CLASSROOM_DATA.floor);
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
  const homeNeeded = !has("bear") || CABINET_DATA.answer.every(id => gameState.acquiredItems[id]);
  // 사용자 결정: 집에 들어가기 전, HNT-14~17보다 먼저 집 외곽 힌트(HNT-13)를 준다.
  // HNT-14(미끄럼틀)는 놀이터 힌트라 장소 순서로는 먼저 나오므로, HNT-13을 받을 때까지 후보에서 뺀다.
  const outerHintPending = !gameState.endingReached && homeNeeded && scene.interiorId !== HOUSE_DATA.placeId && !gameState.hints.received.includes("HNT-13");
  if (!gameState.slideUsed && !outerHintPending) add("HNT-14", playground.slide);
  if (!gameState.endingReached && homeNeeded) {
    if (scene.interiorId !== HOUSE_DATA.placeId) {
      add("HNT-07");
      // 사용자 결정: 집 힌트(HNT-07) 다음에 침대 위 인형을 찾는 힌트(HNT-19)를 준다.
      if (!has("bear")) add("HNT-19", HOUSE_DATA.dolls.find(doll => doll.itemId === HINT_DATA.items.bear));
      add("HNT-13");
    } else if (!has("bear")) {
      const bear = HOUSE_DATA.dolls.find(doll => doll.itemId === HINT_DATA.items.bear);
      add("HNT-19", bear);
      add("HNT-15", bear);
    }
    else if (!gameState.cabinetSolved && CABINET_DATA.answer.every(id => gameState.acquiredItems[id])) add("HNT-08", HOUSE_DATA.cabinet);
    else if (gameState.cabinetSolved && !gameState.childRoomUnlocked) add("HNT-16", houseDoor(HOUSE_DATA.rooms.find(room => room.id === "child")));
    else if (gameState.childRoomUnlocked) add("HNT-17", DIARY_DATA.book);
  }
  return result;
}

// 사용자 결정: 플레이어 위치와 관계없이 장소 ID 순서(C01 사진관 → C02 학교 → C03 놀이공원 → C04 놀이터 → C05 집)로 준다.
// 한 장소에 남은 힌트가 여러 개면 hintCandidates()에 적힌 순서대로 모두 준 뒤 다음 장소로 넘어간다.
// 이번 대기 동안 이미 받은 힌트와 끝낸 활동의 힌트는 후보에서 빠진다.
function chooseHint() {
  const order = id => city.locations.findIndex(place => place.id === id);
  return hintCandidates().filter(candidate => !gameState.hints.received.includes(candidate.id))
    .sort((a, b) => order(a.placeId) - order(b.placeId))[0] || null;
}

// 대기 시간이 한 번 지날 때마다 받을 수 있는 힌트가 하나씩 늘어난다. 최대 maxHints개다.
function unlockedHintCount() {
  const wait = city.debug ? HINT_DATA.debugWaitMs : HINT_DATA.waitMs;
  return Math.min(HINT_DATA.maxHints, Math.floor(gameState.hints.idleMs / wait));
}
function hintReady() { return gameState.hints.received.length < unlockedHintCount(); }
// 새 힌트를 받을 수 있는지 여부.
function newHintAvailable() { return hintReady() && !!chooseHint(); }
// 사용자 결정: 힌트를 한 번이라도 받았다면 선물상자를 계속 보여 주어 누적된 힌트를 다시 볼 수 있게 한다.
function renderHintButton() {
  const gift = document.getElementById("hint-gift");
  gift.hidden = !newHintAvailable() && gameState.hints.history.length === 0;
  gift.disabled = isGameInputBlocked();
  gift.setAttribute("aria-label", newHintAvailable() ? HINT_DATA.text.available : HINT_DATA.text.title);
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

// 선물상자를 누르면 새 힌트가 있으면 받아서 위에 보여 주고, 아래에는 지금까지 받은 힌트를 모두 보여 준다.
function openHints() {
  if (isGameInputBlocked()) return;
  updateHintClock();
  const selected = hintReady() ? chooseHint() : null;
  if (!selected && gameState.hints.history.length === 0) return;
  if (selected) gameState.hints.received.push(selected.id);
  if (selected && !gameState.hints.history.includes(selected.id)) gameState.hints.history.push(selected.id);
  hintUi.current = selected?.id || null;
  hintUi.open = true;
  stopBubbleDrag();
  pressedKeys.clear();
  const list = document.getElementById("hint-list");
  list.replaceChildren();
  document.getElementById("hint-current").textContent = selected ? selected.text : "";
  document.getElementById("hint-current").hidden = !selected;
  // 방금 받은 힌트는 위에 따로 보이므로 누적 목록에서는 뺀다.
  const previous = gameState.hints.history.filter(id => id !== selected?.id);
  document.getElementById("hint-previous").hidden = previous.length === 0;
  list.hidden = previous.length === 0;
  for (const id of previous) {
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
document.getElementById("hint-title").textContent = HINT_DATA.text.title;
document.getElementById("hint-previous").textContent = HINT_DATA.text.previous;
document.getElementById("hint-close").textContent = HINT_DATA.text.close;
document.getElementById("hint-gift").addEventListener("click", () => openHints());
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
