"use strict";

// TODO: 일반 책상 물건 6종은 임시 목록이며 퍼즐에 사용하지 않는다.
const ORDINARY_ITEMS = [
  { id: "GEN-01", name: "연필" }, { id: "GEN-02", name: "지우개" },
  { id: "GEN-03", name: "자" }, { id: "GEN-04", name: "책갈피" },
  { id: "GEN-05", name: "종이학" }, { id: "GEN-06", name: "공책" },
].map(item => ({ ...item, purpose: "일반 물건", puzzleUse: false }));
ITEM_DATA.push(...ORDINARY_ITEMS);
