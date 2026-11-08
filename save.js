"use strict";

const cloneSaveValue = value => JSON.parse(JSON.stringify(value));
const initialGameState = cloneSaveValue(gameState);
const initialScene = cloneSaveValue(scene);
const initialPlayer = cloneSaveValue(player);
const savedFlagNames = Object.keys(initialGameState).filter(key => typeof initialGameState[key] === "boolean");
const saveRuntime = { ready: false, restoring: false, lastPositionAt: 0, lastPosition: "" };
let userPreferences = cloneSaveValue(SAVE_DATA.defaultPreferences);

function showSaveMessage(message) {
  const element = document.getElementById("save-message");
  element.textContent = message;
  element.hidden = !message;
}

function capturePosition() {
  return { interiorId: scene.interiorId, schoolFloor: scene.schoolFloor,
    returnPoint: scene.returnPoint ? { ...scene.returnPoint } : null,
    x: player.x, y: player.y, facing: player.facing };
}

function createProgressSnapshot() {
  const state = cloneSaveValue(gameState);
  // 실행 중 배치를 건드리지 않고 저장 사본에서만 전부 반환한다. 단일 setItem으로 함께 기록한다.
  if (!state.cabinetSolved) {
    state.inventory.itemIds = [...new Set([...state.inventory.itemIds, ...state.cabinet.slots.filter(Boolean)])];
    state.cabinet.slots = Array(CABINET_DATA.rules.slotCount).fill(null);
  }
  return { saveVersion: SAVE_DATA.saveVersion, inventory: state.inventory,
    acquiredItems: state.acquiredItems,
    puzzles: Object.fromEntries(savedFlagNames.map(key => [key, state[key]])),
    cabinet: state.cabinet, achievements: state.achievements,
    achievementConditions: state.achievementConditions, hints: state.hints, position: capturePosition() };
}

function saveProgress() {
  if (!saveRuntime.ready || saveRuntime.restoring) return false;
  updateHintClock();
  syncHintProgress();
  try {
    const snapshot = createProgressSnapshot();
    localStorage.setItem(SAVE_DATA.progressKey, JSON.stringify(snapshot));
    saveRuntime.lastPosition = JSON.stringify(snapshot.position);
    saveRuntime.lastPositionAt = Date.now();
    return true;
  } catch {
    showSaveMessage(SAVE_DATA.text.unavailable);
    return false;
  }
}

function updatePositionSave() {
  if (!saveRuntime.ready || Date.now()-saveRuntime.lastPositionAt < SAVE_DATA.positionIntervalMs) return;
  if (JSON.stringify(capturePosition()) !== saveRuntime.lastPosition) saveProgress();
}

