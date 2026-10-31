"use strict";

function schoolFloor() {
  return SCHOOL_DATA.floors.find(floor => floor.number === scene.schoolFloor);
}

function schoolBoardText() {
  return SCHOOL_DATA.text.boardIntro + SCHOOL_DATA.floors.map(floor =>
    `${floor.name}\n${floor.rooms.map(room => room.name).join(" → ")}`).join("\n\n");
}

function inspectionObjectsFor(interior) {
  return [...INSPECTION_OBJECTS, ...SCHOOL_DATA.objects].filter(object =>
    object.placeId === interior.placeId && (!object.floor || object.floor === scene.schoolFloor));
}

function schoolWalls() {
  const thickness = SCHOOL_DATA.wallThickness;
  const walls = [];
  const add = (left, top, width, height) => walls.push({ x: left + width / 2, y: top + height / 2, width, height });
  for (const room of schoolFloor().rooms) {
    const { x, y, width, height, doorX, doorWidth } = room;
    add(x, y, width, thickness);
    add(x, y, thickness, height);
    add(x + width - thickness, y, thickness, height);
    add(x, y + height - thickness, doorX - doorWidth / 2 - x, thickness);
    add(doorX + doorWidth / 2, y + height - thickness, x + width - doorX - doorWidth / 2, thickness);
  }
  return walls;
}

function handleSchoolStairs(x, y) {
  const stairs = SCHOOL_DATA.stairs;
  if (Math.abs(x - stairs.x) > stairs.width / 2 || Math.abs(y - stairs.y) > stairs.height / 2) return false;
  if (Math.hypot(player.x - stairs.x, player.y + player.footOffset - stairs.y) > SCHOOL_DATA.interactDistance) {
    showDoorMessage(SCHOOL_DATA.text.near);
    return true;
  }
  scene.schoolFloor = scene.schoolFloor === 1 ? 2 : 1;
  player.x = stairs.arrival.x;
  player.y = stairs.arrival.footY - player.footOffset;
  player.facing = "up";
  finishMapTransition();
  return true;
}

function drawSchool() {
  ctx.save();
  for (const room of schoolFloor().rooms) {
    ctx.fillStyle = "#efe8d5";
    ctx.fillRect(room.x, room.y, room.width, room.height);
  }
  ctx.fillStyle = "#8c897b";
  for (const wall of schoolWalls()) ctx.fillRect(wall.x - wall.width / 2, wall.y - wall.height / 2, wall.width, wall.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "18px 'Malgun Gothic', sans-serif";
  for (const room of schoolFloor().rooms) {
    const doorY = room.y + room.height;
    ctx.fillStyle = "#b9c6af";
    ctx.fillRect(room.doorX - room.doorWidth / 2, doorY - SCHOOL_DATA.wallThickness, room.doorWidth, SCHOOL_DATA.wallThickness);
    ctx.fillStyle = "#fff8e9";
    ctx.fillRect(room.doorX - 44, doorY - 55, 88, 28);
    ctx.fillStyle = "#403a32";
    ctx.fillText(room.name, room.doorX, doorY - 41);
  }
  ctx.fillText(SCHOOL_DATA.text.corridor, 800, 650);
  const stairs = SCHOOL_DATA.stairs;
  ctx.fillStyle = "#b5b6ad";
  ctx.fillRect(stairs.x - stairs.width / 2, stairs.y - stairs.height / 2, stairs.width, stairs.height);
  ctx.strokeStyle = "#74786f";
  for (let i = 1; i < 6; i++) {
    const y = stairs.y - stairs.height / 2 + i * stairs.height / 6;
    ctx.beginPath(); ctx.moveTo(stairs.x - stairs.width / 2, y); ctx.lineTo(stairs.x + stairs.width / 2, y); ctx.stroke();
  }
  ctx.fillStyle = "#403a32";
  ctx.font = "15px 'Malgun Gothic', sans-serif";
  ctx.fillText(scene.schoolFloor === 1 ? SCHOOL_DATA.text.up : SCHOOL_DATA.text.down, stairs.x, stairs.y - stairs.height / 2 - 20);
  ctx.restore();
}
