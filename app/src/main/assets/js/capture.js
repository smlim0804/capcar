function keywordOf(text) {
  for (const keyword of SYMPTOM_KEYWORDS) {
    if (text.includes(keyword)) {
      return keyword;
    }
  }
  return '기타';
}

function findCapture(id) {
  for (const capture of HISTORY) {
    if (capture.id === id) {
      return capture;
    }
  }
  for (const capture of state.captures) {
    if (capture.id === id) {
      return capture;
    }
  }
  return null;
}

function waitingCapture() {
  if (state.extraFor === null || nowMs() >= state.extraUntil) {
    return null;
  }
  return findCapture(state.extraFor);
}

function lastSample(capture) {
  return capture.samples[9];
}

function quoteOf(capture) {
  if (capture.extra !== '') {
    return capture.extra;
  }
  return capture.said;
}

function groupOf(key) {
  const group = [];
  for (const capture of HISTORY) {
    if (capture.key === key) {
      group.push(capture);
    }
  }
  for (const capture of state.captures) {
    if (capture.type === 'symptom' && capture.key === key) {
      group.push(capture);
    }
  }
  return group;
}

function symptomKeys() {
  const keys = [];
  for (const capture of HISTORY.concat(state.captures)) {
    if (capture.type === 'symptom' && capture.key && !keys.includes(capture.key)) {
      keys.push(capture.key);
    }
  }
  return keys;
}

function findPlaces(position, category, side) {
  const best = {};
  for (const shop of SHOPS) {
    if (shop.name === '' || shop.side !== side) {
      continue;
    }
    if (shop.position < position - 200 || shop.position > position + 50) {
      continue;
    }
    let score = position - shop.position;
    if (score < 0) {
      score = 1000000 - score;
    }
    if (!best[shop.name] || score < best[shop.name].score) {
      best[shop.name] = { shop: shop, score: score };
    }
  }

  let sideText = '왼쪽';
  if (side === 'R') {
    sideText = '오른쪽';
  }

  const places = [];
  for (const name of Object.keys(best).sort()) {
    if (places.length === 3) {
      break;
    }
    const shop = best[name].shop;
    const meters = Math.round((position - shop.position) / 10) * 10;
    let where = '바로 옆';
    if (meters > 0) {
      where = '약 ' + meters + 'm 전';
    }
    if (meters < 0) {
      where = '약 ' + (-meters) + 'm 앞';
    }
    places.push({ name: name, category: category, sideText: sideText, where: where, position: shop.position });
  }
  return places;
}

function capture(type, said, understood) {
  const samples = state.buffer.slice(-10);
  while (samples.length < 10) {
    const first = samples[0] || takeSample();
    samples.unshift(Object.assign({}, first));
  }

  state.captureCount += 1;
  const newCapture = {
    id: 'c' + state.captureCount,
    type: type,
    said: said,
    extra: '',
    key: null,
    title: understood.title,
    date: '11/14',
    dateLong: '11월 14일',
    clock: clockText(state.clockMinutes),
    clockMinutes: state.clockMinutes,
    place: '○○로 골목',
    placeShort: '○○로',
    samples: samples,
    position: state.position,
    snapshot: makeSnapshot({
      lowBeam: state.lowBeam,
      wiper: state.wiper,
      outTemp: state.outTemp,
      tripMinutes: Math.round(state.tripMinutes),
      tripKm: Math.round(state.tripKm * 10) / 10
    })
  };

  if (type === 'symptom') {
    newCapture.key = understood.key || keywordOf(said);
  }
  if (type === 'place') {
    newCapture.category = understood.category;
    newCapture.candidates = findPlaces(state.position, understood.category, understood.side);
    state.placeMark = { position: state.position, side: understood.side };
    state.chosen[newCapture.id] = -1;
  }

  state.captures.push(newCapture);
  return newCapture;
}

function captureChips(capture) {
  const last = lastSample(capture);
  const speed = ['gauge', '시속 ' + last.speed + 'km'];

  if (capture.type === 'place') {
    return [
      ['clock', capture.clock],
      ['map-pin', '위치'],
      speed,
      ['compass', '진행 방향'],
      ['route', '지나온 경로 10초']
    ];
  }

  let brake = '브레이크 안 밟음';
  if (last.brake) {
    brake = '브레이크 밟음';
  }
  return [
    ['map-pin', '위치'],
    ['clock', capture.clock],
    speed,
    [turnIcon(last.angle), turnText(last.angle)],
    null,
    ['circle-dot', brake],
    ['rotate-cw', '핸들 ' + angleText(last.angle)],
    ['cog', '기어 ' + last.gear]
  ];
}

async function reply(text) {
  const message = addMessage('app', text, true);
  speak(text);
  let showMs = 600 + text.length * 70;
  if (showMs > 2600) {
    showMs = 2600;
  }
  await wait(showMs);
  message.box.classList.remove('speaking');
}

async function hear(text, message) {
  if (state.gear !== 'D') {
    showStatus('주행(D) 중에만 음성 캡처를 써요.');
    return;
  }
  if (state.busy) {
    return;
  }
  state.busy = true;
  try {
    await handleSpeech(text, message);
  } finally {
    state.busy = false;
    hearWaitingSentence();
  }
}

async function handleSpeech(text, message) {
  if (!message) {
    message = addMessage('me', text, false);
  }
  message.box.classList.remove('speaking');

  const said = cleanSpeech(text);
  const waiting = waitingCapture();
  const understood = await understand(text);
  if (understood.by === 'ai') {
    addNote('sparkles', understoodText(understood), true);
  }

  if (understood.intent === 'cancel') {
    const removed = state.captures.pop();
    state.extraFor = null;
    if (removed) {
      await reply('방금 캡처를 지웠어요.');
    } else {
      await reply('지울 캡처가 없어요.');
    }
    return;
  }

  const isExtra = understood.intent === 'extra' || (understood.intent === 'none' && understood.by === 'rule');
  if (waiting && isExtra) {
    state.extraFor = null;
    waiting.extra = said;
    waiting.key = understood.key || keywordOf(waiting.said + ' ' + said);
    if (understood.title !== '') {
      waiting.title = understood.title;
    }
    addNote('shield-check', '말한 그대로 글로 남기고, 음성 파일은 저장하지 않아요', false);
    await reply('남겼어요.');
    return;
  }

  if (understood.intent === 'none' || understood.intent === 'extra') {
    await reply('캡처하려면 "캡처해 줘"라고 말해 주세요.');
    return;
  }

  const newCapture = capture(understood.intent, said, understood);
  await wait(250);
  addCaptureChips(newCapture);
  await wait(900);

  if (understood.intent === 'place') {
    if (newCapture.candidates.length > 0) {
      await reply('캡처했어요. 주차하면 후보를 보여 드릴게요.');
    } else {
      await reply('캡처했어요. 주차하면 지나온 길을 보여 드릴게요.');
    }
  } else if (understood.intent === 'symptom') {
    state.extraFor = newCapture.id;
    state.extraUntil = nowMs() + 30000;
    await reply('캡처했어요. 더 남길 말씀이 있으면 말씀해 주세요.');
  } else {
    await reply('캡처했어요.');
  }
}
