function fillFrameIcons() {
  find('#i-lock').innerHTML = icon('lock', '26px');
  find('#i-search').innerHTML = icon('search', '22px');
  find('#i-status').innerHTML = icon('bell', '26px') + ' ' + icon('bluetooth', '26px') + ' ' + icon('wifi', '26px');
  find('#i-status').style.cssText = 'display:inline-flex;gap:20px;align-items:center';
  find('#i-user').innerHTML = icon('user', '22px');
  find('#i-fuel').innerHTML = icon('fuel') + '주행 가능';
  find('#i-temp').innerHTML = icon('thermometer') + '외부 온도';
  find('#t-l').innerHTML = icon('fan', '28px') + '22.0°';
  find('#t-r').innerHTML = '22.0°' + icon('fan', '28px');

  let slots = '';
  for (const name of ['car-front', 'navigation', 'music']) {
    slots += '<i>' + icon(name, '28px') + '</i>';
  }
  slots += '<i class="me"><u></u></i>';
  for (const name of ['phone', 'shopping-bag', 'layout-grid']) {
    slots += '<i>' + icon(name, '28px') + '</i>';
  }
  find('#slots').innerHTML = slots;
}

function fitScreen() {
  const wrap = find('#stagewrap');
  const scale = Math.min(wrap.clientWidth / SCREEN_WIDTH, wrap.clientHeight / SCREEN_HEIGHT);
  const left = (wrap.clientWidth - SCREEN_WIDTH * scale) / 2;
  const top = (wrap.clientHeight - SCREEN_HEIGHT * scale) / 2;
  state.scale = scale;
  find('#disp').style.transform = 'translate(' + left + 'px,' + top + 'px) scale(' + scale + ')';
}

function showView() {
  const screen = find('#appwin');
  if (state.view === 'report' && groupOf(state.reportKey).length === 0) {
    state.view = 'cards';
  }
  if (state.view === 'detail' && !findCapture(state.detailId)) {
    state.view = 'cards';
  }

  if (state.view === 'report') {
    screen.innerHTML = reportViewHtml();
  } else if (state.view === 'detail') {
    screen.innerHTML = detailViewHtml();
    drawDetail();
  } else {
    if (!find('#side')) {
      screen.innerHTML = mainViewHtml();
    }
    showSide();
  }
  drawDriving();
  updateMicButton();
}

let lastFrameTime = nowMs();

function nextFrame() {
  const now = nowMs();
  let seconds = (now - lastFrameTime) / 1000;
  if (seconds > 0.1) {
    seconds = 0.1;
  }
  lastFrameTime = now;
  stepCar(seconds);
  drawDriving();
  requestAnimationFrame(nextFrame);
}

function start() {
  fillFrameIcons();
  setUpButtons();
  fitScreen();
  window.addEventListener('resize', fitScreen);
  showView();
  nextFrame();
  connectAi();
  if (IS_ANDROID_APP) {
    startReadingRealCar();
  }
}

start();
