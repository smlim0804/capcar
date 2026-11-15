const DRIVER_FACE = `<div class="av drv"><svg width="68" height="68" viewBox="0 0 76 76" aria-hidden="true">
  <circle cx="38" cy="30" r="13" fill="#8798B1"/>
  <path d="M13 72c2-16 12-23 25-23s23 7 25 23z" fill="#8798B1"/>
</svg></div>`;
const APP_FACE = '<div class="av app"><i></i></div>';
const VOICE_WAVE = '<span class="wave"><i></i><i></i><i></i><i></i></span>';

function trimThread() {
  const thread = find('#thread');
  if (!thread) {
    return;
  }
  while (thread.scrollHeight > thread.clientHeight + 2 && thread.children.length > 1) {
    thread.removeChild(thread.firstElementChild);
  }
}

function addToThread(box) {
  const thread = find('#thread');
  if (!thread) {
    return;
  }
  const hint = find('#hint');
  if (hint) {
    hint.remove();
  }
  thread.appendChild(box);
  trimThread();
}

function addMessage(who, text, speaking) {
  const box = document.createElement('div');
  if (who === 'me') {
    box.className = 'msg in me';
    box.innerHTML = DRIVER_FACE +
      '<div class="mb"><div class="who">' + VOICE_WAVE + '운전자</div><div class="bub me"></div></div>';
  } else {
    box.className = 'msg in';
    box.innerHTML = APP_FACE +
      '<div class="mb"><div class="who">캡차 음성 안내' + VOICE_WAVE + '</div><div class="bub app"></div></div>';
  }
  if (speaking) {
    box.classList.add('speaking');
  }
  const bubble = box.querySelector('.bub');
  bubble.textContent = text;
  addToThread(box);
  return { box: box, bubble: bubble };
}

function addCaptureChips(capture) {
  const chips = captureChips(capture);
  let chipsHtml = '';
  for (let i = 0; i < chips.length; i++) {
    const chip = chips[i];
    if (chip === null) {
      chipsHtml += '<i style="flex-basis:100%;height:0;margin-top:-10px"></i>';
    } else {
      const delay = 0.1 + i * 0.08;
      chipsHtml += '<span class="chip inp" style="animation-delay:' + delay + 's">' + icon(chip[0]) + escapeHtml(chip[1]) + '</span>';
    }
  }
  const box = document.createElement('div');
  box.className = 'sys in';
  box.innerHTML = '<div class="lab">' + icon('camera') + '이 순간 함께 캡처한 것</div><div class="chips">' + chipsHtml + '</div>';
  addToThread(box);
}

function addNote(iconName, text, fromAi) {
  const box = document.createElement('div');
  box.className = 'tnote inf';
  if (fromAi) {
    box.className = 'tnote ai inf';
  }
  box.innerHTML = icon(iconName) + escapeHtml(text);
  addToThread(box);
}

function mapPanelHtml() {
  return `<svg id="mapsvg" viewBox="0 0 540 750" width="540" height="750" style="display:block" aria-hidden="true">
    <rect width="540" height="750" fill="#E8ECF1"/>
    <path d="M270 -20 V770" stroke="#fff" stroke-width="64"/>
    <g id="mapdyn"></g>
    <g transform="translate(270,${CAR_Y})">
      <circle r="25" fill="var(--acc)"/>
      <g transform="rotate(-45) scale(1.05) translate(-12.5,-11.5)" fill="#fff" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS['navigation']}</g>
    </g>
  </svg>
  <div class="mapl" id="mapl" style="display:none">${icon('search')}지나온 길 200m 안에서 후보 찾기</div>
  <div class="maps">${icon('gauge')}<span id="mapspd">시속 48km</span></div>`;
}

function mainViewHtml() {
  return `<div class="v-drive">
    <div class="dhead inf">
      <span class="pill p-blue">${icon('car')}<span id="geartext">주행 중</span></span>
      <span class="t" id="headtext"></span>
      <span class="lis" id="lis"><i></i>듣는 중</span>
      <span class="sp"></span>
      <span class="dnote">${icon('info')}시연용 표시예요. 실제 주행 중에는 화면을 띄우지 않아요</span>
    </div>
    <div class="dcols">
      <div class="dpanel inf" id="dpanel">${mapPanelHtml()}</div>
      <div class="side" id="side"></div>
    </div>
  </div>`;
}

