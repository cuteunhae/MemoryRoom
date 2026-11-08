"use strict";

// 방 문의 걸어서 지나는 틈.
function houseDoor(room) {
  return room.door;
}

// 벽과 가구는 집 그림 데이터(city-data.js)에서 막고, 여기서는 게임 상태에 따라 달라지는 것만 돌려준다.
function houseObstacles() {
  const child=HOUSE_DATA.rooms.find(room=>room.id==="child");
  return [HOUSE_DATA.cabinet,DIARY_DATA.bed,...HOUSE_DATA.dolls.filter(doll=>!gameState.acquiredItems[doll.itemId]),...(gameState.childRoomUnlocked?[]:[child.door])];
}

function handleHouseClick(x,y) {
  const hit=rect=>Math.abs(x-rect.x)<=rect.width/2+8&&Math.abs(y-rect.y)<=rect.height/2+8;
  const child=HOUSE_DATA.rooms.find(room=>room.id==="child"),door=houseDoor(child);
  const book=DIARY_DATA.book;
  if(Math.abs(x-book.x)<=book.width/2+DIARY_DATA.clickPadding&&Math.abs(y-book.y)<=book.height/2+DIARY_DATA.clickPadding) {
    const footY=player.y+player.footOffset;
    const inside=player.x>child.x+HOUSE_DATA.wallThickness&&player.x<child.x+child.width-HOUSE_DATA.wallThickness&&footY>child.y+HOUSE_DATA.wallThickness&&footY<child.y+child.height-HOUSE_DATA.wallThickness;
    const distance=Math.hypot(Math.max(0,Math.abs(player.x-book.x)-book.width/2),Math.max(0,Math.abs(footY-book.y)-book.height/2));
    if(gameState.childRoomUnlocked&&inside&&distance<=DIARY_DATA.interactDistance) investigateDiary();
    else showDoorMessage(HOUSE_DATA.text.near);
    return true;
  }
  const doll=HOUSE_DATA.dolls.find(hit);
  const target=hit(door.picture)?door:doll || (hit(HOUSE_DATA.cabinet)?HOUSE_DATA.cabinet:null);
  if(!target)return false;
  const footY=player.y+player.footOffset;
  const distance=Math.hypot(Math.max(0,Math.abs(player.x-target.x)-target.width/2),Math.max(0,Math.abs(footY-target.y)-target.height/2));
  const bedroom=HOUSE_DATA.rooms.find(room=>room.id==="bedroom");
  const inBedroom=player.x>bedroom.x&&player.x<bedroom.x+bedroom.width&&footY>bedroom.y&&footY<bedroom.y+bedroom.height;
  if(distance>HOUSE_DATA.interactDistance||(doll&&!inBedroom))showDoorMessage(HOUSE_DATA.text.near);
  else if(target===HOUSE_DATA.cabinet) {
    cabinetUi.selectedSlot=null;
    openInspection({ type:"cabinet",name:CABINET_DATA.text.title });
  } else if(target===door) {
    if(!gameState.childRoomUnlocked) {
      if(gameState.inventory.itemIds.includes(HOUSE_DATA.keyId)) {
        gameState.childRoomUnlocked=true;showDoorMessage(HOUSE_DATA.text.unlocked);
        if (typeof saveProgress === "function") saveProgress();
      } else showDoorMessage(HOUSE_DATA.text.locked);
    }
  } else {
    showDoorMessage(acquireItem(doll.itemId)?`${doll.name} ${HOUSE_DATA.text.acquired}`:HOUSE_DATA.text.already);
  }
  return true;
}

function drawHouseDoll(doll) {
  ctx.save();ctx.translate(doll.x,doll.y);
  if(doll.kind==="bear") drawBearDoll();
  else if(doll.kind==="dolphin") {
    fillEllipse(0,0,32,15,"#809eae");
    ctx.fillStyle="#809eae";tracePath([[-25,0],[-43,-18],[-43,18]],true);ctx.fill();
    tracePath([[-4,-8],[8,-27],[17,-8]],true);ctx.fill();
    fillEllipse(30,-1,15,6,"#809eae");fillEllipse(17,-6,3,3,"#37444e");
  } else {
    const color=doll.kind==="rabbit"?"#e7d9c7":doll.kind==="dog"?"#b79473":"#e9b3bd";
    fillEllipse(0,16,20,24,color);
    if(doll.kind==="rabbit")for(const side of [-1,1])fillEllipse(side*13,-30,8,21,color);
    if(doll.kind==="dog")for(const side of [-1,1])fillEllipse(side*23,-12,10,20,"#795b46");
    if(doll.kind==="pig")for(const side of [-1,1]) {
      ctx.fillStyle=color;tracePath([[side*22,-8],[side*24,-37],[side*5,-20]],true);ctx.fill();
    }
    fillEllipse(0,-8,23,21,color);
    for(const side of [-1,1])fillEllipse(side*8,-12,3,3,"#3f3b37");
    fillEllipse(0,-2,3,3,"#745248");
  }
  ctx.restore();
}

// 문이 열려 있으면 문 그림 위에 근처 바닥 그림을 덮어 지나갈 수 있게 보여 준다.
function drawOpenHouseDoor(image,door) {
  const rect=door.picture;
  ctx.drawImage(image,door.floor.x,door.floor.y,rect.width,rect.height,rect.x-rect.width/2,rect.y-rect.height/2,rect.width,rect.height);
}

function drawHouse() {
  const interior=city.interiors.find(room=>room.placeId===HOUSE_DATA.placeId);
  const image=objectSpriteImage(interior.picture.src);
  const child=HOUSE_DATA.rooms.find(room=>room.id==="child"),bedroom=HOUSE_DATA.rooms.find(room=>room.id==="bedroom");
  ctx.save();ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="18px 'Malgun Gothic', sans-serif";
  if(image) {
    drawOpenHouseDoor(image,bedroom.door);
    if(gameState.childRoomUnlocked)drawOpenHouseDoor(image,child.door);
  } else {
    // 그림을 불러오지 못했을 때의 임시 표시.
    ctx.fillStyle="#5b4b3b";
    for(const room of HOUSE_DATA.rooms)ctx.fillText(room.name,room.x+room.width/2,room.y+40);
    ctx.fillText(HOUSE_DATA.text.hall,600,800);
    const cabinet=HOUSE_DATA.cabinet;
    ctx.fillStyle="#a98664";ctx.fillRect(cabinet.x-cabinet.width/2,cabinet.y-cabinet.height/2,cabinet.width,cabinet.height);
    ctx.fillStyle="#5b4b3b";ctx.fillText(HOUSE_DATA.text.cabinet,cabinet.x,cabinet.y+cabinet.height/2+20);
    if(!gameState.childRoomUnlocked){const door=child.door;ctx.fillStyle="#705346";ctx.fillRect(door.x-door.width/2,door.y-door.height/2,door.width,door.height);}
  }
  drawChildRoomFurniture(!!image);
  for(const doll of HOUSE_DATA.dolls)if(!gameState.acquiredItems[doll.itemId]) {
    if(drawObjectSprite(doll))continue;
    drawHouseDoll(doll);ctx.fillStyle="#4e443c";ctx.font="14px 'Malgun Gothic', sans-serif";ctx.fillText(doll.name,doll.x,doll.y+doll.height/2+18);
  }
  ctx.restore();
}
