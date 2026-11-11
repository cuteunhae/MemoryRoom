"use strict";
const settingsUi = { open: false, listening: null, returnFocus: null };
const mapUi = { open: false };
const movementActions = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
const heldMovementCodes = new Map();
function currentBindings() { return typeof userPreferences === "undefined" ? SETTINGS_DATA.keys : userPreferences.keys; }
function bindingCloseLabel(action) {
  const code=currentBindings()[action];
  return SETTINGS_DATA.text.close+(code?` (${code.replace(/^Key/, "").replace(/^Digit/, "")})`:"");
}
// 그 기능에 지정된 키의 그림 경로. 그림이 없는 키이거나 할당 없음이면 null이다.
function keyIconSrc(action) {
  return SETTINGS_DATA.keyIcons[currentBindings()[action]] ?? null;
}
function validBindingCode(code) {
  return typeof code === "string" && /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Arrow(Up|Down|Left|Right)|Escape|Tab|Space|Enter|Backspace|Home|End|PageUp|PageDown|Insert|Delete|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash|Backquote)$/.test(code);
}
window.addEventListener("keydown", event => {
  if (typeof openingUi !== "undefined" && openingUi.active) { event.preventDefault(); return; }
  if (typeof endingUi !== "undefined" && endingUi.mode) return;
  const code = event.code || event.key;
  if (event.isComposing) return;
  if (settingsUi.open && settingsUi.listening) {
    event.preventDefault();
    if (!event.repeat) assignSettingKey(code, event.ctrlKey || event.altKey || event.metaKey || event.shiftKey);
    return;
  }
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  const action = Object.keys(currentBindings()).find(action => currentBindings()[action] === code);
  if (action === "settings") {
    event.preventDefault();
    if (!event.repeat) toggleSettings();
    return;
  }
  if (settingsUi.open) return;
  if (movementActions[action]) {
    event.preventDefault();
    if (!isGameInputBlocked()) { pressedKeys.add(movementActions[action]); heldMovementCodes.set(code,movementActions[action]); }
    return;
  }
  if (action === "interact") {
    event.preventDefault();
    if (event.repeat) return;
    // 상호작용 키로 연 창(대화·게시판·명부)이 열려 있으면 닫고, 아니면 가까운 대상과 상호작용한다.
    if (inspectionUiState.object?.messages?.keyHint) closeInspection();
    else if (!isGameInputBlocked()) interactNearbySchool() || interactNearbyHouseDoor() || interactNearbyObject() || interactNearbyEntrance();
    return;
  }
  const actions = { inventory: toggleInventory, achievements: toggleAchievements, map: toggleMap };
  if (!actions[action]) return;
  if (action === "achievements" && !achievementUi.open && isGameInputBlocked()) return;
  if (action === "map" && !mapUi.open && isGameInputBlocked()) return;
  event.preventDefault();
  if (!event.repeat) actions[action]();
});
window.addEventListener("keyup", event => {
  const code = event.code || event.key;
  const direction = heldMovementCodes.get(code);
  if (direction) { pressedKeys.delete(direction); heldMovementCodes.delete(code); }
});
