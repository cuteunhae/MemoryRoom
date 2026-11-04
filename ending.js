"use strict";
const endingUi = { mode: null, startedAt: 0, scene: -1 };
const endingImages = new Map();

function startEnding() {
  if(endingUi.mode)return;
  gameState.endingReached=true;
  gameState.endingCompleted=true;
  if(typeof saveProgress==="function")saveProgress();
  if(inventoryUiState.open)closeInventory();
  pressedKeys.clear();stopBubbleDrag();
  endingUi.mode="playing";endingUi.startedAt=Date.now();endingUi.scene=-1;
  document.getElementById("ending-dialog").setAttribute("data-mode","playing");
  document.getElementById("ending-title").hidden=false;
  for(const [index,entry] of ENDING_DATA.scenes.entries()) {
    if(!entry.image || endingImages.has(entry.image))continue;
    const picture=new Image();endingImages.set(entry.image,picture);
    picture.onload=()=>{if(endingUi.mode==="playing"&&endingUi.scene===index)drawEndingScene(index);};
    picture.src=entry.image;
  }
  document.getElementById("ending-title").textContent=ENDING_DATA.text.title;
  document.getElementById("ending-menu").hidden=true;
  document.getElementById("ending-art").hidden=false;
  document.getElementById("ending-caption").hidden=false;
  document.getElementById("ending-dialog").showModal();
  document.getElementById("ending-dialog").focus();
  updateEnding();
}

function showEndingMenu() {
  endingUi.mode="menu";
  document.getElementById("ending-dialog").setAttribute("data-mode","menu");
  document.getElementById("ending-title").hidden=true;
  document.getElementById("ending-art").hidden=true;
  document.getElementById("ending-caption").hidden=true;
  document.getElementById("ending-menu").hidden=false;
  document.getElementById("ending-message").hidden=true;
  document.getElementById("ending-restart").hidden=false;
  document.getElementById("ending-exit").hidden=false;
  document.getElementById("ending-restart").focus();
}

function exitEndingGame() {
  if(endingUi.mode!=="menu")return;
  if(typeof saveProgress==="function")saveProgress();
  endingUi.mode="exited";pressedKeys.clear();
  document.getElementById("ending-dialog").setAttribute("data-mode","exited");
  document.getElementById("ending-message").textContent=ENDING_DATA.text.exitMessage;
  document.getElementById("ending-message").hidden=false;
  document.getElementById("ending-restart").hidden=true;
  document.getElementById("ending-exit").hidden=true;
  document.getElementById("ending-dialog").focus();
}

function updateEnding() {
  if(endingUi.mode!=="playing")return;
  const elapsed=Math.max(0,Date.now()-endingUi.startedAt), total=ENDING_DATA.scenes.reduce((sum,entry)=>sum+entry.durationMs,0);
  if(elapsed>=total){showEndingMenu();return;}
  let scene=0,within=elapsed;
  while(within>=ENDING_DATA.scenes[scene].durationMs){within-=ENDING_DATA.scenes[scene].durationMs;scene++;}
  const entry=ENDING_DATA.scenes[scene];
  if(scene!==endingUi.scene){endingUi.scene=scene;drawEndingScene(scene);document.getElementById("ending-caption").textContent=entry.title;}
  const opacity=Math.min(1,within/ENDING_DATA.fadeMs,(entry.durationMs-within)/ENDING_DATA.fadeMs);
  document.getElementById("ending-art").setAttribute("style",`opacity:${Math.max(0,opacity)}`);
  document.getElementById("ending-caption").setAttribute("style",`opacity:${Math.max(0,opacity)}`);
}