function decodeProgress(raw) {
  const data = JSON.parse(raw);
  const object = value => value && typeof value === "object" && !Array.isArray(value);
  const itemIds = new Set(ITEM_DATA.map(item => item.id));
  const validItem = id => typeof id === "string" && itemIds.has(id);
  const facing = value => ["up", "down", "left", "right"].includes(value);
  const point = value => object(value) && Number.isFinite(value.x) && Number.isFinite(value.y) && facing(value.facing);
  const check = value => { if (!value) throw new Error("Invalid save"); };
  check(object(data) && [1, 2, SAVE_DATA.saveVersion].includes(data.saveVersion));
  check(object(data.inventory) && Array.isArray(data.inventory.itemIds) && data.inventory.itemIds.every(validItem));
  check(data.inventory.selectedItemId === null || validItem(data.inventory.selectedItemId));
  check(object(data.acquiredItems) && Object.entries(data.acquiredItems).every(([id,value]) => validItem(id) && typeof value === "boolean"));
  check(object(data.puzzles) && savedFlagNames.every(key => (key === "endingCompleted" && data.saveVersion < 3) || typeof data.puzzles[key] === "boolean"));
  check(object(data.cabinet) && Array.isArray(data.cabinet.slots) && data.cabinet.slots.length === CABINET_DATA.rules.slotCount);
  check(data.cabinet.slots.every(id => id === null || CABINET_DATA.allowedItemIds.includes(id)));
  check(object(data.achievements) && ACHIEVEMENT_CONDITIONS.every(entry => ["hidden","active","completed"].includes(data.achievements[entry.id])));
  check(object(data.achievementConditions) && Object.entries(data.achievementConditions).every(([id,value]) => ACHIEVEMENT_CONDITIONS.some(entry => entry.id === id) && typeof value === "boolean"));
  const position = data.position;
  check(point(position) && (position.interiorId === null || city.interiors.some(room => room.placeId === position.interiorId)));
  check(SCHOOL_DATA.floors.some(floor => floor.number === position.schoolFloor));
  check(position.interiorId === null ? position.returnPoint === null : point(position.returnPoint));
  const state = cloneSaveValue(initialGameState);
  if (data.saveVersion === 1) {
    // 기존 진행을 유지하면서 이번에 추가한 힌트 상태만 새로 시작한다.
    state.hints = createHintState();
  } else {
    check(object(data.hints) && Array.isArray(data.hints.history) && Array.isArray(data.hints.clues));
    check(data.hints.history.every(id => HINT_DATA.entries.some(entry => entry.id === id)) && data.hints.clues.every(id => HINT_DATA.clueIds.includes(id)));
    check(Number.isFinite(data.hints.lastProgressAt) && data.hints.lastProgressAt >= 0 && Number.isFinite(data.hints.idleMs) && data.hints.idleMs >= 0);
    // received가 없는 이전 저장은 빈 목록으로 읽는다. 알 수 없는 ID는 버린다.
    const received = Array.isArray(data.hints.received) ? data.hints.received.filter(id => HINT_DATA.entries.some(entry => entry.id === id)) : [];
    state.hints = { history: [...new Set(data.hints.history)], clues: [...new Set(data.hints.clues)], received: [...new Set(received)], lastProgressAt: data.hints.lastProgressAt, idleMs: data.hints.idleMs };
  }
  for (const name of savedFlagNames) state[name] = name === "endingCompleted" && data.saveVersion < 3 ? data.puzzles.endingReached : data.puzzles[name];
  state.acquiredItems = Object.fromEntries(Object.entries(data.acquiredItems).filter(([,value]) => value));
  let held = [...data.inventory.itemIds];
  if (state.cabinetSolved) {
    check(data.cabinet.slots.every((id,index) => id === CABINET_DATA.answer[index]));
    state.cabinet.slots = [...CABINET_DATA.answer];
    state.cabinetKeyGranted = true;
    state.acquiredItems[CABINET_DATA.keyId] = true;
  } else {
    held.push(...data.cabinet.slots.filter(Boolean));
    state.cabinetKeyGranted = false;
  }
  // 보유·배치·획득 기록을 대조하여 종류별 하나씩 복원한다.
  for (const id of [...held, ...state.cabinet.slots.filter(Boolean)]) state.acquiredItems[id] = true;
  held = Object.keys(state.acquiredItems).filter(id => !state.cabinet.slots.includes(id));
  state.inventory = { itemIds: held, selectedItemId: held.includes(data.inventory.selectedItemId) ? data.inventory.selectedItemId : null };
  state.photoCollected = !!state.acquiredItems[ITEM_DATA.find(item => item.acquisitionFlag === "photoCollected").id];
  if (state.acquiredItems[PARK_DATA.memoId]) state.playgroundMemoPending = false;
  if (state.acquiredItems[PARK_DATA.balloonId] && !state.acquiredItems[PARK_DATA.memoId]) state.playgroundMemoPending = true;
  for (const entry of ACHIEVEMENT_CONDITIONS) {
    const met = (entry.flags || [entry.flag]).every(flag => state[flag]) && entry.items.every(id => state.acquiredItems[id]);
    // 완료 업적의 조건이 부족한 저장은 손상된 것으로 처리한다.
    check(data.achievements[entry.id] !== "completed" || met);
    if (met) state.achievementConditions[entry.id] = true;
  }
  return { state, position };
}

function resetSession() {
  // 창 닫기의 보상 처리를 호출하지 않고 새 게임 상태로 한 번에 교체한다.
  for (const id of ["inventory-dialog", "inspection-dialog", "achievement-dialog", "hint-dialog", "settings-dialog", "map-dialog"]) document.getElementById(id).close();
  settingsUi.open=false;settingsUi.listening=null;mapUi.open=false;heldMovementCodes.clear();
  if (typeof endingUi !== "undefined") { endingUi.mode=null;endingUi.scene=-1;document.getElementById("ending-dialog").close(); }
  Object.assign(gameState, cloneSaveValue(initialGameState));
  gameState.hints = createHintState();
  Object.assign(scene, cloneSaveValue(initialScene));
  Object.assign(player, cloneSaveValue(initialPlayer));
  inventoryUiState.open = false;
  Object.assign(inspectionUiState, { mode: null, object: null, item: null, back: false });
  Object.assign(achievementUi, { open: false, queue: [], current: null, until: 0 });
  cabinetUi.selectedSlot = null;
  diaryUi.page = 0;
  Object.assign(playgroundAnimation, { swingUntil: 0, seesawUntil: 0, slideUntil: 0 });
  resetRegistryProgress();
  schoolDoorUi.open.clear();
  houseDoorUi.bedroomOpen = false;
  clearBubbleEffects();
  pressedKeys.clear();
  previousTime = null;
  initializeHintSession();
}

