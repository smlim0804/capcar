const IS_ANDROID_APP = Boolean(window.CapCarNative);
const SCREEN_WIDTH = 1920;
const SCREEN_HEIGHT = 1080;

let AI_SERVER = 'http://localhost:11434';
if (IS_ANDROID_APP) {
  AI_SERVER = 'http://10.0.2.2:11434';
}

const state = {
  gear: 'D',
  clockMinutes: 18 * 60 + 50,
  speed: 48,
  angle: 0,
  brake: false,
  signal: 'off',
  wiper: false,
  lowBeam: true,
  outTemp: 8,
  position: 400,
  driveSeconds: 0,
  tripMinutes: 9,
  tripKm: 5.2,

  buffer: [],
  secondsSinceSample: 0,

  captures: [],
  captureCount: 0,
  extraFor: null,
  extraUntil: 0,
  placeMark: null,
  chosen: {},

  view: 'drive',
  reportKey: null,
  detailId: null,
  detailTime: 9,
  backView: 'report',
  draggingChart: false,
  scale: 1,

  busy: false,
  useRealCar: false,
  aiModel: '',
  aiOn: false
};

function find(selector) {
  return document.querySelector(selector);
}

function nowMs() {
  return performance.now();
}

function wait(ms) {
  return new Promise(function (done) {
    setTimeout(done, ms);
  });
}

function clamp(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function icon(name, size) {
  let style = '';
  if (size) {
    style = ' style="width:' + size + ';height:' + size + '"';
  }
  return '<svg class="ic"' + style + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"' +
    ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
}

function escapeHtml(text) {
  let result = String(text);
  result = result.split('&').join('&amp;');
  result = result.split('<').join('&lt;');
  result = result.split('>').join('&gt;');
  result = result.split('"').join('&quot;');
  return result;
}

function clockText(minutes) {
  minutes = Math.floor(minutes) % 1440;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  let half = '오후';
  if (hour < 12) {
    half = '오전';
  }
  let hour12 = hour % 12;
  if (hour12 === 0) {
    hour12 = 12;
  }
  let minuteText = String(minute);
  if (minute < 10) {
    minuteText = '0' + minuteText;
  }
  return half + ' ' + hour12 + ':' + minuteText;
}

function angleText(angle) {
  const size = Math.abs(Math.round(angle));
  if (Math.abs(angle) < 1) {
    return '0°';
  }
  if (angle > 0) {
    return '오른쪽 ' + size + '°';
  }
  return '왼쪽 ' + size + '°';
}

function turnText(angle) {
  if (angle >= 30) {
    return '우회전 중';
  }
  if (angle <= -30) {
    return '좌회전 중';
  }
  return '직진 중';
}

function turnIcon(angle) {
  if (angle <= -30) {
    return 'corner-up-left';
  }
  return 'corner-up-right';
}

function onOffText(on) {
  if (on) {
    return '켜짐';
  }
  return '꺼짐';
}
