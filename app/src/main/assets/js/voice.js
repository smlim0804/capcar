const BrowserRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const ANDROID_MIC_ERRORS = {
  'service-not-allowed': '이 기기에는 음성 인식 서비스가 없어요.',
  'not-allowed': '마이크 권한이 필요해요. 권한을 허용한 뒤 다시 켜 주세요.',
  'network': '음성 인식 서비스에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.',
  'audio-capture': '마이크를 찾지 못했어요. 마이크 연결을 확인해 주세요.',
  'language-not-supported': '이 기기는 한국어 음성 인식을 지원하지 않아요.'
};

const BROWSER_MIC_ERRORS = {
  'service-not-allowed': '마이크 권한이 꺼져 있어요. 주소창의 자물쇠를 눌러 마이크를 허용해 주세요.',
  'not-allowed': '마이크 권한이 꺼져 있어요. 주소창의 자물쇠를 눌러 마이크를 허용해 주세요.',
  'network': '음성 인식 서버에 연결하지 못했어요. 인터넷 연결을 확인하고 크롬이나 엣지로 열어 주세요.',
  'audio-capture': '마이크를 찾지 못했어요. 마이크 연결을 확인해 주세요.',
  'language-not-supported': '이 브라우저는 한국어 음성 인식을 지원하지 않아요. 크롬이나 엣지로 열어 주세요.'
};

let recognition = null;
let micOn = false;
let micQuietUntil = 0;
let micBubble = null;
let micQuickEnds = 0;
let micStartedAt = 0;
let micRestartTimer = 0;
let waitingSentence = null;

function canListen() {
  return IS_ANDROID_APP || Boolean(BrowserRecognition);
}

function canSpeak() {
  return IS_ANDROID_APP || 'speechSynthesis' in window;
}

function speak(text) {
  if (!canSpeak()) {
    return;
  }
  micQuietUntil = nowMs() + text.length * 230 + 1500;

  if (IS_ANDROID_APP) {
    window.CapCarNative.speak(text);
    return;
  }

  const speech = new SpeechSynthesisUtterance(text);
  speech.lang = 'ko-KR';
  speech.rate = 1.05;
  for (const voice of speechSynthesis.getVoices()) {
    if (voice.lang.toLowerCase().startsWith('ko')) {
      speech.voice = voice;
      break;
    }
  }
  speech.onend = onSpeakDone;
  speech.onerror = onSpeakDone;
  speechSynthesis.cancel();
  speechSynthesis.speak(speech);
}

function onSpeakDone() {
  micQuietUntil = nowMs() + 350;
}

function startListening() {
  clearTimeout(micRestartTimer);
  micStartedAt = nowMs();

  if (IS_ANDROID_APP) {
    window.CapCarNative.startListening();
    return;
  }

  recognition = new BrowserRecognition();
  recognition.lang = 'ko-KR';
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.maxAlternatives = 1;
  recognition.onresult = onBrowserResult;
  recognition.onerror = function (event) {
    onListenError(event.error);
  };
  recognition.onend = onListenEnd;
  try {
    recognition.start();
  } catch (error) {
    micFail('마이크를 켤 수 없어요. 다른 탭이나 앱이 마이크를 쓰고 있는지 확인해 주세요.');
  }
}

function stopListening() {
  clearTimeout(micRestartTimer);

  if (IS_ANDROID_APP) {
    window.CapCarNative.stopListening();
    return;
  }
  if (recognition) {
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.abort();
    recognition = null;
  }
}

function onBrowserResult(event) {
  let finalText = '';
  let partText = '';
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i];
    if (result.isFinal) {
      finalText += result[0].transcript;
    } else {
      partText += result[0].transcript;
    }
  }
  if (finalText !== '') {
    onHeard(finalText, true);
  } else {
    onHeard(partText, false);
  }
}

function onHeard(text, isFinal) {
  text = text.trim();
  if (!micOn || text === '') {
    return;
  }
  micQuickEnds = 0;
  showStatus('');

  if (nowMs() < micQuietUntil) {
    return;
  }
  if (state.busy) {
    if (isFinal) {
      waitingSentence = text;
    }
    return;
  }

  if (!micBubble) {
    micBubble = addMessage('me', '', true);
  }
  micBubble.bubble.textContent = text;

  if (isFinal) {
    const message = micBubble;
    micBubble = null;
    hear(text, message);
  }
}

function hearWaitingSentence() {
  const sentence = waitingSentence;
  waitingSentence = null;
  if (sentence && micOn) {
    setTimeout(function () {
      hear(sentence, null);
    }, 60);
  }
}

function onListenError(name) {
  if (!micOn || name === 'aborted') {
    return;
  }
  if (name === 'no-speech') {
    showStatus('말소리가 들리지 않았어요. 계속 안 들리면 마이크 장치를 확인해 주세요.');
    return;
  }
  let message = BROWSER_MIC_ERRORS[name];
  if (IS_ANDROID_APP) {
    message = ANDROID_MIC_ERRORS[name];
  }
  micFail(message || '음성 인식이 멈췄어요. 마이크를 다시 켜 주세요.');
}

function onListenEnd() {
  if (!micOn) {
    return;
  }
  if (nowMs() - micStartedAt < 1500) {
    micQuickEnds += 1;
  } else {
    micQuickEnds = 0;
  }
  if (micQuickEnds >= 4) {
    micFail('음성 인식이 켜지자마자 끊겨요. 마이크와 음성 인식 설정을 확인해 주세요.');
    return;
  }
  micRestartTimer = setTimeout(function () {
    if (micOn) {
      startListening();
    }
  }, 250);
}

function updateMicButton() {
  const button = find('#b-mic');
  if (button) {
    button.classList.toggle('on', micOn);
    if (micOn) {
      button.innerHTML = icon('mic') + '듣는 중, 누르면 끄기';
    } else {
      button.innerHTML = icon('mic-off') + '마이크 켜기';
    }
  }
  const listening = find('#lis');
  if (listening) {
    if (micOn) {
      listening.style.display = 'inline-flex';
    } else {
      listening.style.display = 'none';
    }
  }
}

function startMic() {
  if (!canListen()) {
    showStatus('이 브라우저는 음성 인식을 지원하지 않아요. 크롬이나 엣지로 열어 주세요.');
    return;
  }
  if (state.gear !== 'D') {
    showStatus('주행(D) 중에만 음성 캡처를 써요.');
    return;
  }
  micOn = true;
  micQuickEnds = 0;
  showStatus('');
  updateMicButton();
  startListening();
}

function stopMic() {
  micOn = false;
  stopListening();
  if (micBubble) {
    micBubble.box.remove();
    micBubble = null;
  }
  updateMicButton();
}

function toggleMic() {
  if (micOn) {
    stopMic();
  } else {
    startMic();
  }
}

function micFail(message) {
  stopMic();
  showStatus(message);
}

function startReadingRealCar() {
  state.useRealCar = true;
  window.CapCarNative.setVehiclePolling(true);
}

function onCarValues(ok, speed, gear) {
  if (!state.useRealCar) {
    return;
  }
  if (!ok) {
    state.useRealCar = false;
    window.CapCarNative.setVehiclePolling(false);
    return;
  }
  find('#ptag').textContent = '프로토타입, 속도와 기어는 차량 값';
  if (typeof speed === 'number') {
    state.speed = speed;
  }
  if (gear === 'P' || gear === 'D') {
    setGear(gear);
  }
}
