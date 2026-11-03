"use strict";

const cabinetUi = { selectedSlot: null };

function cabinetAccepts(itemId) {
  return CABINET_DATA.allowedItemIds.includes(itemId) && ITEM_DATA.some(item => item.id === itemId && item.cabinetUsable);
}

function selectCabinetInventory(itemId) {
  if (inspectionUiState.mode !== "cabinet" || gameState.cabinetSolved || !cabinetAccepts(itemId)) return false;
  if (!selectInventoryItem(itemId)) return false;
  cabinetUi.selectedSlot = null;
  renderCabinetPanel();
  Array.from(document.getElementById("cabinet-inventory").children).find(button => button.dataset.itemId === itemId)?.focus();
  return true;
}

function clickCabinetSlot(index) {
  if (inspectionUiState.mode !== "cabinet" || (gameState.cabinetSolved && CABINET_DATA.rules.lockWhenSolved) ||
      !Number.isInteger(index) || index < 0 || index >= CABINET_DATA.rules.slotCount) return false;
  const slots = [...gameState.cabinet.slots];
  let items = [...gameState.inventory.itemIds];
  const from = cabinetUi.selectedSlot, selected = gameState.inventory.selectedItemId;
  if (from !== null) {
    if (from === index) { cabinetUi.selectedSlot = null; renderCabinetPanel(); return true; }
    if (CABINET_DATA.rules.occupiedFromSlot !== "swap" || !slots[from]) return false;
    [slots[from], slots[index]] = [slots[index], slots[from]];
  } else if (selected && cabinetAccepts(selected) && items.includes(selected)) {
    if (CABINET_DATA.rules.occupiedFromInventory !== "returnToInventory") return false;
    items = items.filter(id => id !== selected);
    if (slots[index] && !items.includes(slots[index])) items.push(slots[index]);
    slots[index] = selected;
  } else if (slots[index]) {
    cabinetUi.selectedSlot = index;
    gameState.inventory.selectedItemId = null;
    renderCabinetPanel();
    return true;
  } else return false;

  const solved = slots.every((id, i) => id === CABINET_DATA.answer[i]);
  let acquiredItems = gameState.acquiredItems;
  let keyGranted = gameState.cabinetKeyGranted;
  if (solved && !keyGranted) {
    if (!acquiredItems[CABINET_DATA.keyId] && !items.includes(CABINET_DATA.keyId)) items.push(CABINET_DATA.keyId);
    acquiredItems = { ...acquiredItems, [CABINET_DATA.keyId]: true };
    keyGranted = true;
  }
  // 배치·소지품·정답·열쇠 기록을 준비한 뒤 한 번에 반영한다.
  Object.assign(gameState, {
    cabinet: { slots }, inventory: { ...gameState.inventory, itemIds: items, selectedItemId: null },
    cabinetSolved: solved, cabinetKeyGranted: keyGranted, acquiredItems,
  });
  cabinetUi.selectedSlot = null;
  updateAchievementConditions();
  renderCabinetPanel();
  return true;
}

function restoreUnsolvedCabinet() {
  cabinetUi.selectedSlot = null;
  if (gameState.cabinetSolved || !CABINET_DATA.rules.resetWhenUnsolved) return;
  const items = [...new Set([...gameState.inventory.itemIds, ...gameState.cabinet.slots.filter(Boolean)])];
  // 반환과 초기화를 함께 반영하며 반복 호출해도 중복되지 않는다. 저장 복원 시에도 사용한다.
  Object.assign(gameState, {
    cabinet: { slots: Array(CABINET_DATA.rules.slotCount).fill(null) },
    inventory: { ...gameState.inventory, itemIds: items },
  });
}

function renderCabinetPanel() {
  const panel = document.getElementById("cabinet-panel");
  panel.hidden = inspectionUiState.mode !== "cabinet";
  if (panel.hidden) return;
  inspectionMessage.textContent = gameState.cabinetSolved ? CABINET_DATA.text.solved : CABINET_DATA.text.help;
  document.getElementById("cabinet-inventory-title").textContent = CABINET_DATA.text.inventory;
  document.getElementById("cabinet-reset-notice").textContent = gameState.cabinetSolved ? "" : CABINET_DATA.text.resetNotice;
  const slots = document.getElementById("cabinet-slots"); slots.replaceChildren();
  gameState.cabinet.slots.forEach((id, index) => {
    const button = document.createElement("button"); button.type = "button"; button.className = "cabinet-slot";
    button.textContent = `${index + 1}${CABINET_DATA.text.slot} · ${id ? ITEM_DATA.find(item => item.id === id).name : CABINET_DATA.text.empty}`;
    button.setAttribute("aria-pressed", String(cabinetUi.selectedSlot === index));
    button.disabled = gameState.cabinetSolved;
    button.addEventListener("click", () => { clickCabinetSlot(index); document.getElementById("cabinet-slots").children[index]?.focus(); });
    slots.append(button);
  });
  const list = document.getElementById("cabinet-inventory");
  renderInventoryList(list, selectCabinetInventory);
  for (const button of list.children) if (button.dataset.itemId) {
    button.disabled = gameState.cabinetSolved || !cabinetAccepts(button.dataset.itemId);
    if (!cabinetAccepts(button.dataset.itemId)) button.title = CABINET_DATA.text.unusable;
  }
}
