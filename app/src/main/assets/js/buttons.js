let toastTimer = 0;
let statusText = '';

function showToast(text) {
  find('#toastt').innerHTML = icon('check') + escapeHtml(text);
  find('#toast').classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    find('#toast').classList.remove('on');
  }, 2600);
}

function showStatus(text) {
  statusText = text;
  const status = find('#status');
  if (status) {
    status.textContent = text;
  }
}

function chosenPlace(captureId) {
  const capture = findCapture(captureId);
  if (!capture) {
    return null;
  }
  return capture.candidates[state.chosen[captureId]] || null;
}

function pressScreenButton(button) {
  const action = button.dataset.act;
  const id = button.dataset.id;

  if (action === 'cand') {
    state.chosen[id] = Number(button.dataset.i);
    const buttons = button.closest('.card').querySelectorAll('.cand');
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].classList.toggle('sel', i === state.chosen[id]);
    }
  } else if (action === 'go') {
    const place = chosenPlace(id);
    if (place) {
      showToast(place.name + '를 내비게이션 목적지로 보냈어요');
    } else {
      showToast('먼저 후보를 골라 주세요');
    }
  } else if (action === 'later') {
    const place = chosenPlace(id);
    if (place) {
      showToast(place.name + '를 저장했어요. 근처를 지나면 알려 드릴게요');
    } else {
      showToast('먼저 후보를 골라 주세요');
    }
  } else if (action === 'nomatch') {
    showToast('지나온 길을 지도에 남겨 둘게요');
  } else if (action === 'report') {
    state.reportKey = button.dataset.key;
    state.view = 'report';
    showView();
  } else if (action === 'detail') {
    state.detailId = id;
    state.backView = button.dataset.back || 'report';
    state.detailTime = 9;
    state.view = 'detail';
    showView();
  } else if (action === 'back') {
    state.view = state.backView;
    showView();
  } else if (action === 'cards') {
    state.view = 'cards';
    showView();
  } else if (action === 'shop') {
    showToast('폰으로 옮기는 기능은 다음 단계에서 넣을 예정이에요');
  }
}

function moveChartTime(event) {
  const plot = find('#chart .plot');
  if (!plot) {
    return;
  }
  const box = plot.getBoundingClientRect();
  const x = (event.clientX - box.left) / box.width * CHART_WIDTH;
  state.detailTime = clamp((x - CHART_SIDE) / CHART_STEP, 0, 9);
  drawDetail();
}

function onScreenClick(event) {
  const gearButton = event.target.closest('[data-gear]');
  if (gearButton) {
    setGear(gearButton.dataset.gear);
    return;
  }
  if (event.target.closest('#b-mic')) {
    toggleMic();
    return;
  }
  const button = event.target.closest('[data-act]');
  if (button) {
    pressScreenButton(button);
  }
}

function onChatKey(event) {
  if (event.target.id !== 'chat' || event.key !== 'Enter' || event.isComposing) {
    return;
  }
  const text = event.target.value.trim();
  if (text !== '') {
    event.target.value = '';
    hear(text, null);
  }
}

function setUpButtons() {
  const screen = find('#disp');
  screen.addEventListener('click', onScreenClick);
  screen.addEventListener('keydown', onChatKey);

  screen.addEventListener('pointerdown', function (event) {
    if (event.target.closest('#chart')) {
      state.draggingChart = true;
      moveChartTime(event);
    }
  });
  window.addEventListener('pointermove', function (event) {
    if (state.draggingChart) {
      moveChartTime(event);
    }
  });
  window.addEventListener('pointerup', function () {
    if (state.draggingChart) {
      state.draggingChart = false;
      state.detailTime = Math.round(state.detailTime);
      drawDetail();
    }
  });
}
