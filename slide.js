"use strict";

function slideGraffitiTarget() {
  const slide = playgroundLayout().slide, detail = PLAYGROUND_DATA.slideDetail;
  return { kind: "graffiti", x: slide.x + detail.graffitiOffsetX,
    y: slide.y - slide.height / 2 + detail.graffitiOffsetY,
    width: detail.graffitiWidth, height: detail.graffitiHeight };
}

function graffitiGeometry() {
  const detail = PLAYGROUND_DATA.slideDetail;
  const home = city.locations.find(place => place.id === detail.homeId);
  const bounds = locationBounds(home);
  const door = home.doors.find(door => door.kind === "side");
  const locked = home.doors.find(door => door.kind === "locked");
  const approach = city.accessPoints.find(point => point.placeId === home.id && point.door === door.side);
  return {
    home: bounds,
    playground: city.locations.find(place => place.id === PLAYGROUND_DATA.placeId),
    alley: city.roads.find(road => road.id === detail.alleyId).points.map(point => [...point]),
    approach: [approach.x, approach.y],
    side: doorRectangle(bounds, door), locked: doorRectangle(bounds, locked),
  };
}

// drawHole이 false면 출발 구멍을 그리지 않는다(시설 그림에 이미 있을 때).
function drawSlideDetails(slide, drawHole = true) {
  const detail = PLAYGROUND_DATA.slideDetail, w = slide.width, h = slide.height;
  ctx.save();
  // 출발 구멍 바로 위 표지와 옆 낙서는 각각 분리된 그림이다.
  if (drawHole) fillEllipse(-w/6,-h/2+10,22,13,"#364c56");
  ctx.fillStyle="#f7e4b4";ctx.fillRect(-155,-h/2-63,280,48);
  ctx.fillStyle="#5b4937";ctx.font="bold 27px 'Malgun Gothic', sans-serif";
  ctx.fillText(PLAYGROUND_DATA.text.slideWarning,-15,-h/2-39);
  const x=detail.graffitiOffsetX, y=-h/2+detail.graffitiOffsetY;
  ctx.fillStyle="#eadcba";ctx.fillRect(x-detail.graffitiWidth/2,y-detail.graffitiHeight/2,detail.graffitiWidth,detail.graffitiHeight);
  ctx.strokeStyle="#705b51";ctx.lineWidth=3;
  tracePath([[x+25,y-22],[x-20,y+20],[x-18,y+7],[x-20,y+20],[x-7,y+18]]);ctx.stroke();
  tracePath([[x-34,y+2],[x-23,y-7],[x-12,y+2],[x-12,y+15],[x-34,y+15]],true);ctx.stroke();
  const remaining=playgroundAnimation.slideUntil-Date.now();
  if(remaining>0) {
    const progress=1-remaining/detail.rideMs;
    const riderX=-w/6+progress*w*0.54, riderY=-h/2+20+progress*(h-38);
    // TODO: 탑승을 보여주는 임시 인물 표식. 실제 플레이어 위치·충돌은 바꾸지 않는다.
    fillEllipse(riderX,riderY,11,11,"#efd0ac");
    ctx.fillStyle="#b46e4f";ctx.fillRect(riderX-11,riderY+9,22,20);
  }
  ctx.restore();
}

function drawGraffitiPicture(context, width, height) {
  const geometry=graffitiGeometry();
  context.clearRect(0,0,width,height);
  context.fillStyle="#f0e4c8";context.fillRect(0,0,width,height);
  const line=(points,color,lineWidth)=>{
    context.strokeStyle=color;context.lineWidth=lineWidth;context.lineJoin="round";context.lineCap="round";
    context.beginPath();points.forEach(([x,y],i)=>i?context.lineTo(x,y):context.moveTo(x,y));context.stroke();
  };
  // TODO: 왼쪽은 도시와 같은 방향의 상대 위치 그림. 오른쪽은 실제 쪽문 골목 좌표를 축소한 임시 낙서다.
  const deltaX=geometry.home.x-geometry.playground.x,deltaY=geometry.home.y-geometry.playground.y;
  const magnitude=Math.max(Math.abs(deltaX),Math.abs(deltaY));
  const start=[175,70],end=[175+deltaX/magnitude*115,70+deltaY/magnitude*115];
  line([[155,83],[155,45],[180,45],[205,83]],"#718697",5);
  line([start,end],"#816f5b",3);
  const angle=Math.atan2(end[1]-start[1],end[0]-start[0]);
  line([[end[0]-15*Math.cos(angle-0.5),end[1]-15*Math.sin(angle-0.5)],end,[end[0]-15*Math.cos(angle+0.5),end[1]-15*Math.sin(angle+0.5)]],"#816f5b",3);
  line([[end[0]-24,end[1]+28],[end[0],end[1]+7],[end[0]+24,end[1]+28]],"#947a65",4);
  context.fillStyle="#c4ae8f";context.fillRect(end[0]-18,end[1]+28,36,36);
  line([[235,32],[235,height-32]],"#d0bd99",2);
  const home=geometry.home;
  // 집과 쪽문 골목이 모두 들어가도록 범위를 잡는다.
  const pathXs=[...geometry.alley.map(point=>point[0]),geometry.side.x], pathYs=[...geometry.alley.map(point=>point[1]),geometry.side.y];
  const left=Math.min(home.x-home.width/2,...pathXs)-15, top=Math.min(home.y-home.height/2,...pathYs)-12;
  const right=Math.max(home.x+home.width/2,...pathXs)+15, bottom=Math.max(home.y+home.height/2,...pathYs)+15;
  const scale=Math.min((width-280)/(right-left),(height-55)/(bottom-top));
  const project=([x,y])=>[265+(x-left)*scale,25+(y-top)*scale];
  const [hx,hy]=project([home.x-home.width/2,home.y-home.height/2]);
  context.fillStyle="#c8b394";context.fillRect(hx,hy,home.width*scale,home.height*scale);
  line([...geometry.alley,geometry.approach,[geometry.side.x,geometry.side.y]].map(project),"#587d70",5);
  const side=project([geometry.side.x,geometry.side.y]),front=project([geometry.locked.x,geometry.locked.y]);
  context.fillStyle="#45675c";context.fillRect(side[0]-10,side[1]-4,20,8);
  context.fillStyle="#896451";context.fillRect(front[0]-10,front[1]-4,20,8);
  line([[front[0]-10,front[1]-10],[front[0]+10,front[1]+10]],"#a35c4e",3);
  line([[front[0]+10,front[1]-10],[front[0]-10,front[1]+10]],"#a35c4e",3);
}

function renderSlideGraffiti() {
  const panel=document.getElementById("slide-graffiti");
  panel.hidden=inspectionUiState.mode!=="slideGraffiti";
  if(panel.hidden)return;
  inspectionMessage.textContent="";
  const picture=document.getElementById("slide-graffiti-picture"),detail=PLAYGROUND_DATA.slideDetail;
  picture.width=detail.canvasWidth;picture.height=detail.canvasHeight;
  drawGraffitiPicture(picture.getContext("2d"),picture.width,picture.height);
}
