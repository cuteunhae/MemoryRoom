"use strict";

// drawHole이 false면 출발 구멍을 그리지 않는다(시설 그림에 이미 있을 때).
function drawSlideDetails(slide, drawHole = true) {
  const detail = PLAYGROUND_DATA.slideDetail, w = slide.width, h = slide.height;
  ctx.save();
  // 출발 구멍 위 안전 표지는 유지한다. 집 쪽문 약도는 풍선 메모에서 보여 준다.
  if (drawHole) fillEllipse(-w/6,-h/2+10,22,13,"#364c56");
  ctx.fillStyle="#f7e4b4";ctx.fillRect(-155,-h/2-63,280,48);
  ctx.fillStyle="#5b4937";ctx.font="bold 27px 'Malgun Gothic', sans-serif";
  ctx.fillText(PLAYGROUND_DATA.text.slideWarning,-15,-h/2-39);
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
