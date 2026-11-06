"use strict";
function drawPlayerMap() {
  const map=document.getElementById("map-picture"), context=map.getContext("2d");
  map.width=city.width;map.height=city.height;
  // 도시 그림이 있으면 그림을 그대로 보여준다. 그림에는 장소 이름·현재 위치 표시가 없다.
  if(cityMapReady()){context.drawImage(cityMapImage,0,0,map.width,map.height);return;}
  context.fillStyle="#a9cdd4";context.fillRect(0,0,map.width,map.height);
  const path=(points,closed=false)=>{context.beginPath();points.forEach(([x,y],i)=>i?context.lineTo(x,y):context.moveTo(x,y));if(closed)context.closePath();};
  path(city.frame,true);context.strokeStyle="#668c93";context.lineWidth=4;context.stroke();
  path(city.coast,true);context.fillStyle="#dbe3ce";context.fill();
  context.save();path(city.coast,true);context.clip();
  context.lineCap="round";context.lineJoin="round";
  for(const road of city.roads){path(road.points);context.lineWidth=road.width+3;context.strokeStyle="#e7deca";context.stroke();}
  for(const road of city.roads){path(road.points);context.lineWidth=road.width;context.strokeStyle="#92948c";context.stroke();}
  context.restore();
  for(const rect of [...city.buildings,...city.locations.map(locationBounds)]) {context.fillStyle=rect.color||"#b5bba9";context.fillRect(rect.x-rect.width/2,rect.y-rect.height/2,rect.width,rect.height);}
  for(const landmark of city.landmarks){context.beginPath();context.arc(landmark.x,landmark.y,landmark.radius||10,0,Math.PI*2);context.fillStyle=landmark.color||"#83a79a";context.fill();}
  // 장소 이름·현재 위치·디버그 표시 없이 북쪽을 위로 유지한다.
}
function toggleMap() {
  if(settingsUi.open)return;
  if(mapUi.open){mapUi.open=false;document.getElementById("map-dialog").close();pressedKeys.clear();canvas.focus();return;}
  if(isGameInputBlocked())return;
  mapUi.open=true;pressedKeys.clear();stopBubbleDrag();drawPlayerMap();
  document.getElementById("map-dialog").showModal();document.getElementById("map-close").focus();
}
document.getElementById("map-title").textContent=SETTINGS_DATA.text.map;
document.getElementById("map-close").textContent=SETTINGS_DATA.text.close;
document.getElementById("map-close").addEventListener("click",toggleMap);
document.getElementById("map-dialog").addEventListener("cancel",event=>event.preventDefault());
