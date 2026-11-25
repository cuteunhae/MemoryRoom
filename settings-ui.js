"use strict";
function keyLabel(code) { return code ? code.replace(/^Key/, "").replace(/^Digit/, "") : SETTINGS_DATA.text.unassigned; }
function renderSettings() {
  const list = document.getElementById("settings-keys");list.replaceChildren();
  for (const [action,name] of Object.entries(SETTINGS_DATA.actions)) {
    const button = document.createElement("button");button.type="button";button.dataset.action=action;
    button.textContent=`${name}: ${settingsUi.listening===action ? SETTINGS_DATA.text.listening : keyLabel(userPreferences.keys[action])}`;
    button.setAttribute("aria-pressed",String(settingsUi.listening===action));
    button.addEventListener("click",()=>{settingsUi.listening=action;renderSettings();Array.from(list.children).find(button=>button.dataset.action===action)?.focus();});
    list.append(button);
  }
  document.getElementById("settings-cancel-key").hidden=!settingsUi.listening;
  for (const kind of ["bgm","sfx"]) {
    document.getElementById(`settings-${kind}`).value=Math.round(userPreferences.sound[`${kind}Volume`]*100);
    document.getElementById(`settings-${kind}-value`).textContent=`${Math.round(userPreferences.sound[`${kind}Volume`]*100)}%`;
  }
}
function assignSettingKey(code,modified=false) {
  if (!settingsUi.open || !settingsUi.listening) return false;
  if (modified || !validBindingCode(code)) {document.getElementById("settings-message").textContent=SETTINGS_DATA.text.unsupported;return false;}
  const keys={...userPreferences.keys};
  for(const action of Object.keys(keys))if(keys[action]===code)keys[action]=null;
  keys[settingsUi.listening]=code;
  if(!savePreferences({...userPreferences,keys})) {document.getElementById("settings-message").textContent=SETTINGS_DATA.text.failed;return false;}
  settingsUi.listening=null;pressedKeys.clear();heldMovementCodes.clear();
  document.getElementById("settings-message").textContent=SETTINGS_DATA.text.help;
  renderSettings();document.getElementById("settings-close").focus();return true;
}
function closeSettings() {
  settingsUi.open=false;settingsUi.listening=null;
  document.getElementById("settings-dialog").close();pressedKeys.clear();heldMovementCodes.clear();
  if(settingsUi.returnFocus?.focus)settingsUi.returnFocus.focus();else canvas.focus();
}
function toggleSettings() {
  if (typeof openingUi !== "undefined" && openingUi.active) return;
  if (typeof endingUi !== "undefined" && endingUi.mode) return;
  if(settingsUi.open)return closeSettings();
  settingsUi.returnFocus=document.activeElement;settingsUi.open=true;settingsUi.listening=null;
  pressedKeys.clear();heldMovementCodes.clear();stopBubbleDrag();
  stopRegistryStroke();
  document.getElementById("settings-message").textContent=SETTINGS_DATA.text.help;
  renderSettings();document.getElementById("settings-dialog").showModal();document.getElementById("settings-close").focus();
}
function setSoundVolume(kind,value) {
  const volume=Number(value)/100;
  if(!["bgm","sfx"].includes(kind)||!Number.isFinite(volume)||volume<0||volume>1)return false;
  const success=savePreferences({...userPreferences,sound:{...userPreferences.sound,[`${kind}Volume`]:volume,muted:false}});
  if(!success)document.getElementById("settings-message").textContent=SETTINGS_DATA.text.failed;
  document.getElementById(`settings-${kind}-value`).textContent=`${Math.round(userPreferences.sound[`${kind}Volume`]*100)}%`;
  document.getElementById(`settings-${kind}`).value=Math.round(userPreferences.sound[`${kind}Volume`]*100);
  if (typeof syncBackgroundMusic === "function") syncBackgroundMusic();
  return success;
}
// 힌트 알림음을 비롯한 소리 재생에 사용할 실제 채널 볼륨이다.
function getSoundVolume(kind) { return userPreferences.sound.muted ? 0 : userPreferences.sound[`${kind}Volume`]; }
for(const kind of ["bgm","sfx"]) {
  document.getElementById(`settings-${kind}-label`).textContent=SETTINGS_DATA.text[kind];
  document.getElementById(`settings-${kind}`).addEventListener("input",event=>setSoundVolume(kind,event.target.value));
}
for(const [id,text] of Object.entries({"settings-title":"title","settings-close":"close","settings-restore":"restore","settings-cancel-key":"cancel","settings-sound-note":"soundNote"}))document.getElementById(id).textContent=SETTINGS_DATA.text[text];
document.getElementById("settings-new-game").textContent=SAVE_DATA.text.restart;
document.getElementById("settings-new-game").addEventListener("click",requestNewGame);
document.getElementById("settings-close").addEventListener("click",closeSettings);
document.getElementById("settings-dialog").addEventListener("cancel",event=>event.preventDefault());
document.getElementById("settings-cancel-key").addEventListener("click",()=>{settingsUi.listening=null;renderSettings();});
document.getElementById("settings-restore").addEventListener("click",()=>{
  if(savePreferences({...userPreferences,keys:{...SETTINGS_DATA.keys}})) {settingsUi.listening=null;pressedKeys.clear();heldMovementCodes.clear();renderSettings();}
  else document.getElementById("settings-message").textContent=SETTINGS_DATA.text.failed;
});
// 사용자 결정: 마우스 설정 버튼은 화면 오른쪽 아래에만 둔다. 상세창에는 넣지 않는다.
// 설정 키가 할당 없음이어도 창을 닫기 버튼으로 닫은 뒤 이 버튼으로 설정을 열 수 있다.
{
  const fullscreenButton = document.createElement("button");
  fullscreenButton.id = "fullscreen-toggle";
  fullscreenButton.type = "button";
  fullscreenButton.className = "settings-open";
  const refreshFullscreen = () => {
    const active = !!document.fullscreenElement;
    fullscreenButton.textContent = active ? SETTINGS_DATA.fullscreen.exit : SETTINGS_DATA.fullscreen.enter;
    fullscreenButton.setAttribute("aria-pressed", String(active));
    pressedKeys.clear(); heldMovementCodes.clear();
  };
  fullscreenButton.addEventListener("click", async () => {
    if (!document.documentElement?.requestFullscreen) {
      showDoorMessage(SETTINGS_DATA.fullscreen.unavailable); return;
    }
    fullscreenButton.disabled = true;
    try {
      // 캔버스뿐 아니라 설정·인벤토리 등 모든 UI를 함께 전체화면으로 표시한다.
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { showDoorMessage(SETTINGS_DATA.fullscreen.failed); }
    finally { fullscreenButton.disabled = false; refreshFullscreen(); canvas.focus(); }
  });
  document.addEventListener("fullscreenchange", refreshFullscreen);
  refreshFullscreen();
  const button=document.createElement("button");button.type="button";button.className="settings-open";
  button.id = "settings-toggle";
  const gear = document.createElement("img");
  gear.src = SETTINGS_DATA.launcherIcon;
  gear.alt = "";
  button.append(gear);
  button.setAttribute("aria-label", SETTINGS_DATA.text.title);
  button.addEventListener("click",toggleSettings);document.getElementById("settings-launcher").append(button);
  document.getElementById("settings-launcher").append(fullscreenButton);
}