function chatHtml() {
  return `<div class="thread" id="thread">
    <div class="hint in" id="hint"><b>말로 캡처해 보세요.</b><br>아래 마이크 버튼을 누르고 말하거나, 입력 칸에 적으면 그대로 알아들어요.<br>예: "방금 오른쪽 빵집 저장해 줘", "브레이크 소리 이상해. 캡처해 줘"</div>
  </div>
  <div class="micbar">
    <button type="button" class="micbtn" id="b-mic"></button>
    <input type="text" class="chatinput" id="chat" placeholder="직접 입력하고 Enter" autocomplete="off">
  </div>
  <div class="status" id="status"></div>`;
}

function showSide() {
  const side = find('#side');
  if (state.view === 'cards') {
    side.className = 'side park';
    side.innerHTML = cardsHtml();
  } else {
    side.className = 'side';
    side.innerHTML = chatHtml();
    showStatus(statusText);
  }

  let gearText = '주행 중';
  let headText = icon('mic') + '화면 없이 음성만 써요';
  if (state.gear === 'P') {
    gearText = '주차 중';
    headText = '주행 중에 남긴 캡처를 정리했어요';
  }
  if (state.gear === 'R') {
    gearText = '후진 중';
    headText = '';
  }
  if (state.gear === 'N') {
    gearText = '중립';
    headText = '';
  }
  find('#geartext').textContent = gearText;
  find('#headtext').innerHTML = headText;
}

function drawStatusBar() {
  find('#clock').textContent = clockText(state.clockMinutes);
  find('#dv-speed').textContent = Math.round(state.speed);
  for (const gear of ['P', 'R', 'N', 'D']) {
    find('#g-' + gear).classList.toggle('on', state.gear === gear);
  }
}

function isMarkedShop(shop) {
  const mark = state.placeMark;
  if (!mark || shop.name === '' || shop.side !== mark.side) {
    return false;
  }
  return shop.position >= mark.position - 200 && shop.position <= mark.position + 50;
}

function drawMap() {
  const layer = find('#mapdyn');
  if (!layer) {
    return;
  }
  const scale = ROAD_PIXELS_PER_METER;
  let html = '';

  const offset = (state.position * scale) % 64;
  for (let y = -64 + offset; y < 760; y += 64) {
    html += '<rect x="267" y="' + y.toFixed(1) + '" width="6" height="26" rx="3" fill="#E1E6EB"/>';
  }

  if (state.placeMark) {
    const top = CAR_Y + (state.position - (state.placeMark.position + 50)) * scale;
    const lineTop = (top + 50 * scale).toFixed(1);
    const lineBottom = (top + 250 * scale).toFixed(1);
    html += '<rect x="118" y="' + top.toFixed(1) + '" width="304" height="' + (250 * scale) + '" rx="40" fill="var(--acc)" fill-opacity="0.11"/>';
    html += '<path d="M270 ' + lineTop + ' V' + lineBottom + '" stroke="var(--acc)" stroke-width="10" stroke-linecap="round"/>';
  }
  html += '<path d="M270 770 V' + CAR_Y + '" stroke="var(--acc)" stroke-width="8" stroke-linecap="round" opacity="0.3"/>';

  for (const shop of SHOPS) {
    const y = CAR_Y + (state.position - shop.position) * scale - 28;
    if (y < -70 || y > 770) {
      continue;
    }
    let x = 142;
    if (shop.side === 'R') {
      x = 318;
    }
    if (isMarkedShop(shop)) {
      html += '<rect x="' + x + '" y="' + y.toFixed(1) + '" width="80" height="56" rx="14" fill="var(--acc)" fill-opacity="0.62"/>';
      html += '<g transform="translate(' + (x + 25) + ',' + (y + 13).toFixed(1) + ') scale(1.25)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS['store'] + '</g>';
    } else {
      html += '<rect x="' + x + '" y="' + y.toFixed(1) + '" width="80" height="56" rx="14" fill="#DDE2E8"/>';
    }
  }
  layer.innerHTML = html;

  if (state.placeMark) {
    find('#mapl').style.display = 'flex';
  } else {
    find('#mapl').style.display = 'none';
  }
  find('#mapspd').textContent = '시속 ' + Math.round(state.speed) + 'km';
}

function drawDriving() {
  drawStatusBar();
  drawMap();
}