function restoreProgress() {
  saveRuntime.restoring = true;
  let success = false;
  try {
    const raw = localStorage.getItem(SAVE_DATA.progressKey);
    if (raw !== null) {
      const { state, position } = decodeProgress(raw);
      Object.assign(gameState, state);
      Object.assign(scene, { interiorId: position.interiorId, schoolFloor: position.schoolFloor, returnPoint: position.returnPoint });
      Object.assign(player, { x: position.x, y: position.y, facing: position.facing });
      // 학교 문은 저장하지 않는다. 문 틈에 서 있던 저장이면 그 문만 열어 둔 채로 이어 한다.
      if (scene.interiorId === SCHOOL_DATA.placeId) openSchoolDoorsAtPlayer();
      if (scene.interiorId === HOUSE_DATA.placeId) openHouseDoorAtPlayer();
      if (!canStand(player.x, player.y) || (scene.returnPoint && !canStandCity(scene.returnPoint.x, scene.returnPoint.y))) throw new Error("Invalid position");
      initializeHintSession();
      updateAchievementConditions();
      achievementUi.queue = [];
      success = true;
    }
  } catch (error) {
    resetSession();
    showSaveMessage(error instanceof SyntaxError || error.message.startsWith("Invalid") ? SAVE_DATA.text.invalid : SAVE_DATA.text.unavailable);
  } finally {
    saveRuntime.restoring = false;
    saveRuntime.ready = true;
    initializeHintSession();
    updateCamera();
    draw();
  }
  // 미완료 배치 반환을 포함한 복원 결과를 한 번에 확정한다.
  saveProgress();
  return success;
}

function validPreferences(value) {
  if (!value || typeof value !== "object" || !value.keys || !value.sound) return false;
  // 나중에 추가한 기능(예: 문 열기)의 키가 없는 이전 설정은 그 기능만 기본값으로 채운다(undefined 허용).
  return Object.keys(SAVE_DATA.defaultPreferences.keys).every(action => value.keys[action] === undefined || value.keys[action] === null || validBindingCode(value.keys[action])) &&
    typeof value.sound.muted === "boolean" && Number.isFinite(value.sound.volume) && value.sound.volume >= 0 && value.sound.volume <= 1 &&
    ["bgmVolume","sfxVolume"].every(key=>value.sound[key]===undefined || (Number.isFinite(value.sound[key])&&value.sound[key]>=0&&value.sound[key]<=1));
}

function normalizePreferences(value) {
  const seen=new Set(),keys={};
  const actions=Object.keys(SAVE_DATA.defaultPreferences.keys);
  // 저장된 키를 먼저 배정하고, 저장에 없던 기능은 기본 키가 비어 있을 때만 기본 키를 준다.
  for(const action of actions) {
    const code=value.keys[action];if(code===undefined)continue;keys[action]=code&&!seen.has(code)?code:null;if(code)seen.add(code);
  }
  for(const action of actions) {
    if(value.keys[action]!==undefined)continue;
    const code=SAVE_DATA.defaultPreferences.keys[action];keys[action]=!seen.has(code)?code:null;seen.add(code);
  }
  return {keys,sound:{muted:value.sound.muted,volume:value.sound.volume,bgmVolume:value.sound.bgmVolume??(value.sound.muted?0:value.sound.volume),sfxVolume:value.sound.sfxVolume??(value.sound.muted?0:value.sound.volume)}};
}

function savePreferences(value) {
  if (!validPreferences(value)) return false;
  const next = normalizePreferences(value);
  try {
    localStorage.setItem(SAVE_DATA.preferencesKey, JSON.stringify(next));
    userPreferences = next;
    return true;
  } catch { showSaveMessage(SAVE_DATA.text.preferencesFailed); return false; }
}

function loadPreferences() {
  try {
    const value = JSON.parse(localStorage.getItem(SAVE_DATA.preferencesKey));
    if (validPreferences(value)) userPreferences = normalizePreferences(value);
  } catch { /* 설정을 읽지 못하면 기본값으로 계속한다. */ }
}

function requestNewGame() {
  if (!window.confirm(SAVE_DATA.text.confirm)) return false;
  try { localStorage.removeItem(SAVE_DATA.progressKey); }
  catch { showSaveMessage(SAVE_DATA.text.resetFailed); return false; }
  saveRuntime.restoring = true;
  resetSession();
  saveRuntime.restoring = false;
  showSaveMessage("");
  saveProgress();
  updateAchievementNotifications();
  updateCamera();
  draw();
  canvas.focus();
  return true;
}

document.getElementById("new-game").textContent = SAVE_DATA.text.restart;
document.getElementById("new-game").addEventListener("click", requestNewGame);
window.addEventListener("keydown", event => {
  if (typeof endingUi !== "undefined" && endingUi.mode) return;
  if (!city.debug || !event.ctrlKey || !event.shiftKey || event.altKey || event.metaKey || event.code !== SAVE_DATA.debugResetCode) return;
  event.preventDefault();
  if (!event.repeat) requestNewGame();
});
window.addEventListener("pagehide", saveProgress);
window.addEventListener("beforeunload", saveProgress);
document.addEventListener("visibilitychange", () => { if (document.hidden) saveProgress(); });
loadPreferences();
restoreProgress();
