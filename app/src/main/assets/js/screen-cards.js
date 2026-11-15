const TITLE_FIND_WORDS = ['소리', '진동', '떨', '경고', '냄새'];
const TITLE_END_WORDS = ['소리', '진동', '떨림', '경고등', '냄새'];

function splitSentences(text) {
  const sentences = [];
  let current = '';
  for (const letter of text) {
    if (letter === '.' || letter === '!' || letter === '?') {
      sentences.push(current);
      current = '';
    } else {
      current += letter;
    }
  }
  sentences.push(current);
  return sentences;
}

function symptomTitle(capture) {
  if (capture.title) {
    return capture.title;
  }
  const quote = quoteOf(capture);

  let sentence = quote;
  for (const part of splitSentences(quote)) {
    if (hasAnyWord(part, TITLE_FIND_WORDS)) {
      sentence = part;
      break;
    }
  }

  let start = -1;
  let end = -1;
  for (const word of TITLE_END_WORDS) {
    const index = sentence.indexOf(word);
    if (index >= 0 && (start < 0 || index < start)) {
      start = index;
      end = index + word.length;
    }
  }
  if (end >= 0) {
    sentence = sentence.slice(0, end);
  }

  sentence = sentence.trim().split('에서 ').join(' ');
  const words = [];
  for (const word of sentence.split(' ')) {
    if (word !== '') {
      words.push(word);
    }
  }
  return words.join(' ').slice(0, 24);
}

function placeCardHtml(capture, delay) {
  const last = lastSample(capture);
  const chosen = state.chosen[capture.id];

  let rows = '<div class="empty">지나온 길 200m 안에서 후보를 찾지 못했어요.</div>';
  if (capture.candidates.length > 0) {
    rows = '';
    for (let i = 0; i < capture.candidates.length; i++) {
      const place = capture.candidates[i];
      let chosenClass = '';
      if (chosen === i) {
        chosenClass = ' sel';
      }
      let placeIcon = 'store';
      if (place.category === '제과점') {
        placeIcon = 'croissant';
      }
      rows += `<button type="button" class="cand${chosenClass}" data-act="cand" data-id="${capture.id}" data-i="${i}">
        <span class="n">${i + 1}</span>
        <i class="th">${icon(placeIcon, '26px')}</i>
        <b>${escapeHtml(place.name)}</b>
        <span class="d">${escapeHtml(place.category)}</span>
        <span class="d">진행 방향 ${place.sideText}</span>
        <span class="d">${place.where}</span>
      </button>`;
    }
  }

  return `<div class="card in" style="animation-delay:${delay}s">
    <div class="row">
      <span class="tag t-shop">${icon('map-pin')}지나친 장소</span>
      <span class="time">${icon('clock')}${capture.clock}</span>
      <span class="time">${icon('gauge')}시속 ${last.speed}km</span>
    </div>
    <div class="said" style="margin-bottom:14px">“${escapeHtml(quoteOf(capture))}”</div>
    ${rows}
    <div class="row" style="margin-top:24px;gap:12px">
      <button type="button" class="btn primary" data-act="go" data-id="${capture.id}">${icon('navigation')}지금 가기</button>
      <button type="button" class="btn" data-act="later" data-id="${capture.id}">${icon('bookmark')}나중에</button>
      <button type="button" class="btn" data-act="nomatch" data-id="${capture.id}">${icon('x')}맞는 곳이 없어요</button>
    </div>
  </div>`;
}

function symptomCardHtml(capture, delay) {
  const last = lastSample(capture);

  let tagClass = 't-gen';
  let tagIcon = 'camera';
  let tagText = '일반 캡처';
  let again = '';
  let button = `<button type="button" class="btn" data-act="detail" data-id="${capture.id}" data-back="cards">${icon('activity')}세부 보기</button>`;

  if (capture.type === 'symptom') {
    tagClass = 't-sym';
    tagIcon = 'wrench';
    tagText = '이상 증상';
    const count = groupOf(capture.key).length;
    if (count > 1) {
      again = `<span class="again">${icon('repeat')}같은 증상 ${count}회째</span>`;
    }
    button = `<button type="button" class="btn primary" data-act="report" data-key="${escapeHtml(capture.key)}">${icon('clipboard-list')}정비 리포트 보기</button>`;
  }

  let brake = '브레이크 안 밟음';
  if (last.brake) {
    brake = '브레이크 밟음';
  }

  return `<div class="card in" style="animation-delay:${delay}s">
    <div class="row">
      <span class="tag ${tagClass}">${icon(tagIcon)}${tagText}</span>
      <span class="time">${icon('clock')}${capture.clock}</span>
      <span class="time">${icon('map-pin')}${capture.placeShort}</span>
      <span class="sp"></span>
      ${again}
    </div>
    <div class="said">“${escapeHtml(quoteOf(capture))}”</div>
    <div class="row">
      <span class="spill">${icon('gauge')}시속 ${last.speed}km</span>
      <span class="spill">${icon(turnIcon(last.angle))}${turnText(last.angle)}</span>
      <span class="spill">${icon('circle-dot')}${brake}</span>
      <span class="sp"></span>
      ${button}
    </div>
  </div>`;
}

function cardHtml(capture, index) {
  const delay = 0.15 + index * 0.15;
  if (capture.type === 'place') {
    return placeCardHtml(capture, delay);
  }
  return symptomCardHtml(capture, delay);
}

function cardsSummary() {
  let symptoms = 0;
  let places = 0;
  let others = 0;
  for (const capture of state.captures) {
    if (capture.type === 'symptom') {
      symptoms += 1;
    } else if (capture.type === 'place') {
      places += 1;
    } else {
      others += 1;
    }
  }

  const parts = [];
  if (symptoms > 0) {
    parts.push('이상 증상 ' + symptoms + '개');
  }
  if (places > 0) {
    parts.push('지나친 장소 ' + places + '개');
  }
  if (others > 0) {
    parts.push('일반 캡처 ' + others + '개');
  }
  if (parts.length === 0) {
    return '아직 남긴 캡처가 없어요';
  }
  return parts.join(', ');
}

function cardsHtml() {
  let cards = `<div class="card in grow"><div class="empty">주행 중에 "캡처해 줘"라고 말하면 여기에 카드로 정리돼요.<br>기어를 D로 바꾸고 마이크 버튼을 눌러 말해 보세요.</div></div>`;
  if (state.captures.length > 0) {
    cards = '';
    let index = 0;
    for (let i = state.captures.length - 1; i >= 0; i--) {
      cards += cardHtml(state.captures[i], index);
      index += 1;
    }
  }

  return `<div class="ahead">
      <div><h1 class="in">오늘 남긴 캡처</h1><div class="sub in" style="animation-delay:.08s">${cardsSummary()}</div></div>
      <div class="aname inf"><i></i>캡차</div>
    </div>
    <div class="left">${cards}</div>`;
}
