const WAKE_WORDS = ['글레오', '글래오', '글레어', '글래어', '클레오', '클래오', '그래오', '글레요', '글래요', '글로'];
const WRONG_CAPTURE_WORDS = ['캡쳐', '켑처', '켑쳐', '캡춰', '캡차'];

const CANCEL_WORDS = ['취소', '지워', '삭제'];
const SYMPTOM_WORDS = ['소리', '진동', '떨', '경고', '냄새', '밀려', '밀리', '쏠려', '쏠리', '이상', '끼익', '덜컹', '삐걱', '흔들', '뻑뻑', '헐거', '브레이크', '멈추', '제동'];
const SAVE_WORDS = ['캡처', '기록', '저장', '남겨', '남기', '기억', '적어', '메모'];
const PLACE_WORDS = ['가게', '집', '곳', '여기', '거기', '저기', '건물', '간판'];
const LEFT_WORDS = ['왼쪽', '왼편'];

const AI_GUIDE = `너는 차량용 앱 '캡차'의 말 이해 모듈이다. 운전자가 주행 중에 한 말을 읽고 JSON 하나만 출력한다. 말은 음성 인식 결과라서 오타가 섞일 수 있다. 설명이나 코드블록 없이 JSON만 쓴다.

intent 종류
- place: 방금 지나친 가게나 장소를 저장해 달라는 말. 예: '방금 오른쪽 빵집 저장해 줘', '아까 왼쪽에 있던 카페 기억해 놔', '방금 지나친 곳 캡처해 줘'
- symptom: 차에서 느낀 이상 증상을 기록(캡처)해 달라는 말. 예: '글레오, 브레이크 소리 이상해. 캡처해 줘', '핸들이 떨리는데 이거 남겨 줘'
- extra: pending이 true일 때, 방금 캡처한 증상을 더 자세히 설명하는 말. 예: '오른쪽 앞바퀴 쪽에서 끼익 소리가 나'
- cancel: 방금 캡처를 취소하거나 지워 달라는 말
- none: 위에 해당하지 않는 말. 저장이나 기록을 부탁하지 않은 잡담, 음악이나 길 안내 같은 다른 요청

판단 규칙
- '글레오'는 차량 AI 비서를 부르는 말이다. '글래오', '클레오'처럼 잘못 인식돼도 같은 말로 본다.
- '캡쳐', '켑처'는 '캡처'와 같다.
- 운전자가 저장, 기록, 캡처, 기억을 부탁했을 때만 place나 symptom이다. pending이 false인데 증상만 말하고 부탁이 없으면 none이다.
- pending이 true이고 증상 설명이 이어지면 extra다.

출력 형식
{"intent":"place|symptom|extra|cancel|none","category":"","side":"","group":"","title":""}
- category: place일 때만 쓴다. 제과점, 카페, 음식점, 주유소, 꽃집, 편의점, 약국, 마트, 가게 중 하나. 빵집과 베이커리는 제과점이다. 모르면 가게.
- side: place일 때만 쓴다. 왼쪽이면 L, 오른쪽이거나 언급이 없으면 R.
- group: symptom이나 extra일 때만 쓴다. 입력의 groups에 같은 증상으로 볼 묶음이 있으면 그 key를 그대로 쓴다. 표현이 달라도 부위와 증상이 같으면 같은 묶음이다. 없으면 증상을 나타내는 짧은 낱말 하나를 새로 만든다. 예: 떨림, 경고등
- title: symptom이나 extra일 때만 쓴다. 정비사가 한눈에 알아볼 20자 이내 제목. extra면 pendingSaid와 합쳐서 만든다. 예: 오른쪽 앞바퀴 쪽 끼익 소리
- 해당하지 않는 칸은 빈 문자열로 둔다.`;

function hasAnyWord(text, words) {
  for (const word of words) {
    if (text.includes(word)) {
      return true;
    }
  }
  return false;
}

function cleanSpeech(text) {
  let result = text;
  for (const wrong of WRONG_CAPTURE_WORDS) {
    result = result.split(wrong).join('캡처');
  }
  result = result.trim();

  for (const wake of WAKE_WORDS) {
    if (result.startsWith(wake)) {
      result = result.slice(wake.length);
      break;
    }
  }
  while (result.length > 0 && ' ,.!'.includes(result[0])) {
    result = result.slice(1);
  }
  return result.trim();
}

function findCategory(text) {
  for (const category of CATEGORIES) {
    if (hasAnyWord(text, category.words)) {
      return category.name;
    }
  }
  return '';
}

