"use strict";

// 외부 패키지 없이 게임 파일만 제공하는 로컬 서버다.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const files = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
  "/city-data.js": ["city-data.js", "text/javascript; charset=utf-8"],
  "/game.js": ["game.js", "text/javascript; charset=utf-8"],
};
files["/data/items.js"] = ["data/items.js", "text/javascript; charset=utf-8"];
files["/data/objects.js"] = ["data/objects.js", "text/javascript; charset=utf-8"];
files["/game-state.js"] = ["game-state.js", "text/javascript; charset=utf-8"];
files["/inventory-list.js"] = ["inventory-list.js", "text/javascript; charset=utf-8"];
files["/inventory-ui.js"] = ["inventory-ui.js", "text/javascript; charset=utf-8"];
files["/studio-ui.js"] = ["studio-ui.js", "text/javascript; charset=utf-8"];
files["/school.js"] = ["school.js", "text/javascript; charset=utf-8"];
files["/data/school.js"] = ["data/school.js", "text/javascript; charset=utf-8"];
for (const file of ["data/classroom.js", "data/ordinary-items.js", "classroom.js", "data/registry.js", "data/achievement-conditions.js", "registry.js", "data/park.js", "park.js", "park-ui.js", "data/playground.js", "playground.js", "slide.js", "bubbles.js", "data/cabinet.js", "cabinet.js", "data/settings.js", "input.js", "map-ui.js", "settings-ui.js", "data/hints.js", "hints.js", "data/save.js", "save.js", "achievements.js", "data/diary.js", "diary.js", "data/house.js", "house.js"]) {
  files[`/${file}`] = [file, "text/javascript; charset=utf-8"];
}
const server = http.createServer((request, response) => {
  const file = files[request.url.split("?")[0]];
  if (!file || !["GET", "HEAD"].includes(request.method)) {
    response.writeHead(404);
    response.end();
    return;
  }
  fs.readFile(path.join(__dirname, file[0]), (error, contents) => {
    if (error) {
      response.writeHead(500);
      response.end("파일을 읽을 수 없습니다.");
      return;
    }
    response.writeHead(200, { "Content-Type": file[1], "Cache-Control": "no-store" });
    response.end(request.method === "HEAD" ? undefined : contents);
  });
});
server.on("error", error => {
  console.error(error.code === "EADDRINUSE"
    ? "8000번 포트를 사용 중입니다. 이미 실행한 게임 서버가 있는지 확인하세요."
    : error.message);
  process.exitCode = 1;
});
server.listen(8000, "127.0.0.1", () => {
  console.log("게임 주소: http://127.0.0.1:8000");
  console.log("종료하려면 Ctrl+C를 누르세요.");
});
