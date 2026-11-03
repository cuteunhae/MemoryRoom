"use strict";

function houseDoor(room) {
  const door=room.door,t=HOUSE_DATA.wallThickness;
  return door.side === "north" ? { x:door.center,y:room.y+t/2,width:door.width,height:t } :
    { x:door.side === "east" ? room.x+room.width-t/2 : room.x+t/2,y:door.center,width:t,height:door.width };
}

function houseWalls() {
  const result=[],t=HOUSE_DATA.wallThickness;
  const add=(x,y,width,height)=>result.push({x:x+width/2,y:y+height/2,width,height});
  for(const room of HOUSE_DATA.rooms) {
    const {x,y,width,height,door}=room;
    for(const side of ["north","south","west","east"]) {
      const horizontal=side==="north"||side==="south";
      const start=horizontal?x:y, length=horizontal?width:height;
      const segments=side===door.side ? [[start,door.center-door.width/2-start],[door.center+door.width/2,start+length-door.center-door.width/2]] : [[start,length]];
      for(const [from,size] of segments) {
        if(horizontal)add(from,side==="north"?y:y+height-t,size,t);
        else add(side==="west"?x:x+width-t,from,t,size);
      }
    }
    if(room.id==="child"&&!gameState.childRoomUnlocked)result.push(houseDoor(room));
  }
  return result;
}

function houseObstacles() {
  return [...houseWalls(),HOUSE_DATA.cabinet,...HOUSE_DATA.dolls.filter(doll=>!gameState.acquiredItems[doll.itemId])];
}

function handleHouseClick(x,y) {
  const hit=rect=>Math.abs(x-rect.x)<=rect.width/2+8&&Math.abs(y-rect.y)<=rect.height/2+8;
  const child=HOUSE_DATA.rooms.find(room=>room.id==="child"),door=houseDoor(child);
  const doll=HOUSE_DATA.dolls.find(hit);
  const target=hit(door)?door:doll || (hit(HOUSE_DATA.cabinet)?HOUSE_DATA.cabinet:null);
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
    const color=doll.kind==="rabbit"?"#e7d9c7":doll.kind==="dog"?"#b79473":"#93969c";
    fillEllipse(0,16,20,24,color);
    if(doll.kind==="rabbit")for(const side of [-1,1])fillEllipse(side*13,-30,8,21,color);
    if(doll.kind==="dog")for(const side of [-1,1])fillEllipse(side*23,-12,10,20,"#795b46");
    if(doll.kind==="cat")for(const side of [-1,1]) {
      ctx.fillStyle=color;tracePath([[side*22,-8],[side*24,-37],[side*5,-20]],true);ctx.fill();
    }
    fillEllipse(0,-8,23,21,color);
    for(const side of [-1,1])fillEllipse(side*8,-12,3,3,"#3f3b37");
    fillEllipse(0,-2,3,3,"#745248");
  }
  ctx.restore();
}

function drawHouse() {
  ctx.save();ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="18px 'Malgun Gothic', sans-serif";
  for(const room of HOUSE_DATA.rooms) {
    ctx.fillStyle=room.id==="kitchen"?"#e1dfca":"#e3cfb4";ctx.fillRect(room.x,room.y,room.width,room.height);
    ctx.fillStyle="#5b4b3b";ctx.fillText(room.name,room.x+room.width/2,room.y+40);
  }
  ctx.fillStyle="#998674";
  for(const wall of houseWalls())ctx.fillRect(wall.x-wall.width/2,wall.y-wall.height/2,wall.width,wall.height);
  const door=houseDoor(HOUSE_DATA.rooms.find(room=>room.id==="child"));
  if(!gameState.childRoomUnlocked){ctx.fillStyle="#705346";ctx.fillRect(door.x-door.width/2,door.y-door.height/2,door.width,door.height);}
  ctx.fillStyle="#5b4b3b";ctx.fillText(HOUSE_DATA.text.hall,600,180);
  const cabinet=HOUSE_DATA.cabinet;
  ctx.fillStyle="#a98664";ctx.fillRect(cabinet.x-cabinet.width/2,cabinet.y-cabinet.height/2,cabinet.width,cabinet.height);
  ctx.strokeStyle="#6c5139";ctx.lineWidth=2;
  for(let i=1;i<5;i++){tracePath([[cabinet.x-cabinet.width/2,cabinet.y-cabinet.height/2+i*cabinet.height/5],[cabinet.x+cabinet.width/2,cabinet.y-cabinet.height/2+i*cabinet.height/5]]);ctx.stroke();}
  ctx.fillStyle="#5b4b3b";ctx.fillText(HOUSE_DATA.text.cabinet,cabinet.x,cabinet.y+cabinet.height/2+20);
  for(const doll of HOUSE_DATA.dolls)if(!gameState.acquiredItems[doll.itemId]) {
    drawHouseDoll(doll);ctx.fillStyle="#4e443c";ctx.font="14px 'Malgun Gothic', sans-serif";ctx.fillText(doll.name,doll.x,doll.y+doll.height/2+18);
  }
  ctx.restore();
}