function drawEndingScene(scene) {
  // TODO: 기획서 순서에 맞춘 임시 회상 그림이다. 최종 일러스트로 교체한다.
  const c=document.getElementById("ending-art").getContext("2d");
  const entry=ENDING_DATA.scenes[scene];
  c.clearRect(0,0,900,500);c.fillStyle=entry.background;c.fillRect(0,0,900,500);
  const picture=entry.image&&endingImages.get(entry.image);
  if(picture?.complete&&picture.naturalWidth) {
    const scale=Math.min(900/picture.naturalWidth,500/picture.naturalHeight),w=picture.naturalWidth*scale,h=picture.naturalHeight*scale;
    c.drawImage(picture,(900-w)/2,(500-h)/2,w,h);return;
  }
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const ellipse=(x,y,rx,ry,color)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();};
  const line=(points,color,width=5)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();};
  const bear=(x,y,s)=>{ellipse(x-26*s,y-35*s,14*s,14*s,"#97673e");ellipse(x+26*s,y-35*s,14*s,14*s,"#97673e");ellipse(x,y+46*s,37*s,46*s,"#97673e");ellipse(x,y,40*s,38*s,"#b17e50");ellipse(x-13*s,y-5*s,4*s,4*s,"#403127");ellipse(x+13*s,y-5*s,4*s,4*s,"#403127");ellipse(x,y+13*s,6*s,5*s,"#403127");line([[x-24*s,y+37*s],[x,y+46*s],[x+24*s,y+37*s]],"#527ea7",12*s);};
  if(scene===0){rect(180,65,540,370,"#fff8e8");rect(205,88,490,300,"#d5b89c");ellipse(450,207,64,68,"#e8bd96");rect(378,260,144,108,"#849c89");rect(260,334,380,34,"#ab7e59");rect(414,300,72,35,"#fff3da");line([[450,300],[450,277]],"#bd7254");}
  if(scene===1){rect(180,120,540,210,"#b58d61");rect(210,330,26,100,"#8c694b");rect(664,330,26,100,"#8c694b");rect(270,158,170,128,"#f7edcd");for(let i=0;i<5;i++)line([[290,185+i*18],[420,185+i*18]],"#c7c4ac",2);["#be685b","#5d8eab","#d6ac56","#7b9c6d"].forEach((color,i)=>line([[505+i*30,185],[490+i*30,280]],color,14));}
  if(scene===2){ellipse(450,350,235,54,"#b49366");rect(440,130,20,220,"#a47c55");c.beginPath();c.moveTo(200,160);c.lineTo(450,50);c.lineTo(700,160);c.closePath();c.fillStyle="#c98e76";c.fill();for(let i=0;i<6;i++){const x=260+i*75;line([[x,163],[x,350]],"#ab9369");ellipse(x,286,25,14,"#e8d3ac");ellipse(x+20,268,12,20,"#e8d3ac");}}
  if(scene===3){for(const [x,y,r] of [[450,230,155],[210,130,48],[700,340,66]]){ellipse(x,y,r,r,"#d6e9de");c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.strokeStyle="#91b8c2";c.lineWidth=4;c.stroke();}bear(450,212,1.4);}
  if(scene===4){rect(240,180,420,240,"#cbb18a");c.beginPath();c.moveTo(190,185);c.lineTo(450,55);c.lineTo(710,185);c.closePath();c.fillStyle="#9b7261";c.fill();rect(420,292,70,128,"#82654f");rect(292,230,80,70,"#a7c7c2");rect(540,230,80,70,"#a7c7c2");line([[355,470],[450,420]],"#b2a88b",35);}
  if(scene===5){c.globalAlpha=.55;ellipse(480,120,57,62,"#dbaf86");rect(408,180,144,220,"#77918a");c.globalAlpha=.85;ellipse(430,226,44,47,"#f0c9a0");rect(380,271,100,132,"#bd8e69");c.globalAlpha=1;}
}

document.getElementById("ending-restart").textContent=ENDING_DATA.text.restart;
document.getElementById("ending-exit").textContent=ENDING_DATA.text.exit;
document.getElementById("ending-restart").addEventListener("click",()=>requestNewGame());
document.getElementById("ending-exit").addEventListener("click",exitEndingGame);
document.getElementById("ending-dialog").addEventListener("cancel",event=>event.preventDefault());