function understandByRules(text) {
  const said = cleanSpeech(text);
  const result = { intent: 'none', category: '가게', side: 'R', key: null, title: '', by: 'rule' };

  if (hasAnyWord(said, CANCEL_WORDS)) {
    result.intent = 'cancel';
    return result;
  }

  const isSymptom = hasAnyWord(said, SYMPTOM_WORDS);
  const asksToSave = hasAnyWord(said, SAVE_WORDS);
  const category = findCategory(said);

  if (!isSymptom && asksToSave && (category !== '' || hasAnyWord(said, PLACE_WORDS))) {
    result.intent = 'place';
    if (category !== '') {
      result.category = category;
    }
    if (hasAnyWord(said, LEFT_WORDS)) {
      result.side = 'L';
    }
    return result;
  }
  if (isSymptom && asksToSave) {
    result.intent = 'symptom';
    return result;
  }
  if (asksToSave) {
    result.intent = 'general';
  }
  return result;
}

async function askAi(question, waitMs) {
  const stopper = new AbortController();
  const timer = setTimeout(function () {
    stopper.abort();
  }, waitMs);

  try {
    const response = await fetch(AI_SERVER + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: stopper.signal,
      body: JSON.stringify({
        model: state.aiModel,
        stream: false,
        format: 'json',
        keep_alive: '2h',
        messages: [
          { role: 'system', content: AI_GUIDE },
          { role: 'user', content: JSON.stringify(question) }
        ],
        options: { temperature: 0, num_ctx: 8192, num_predict: 128 }
      })
    });
    const data = await response.json();
    return JSON.parse(data.message.content);
  } finally {
    clearTimeout(timer);
  }
}

function shortText(value, maxLength) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, maxLength);
}

async function understand(text) {
  const byRules = understandByRules(text);
  if (!state.aiOn) {
    return byRules;
  }

  const waiting = waitingCapture();
  const groups = [];
  for (const key of symptomKeys()) {
    const examples = [];
    for (const capture of groupOf(key).slice(-3)) {
      examples.push(quoteOf(capture));
    }
    groups.push({ key: key, examples: examples });
  }

  const question = { utterance: cleanSpeech(text), pending: false, pendingSaid: '', groups: groups };
  if (waiting) {
    question.pending = true;
    question.pendingSaid = waiting.said;
  }

  try {
    const answer = await askAi(question, 10000);
    const intents = ['place', 'symptom', 'extra', 'cancel', 'none'];
    if (!intents.includes(answer.intent)) {
      return byRules;
    }
    if (answer.intent === 'none' && byRules.intent !== 'none') {
      return byRules;
    }
    const result = { intent: answer.intent, category: '가게', side: 'R', key: null, title: '', by: 'ai' };
    if (shortText(answer.category, 8) !== '') {
      result.category = shortText(answer.category, 8);
    }
    if (answer.side === 'L') {
      result.side = 'L';
    }
    if (shortText(answer.group, 12) !== '') {
      result.key = shortText(answer.group, 12);
    }
    result.title = shortText(answer.title, 24);
    return result;
  } catch (error) {
    showStatus('AI에 닿지 못해서 이번 말은 규칙으로 이해했어요.');
    return byRules;
  }
}

function understoodText(understood) {
  let text = '캡처 요청으로 보지 않음';
  if (understood.intent === 'place') {
    let side = '오른쪽';
    if (understood.side === 'L') {
      side = '왼쪽';
    }
    text = '지나친 장소, ' + side + ' ' + understood.category;
  }
  if (understood.intent === 'symptom') {
    text = '이상 증상';
    if (understood.title !== '') {
      text += ', ' + understood.title;
    }
  }
  if (understood.intent === 'extra') {
    text = '방금 캡처에 덧붙이는 설명';
  }
  if (understood.intent === 'cancel') {
    text = '방금 캡처 취소';
  }
  return 'AI가 이해한 내용: ' + text;
}

async function connectAi() {
  showStatus('AI에 연결하는 중이에요.');
  try {
    const response = await fetch(AI_SERVER + '/api/tags');
    const data = await response.json();
    state.aiModel = data.models[0].name;
    await askAi({ utterance: '안녕', pending: false, pendingSaid: '', groups: [] }, 180000);
    state.aiOn = true;
    showStatus('AI가 연결됐어요.');
  } catch (error) {
    state.aiOn = false;
    showStatus('AI 서버에 연결하지 못해서 정해 둔 규칙으로 이해해요.');
  }
}
