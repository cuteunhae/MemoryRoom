"use strict";

// 목록 표현만 담당한다. 슬롯 디자인을 바꿀 때 이 함수와 관련 CSS를 교체한다.
function renderInventoryList(container, onSelect) {
  container.replaceChildren();
  if (!gameState.inventory.itemIds.length) {
    const empty = document.createElement("p");
    empty.className = "inventory-empty";
    empty.textContent = INVENTORY_TEXT.empty;
    container.append(empty);
    return;
  }
  for (const id of gameState.inventory.itemIds) {
    const item = ITEM_DATA.find(entry => entry.id === id);
    const selected = gameState.inventory.selectedItemId === id;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "inventory-item";
    button.dataset.itemId = id;
    button.setAttribute("aria-pressed", String(selected));
    const icon = document.createElement("span");
    icon.className = "item-icon";
    icon.setAttribute("aria-hidden", "true");
    // 그림이 있는 아이템은 칸 안에 그림을 보여 준다.
    if (item.icon) {
      icon.className = "item-icon has-image";
      icon.setAttribute("style", `background-image: url("${item.icon}")`);
    }
    const name = document.createElement("span");
    name.textContent = item.name;
    const badge = document.createElement("span");
    badge.className = "selection-badge";
    badge.textContent = selected ? INVENTORY_TEXT.selected : "";
    button.append(icon, name, badge);
    button.addEventListener("click", () => onSelect(id));
    container.append(button);
  }
}
