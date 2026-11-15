const CHART_WIDTH = 680;
const CHART_SIDE = 16;
const CHART_HEIGHT = 188;
const CHART_TOP = 18;
const CHART_BOTTOM = 14;
const CHART_STEP = (CHART_WIDTH - 2 * CHART_SIDE) / 9;

function chartX(second) {
  return CHART_SIDE + second * CHART_STEP;
}

function chartY(value, max) {
  return CHART_TOP + (1 - value / max) * (CHART_HEIGHT - CHART_TOP - CHART_BOTTOM);
}

function speedsOf(samples) {
  const speeds = [];
  for (const sample of samples) {
    speeds.push(sample.speed);
  }
  return speeds;
}

function anglesOf(samples) {
  const angles = [];
  for (const sample of samples) {
    angles.push(sample.angle);
  }
  return angles;
}

function angleSizesOf(samples) {
  const sizes = [];
  for (const sample of samples) {
    sizes.push(Math.abs(sample.angle));
  }
  return sizes;
}

function biggest(list) {
  let result = list[0];
  for (const value of list) {
    if (value > result) {
      result = value;
    }
  }
  return result;
}

function speedChartMax(speeds) {
  const top = biggest(speeds);
  if (top <= 40) {
    return 40;
  }
  if (top <= 80) {
    return 80;
  }
  return 120;
}

function angleChartMax(sizes) {
  const top = biggest(sizes);
  if (top <= 90) {
    return 90;
  }
  if (top <= 180) {
    return 180;
  }
  return 360;
}

function lineRowHtml(key, name, unit, values, max, mark, startLabel) {
  let points = '';
  for (let i = 0; i < values.length; i++) {
    points += chartX(i).toFixed(1) + ',' + chartY(values[i], max).toFixed(1) + ' ';
  }
  const bottom = chartY(0, max).toFixed(1);
  const area = 'M' + chartX(0).toFixed(1) + ',' + bottom + ' L' + points.trim().split(' ').join(' L') +
    ' L' + chartX(9).toFixed(1) + ',' + bottom + ' Z';

  let labels = '';
  let lines = '';
  for (const tick of [max, max / 2, 0]) {
    const y = chartY(tick, max);
    labels += '<span class="tk" style="top:' + (y - 13).toFixed(0) + 'px">' + tick + mark + '</span>';
    lines += '<path d="M0 ' + y.toFixed(1) + ' H' + CHART_WIDTH + '" stroke="#E6EAEE" stroke-width="1"/>';
  }

  let startText = '';
  if (startLabel !== '') {
    const x = (chartX(0) - 6).toFixed(1);
    const y = (chartY(values[0], max) - 14).toFixed(1);
    startText = '<text x="' + x + '" y="' + y + '" font-weight="600" fill="var(--ink2)">' + startLabel + '</text>';
  }

  return `<div class="crow">
    <div class="cl"><b>${name}</b><em>${unit}</em>${labels}</div>
    <svg class="plot" width="${CHART_WIDTH}" height="${CHART_HEIGHT}" viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" aria-hidden="true">
      ${lines}
      <clipPath id="clip_${key}"><rect id="cr_${key}" x="0" y="0" width="${CHART_WIDTH}" height="${CHART_HEIGHT}"/></clipPath>
      <g clip-path="url(#clip_${key})">
        <path d="${area}" fill="var(--acc)" fill-opacity="0.10"/>
        <polyline points="${points.trim()}" fill="none" stroke="var(--acc)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      ${startText}
      <circle id="mk_${key}" r="7.5" fill="var(--acc)" stroke="#fff" stroke-width="2.5"/>
    </svg>
    <div class="cv" id="v_${key}"></div>
  </div>`;
}

function onRanges(flags) {
  const ranges = [];
  let start = -1;
  for (let i = 0; i < flags.length; i++) {
    if (flags[i] && start < 0) {
      start = i;
    }
    if (!flags[i] && start >= 0) {
      ranges.push([start, i - 1]);
      start = -1;
    }
  }
  if (start >= 0) {
    ranges.push([start, 9]);
  }
  return ranges;
}

function sinceText(second) {
  if (second === 0) {
    return '10초 내내';
  }
  return (9 - second) + '초 전부터';
}

function onOffRowHtml(key, name, flags, labelEnd) {
  const left = chartX(0) - 8;
  const right = chartX(9) + 8;
  const ranges = onRanges(flags);

  let bars = '';
  for (const range of ranges) {
    let end = chartX(range[1]);
    if (range[1] >= 9) {
      end = right;
    }
    const width = (end - chartX(range[0])).toFixed(1);
    bars += '<rect x="' + chartX(range[0]).toFixed(1) + '" y="28" width="' + width + '" height="20" rx="6" fill="var(--acc)"/>';
  }

  let label = '';
  if (ranges.length > 0) {
    const first = ranges[0][0];
    label = '<text x="' + chartX(first).toFixed(1) + '" y="19" font-weight="600" fill="var(--ink2)">' + sinceText(first) + ' ' + labelEnd + '</text>';
  }

  return `<div class="crow">
    <div class="cl"><b style="top:22px">${name}</b></div>
    <svg class="plot" width="${CHART_WIDTH}" height="56" viewBox="0 0 ${CHART_WIDTH} 56" aria-hidden="true">
      <rect x="${left}" y="28" width="${right - left}" height="20" rx="6" fill="#EBEEF2"/>
      <clipPath id="clip_${key}"><rect id="cr_${key}" x="0" y="0" width="${CHART_WIDTH}" height="56"/></clipPath>
      <g clip-path="url(#clip_${key})">${bars}${label}</g>
    </svg>
    <div class="cv" id="v_${key}"></div>
  </div>`;
}

function timeAxisHtml() {
  const labels = [[0, '9초 전'], [3, '6초 전'], [6, '3초 전']];
  let texts = '';
  for (const label of labels) {
    let x = chartX(label[0]);
    let anchor = 'middle';
    if (label[0] === 0) {
      x = x - 8;
      anchor = 'start';
    }
    texts += '<text id="ax' + label[0] + '" x="' + x.toFixed(1) + '" y="25" text-anchor="' + anchor + '" font-weight="500" fill="var(--ink3)">' + label[1] + '</text>';
  }
  return `<div class="crow">
    <div class="cl"></div>
    <svg class="plot" width="${CHART_WIDTH}" height="36" viewBox="0 0 ${CHART_WIDTH} 36" aria-hidden="true">${texts}</svg>
    <div class="cv"></div>
  </div>`;
}

function firstIndex(samples, check) {
  for (let i = 0; i < samples.length; i++) {
    if (check(samples[i])) {
      return i;
    }
  }
  return -1;
}

function summarize(samples) {
  const startSpeed = samples[0].speed;
  const endSpeed = samples[9].speed;
  const brakeAt = firstIndex(samples, function (sample) {
    return sample.brake;
  });
  const turnAt = firstIndex(samples, function (sample) {
    return Math.abs(sample.angle) >= 4;
  });

  let speed = '속도는 ' + endSpeed + 'km/h로 그대로였어요';
  if (endSpeed < startSpeed) {
    speed = '속도는 ' + startSpeed + '에서 ' + endSpeed + 'km/h로 줄었어요';
  }
  if (endSpeed > startSpeed) {
    speed = '속도는 ' + startSpeed + '에서 ' + endSpeed + 'km/h로 늘었어요';
  }

  if (brakeAt >= 0 && turnAt >= 0) {
    if (turnAt > brakeAt) {
      return '브레이크를 밟고 ' + (turnAt - brakeAt) + '초 뒤 핸들이 돌아가기 시작했고, ' + speed;
    }
    if (turnAt < brakeAt) {
      return '핸들이 돌아가고 ' + (brakeAt - turnAt) + '초 뒤 브레이크를 밟았고, ' + speed;
    }
    return '브레이크를 밟으면서 핸들이 돌아가기 시작했고, ' + speed;
  }
  if (brakeAt === 0) {
    return '10초 내내 브레이크를 밟고 있었고, ' + speed;
  }
  if (brakeAt > 0) {
    return (9 - brakeAt) + '초 전부터 브레이크를 밟았고, ' + speed;
  }
  if (turnAt >= 0) {
    return '브레이크 없이 핸들만 돌아갔고, ' + speed;
  }
  return '브레이크와 핸들 변화 없이 ' + speed;
}

function stateRowHtml(iconName, name, value) {
  return '<div class="kr"><span>' + icon(iconName) + name + '</span><b>' + value + '</b></div>';
}

function detailViewHtml() {
  const capture = findCapture(state.detailId);
  const samples = capture.samples;
  const speeds = speedsOf(samples);
  const sizes = angleSizesOf(samples);
  const snapshot = capture.snapshot;

  let turnedLeft = false;
  let turnedRight = false;
  const brakeFlags = [];
  const signalFlags = [];
  for (const sample of samples) {
    if (sample.angle < -3) {
      turnedLeft = true;
    }
    if (sample.angle > 3) {
      turnedRight = true;
    }
    brakeFlags.push(sample.brake);
    signalFlags.push(sample.signal !== 'off');
  }
  let direction = '오른쪽';
  if (turnedLeft && !turnedRight) {
    direction = '왼쪽';
  }
  let signalSide = '오른쪽';
  if (samples[9].signal === 'left') {
    signalSide = '왼쪽';
  }

  return `<div class="v-detail">
    <div class="ahead">
      <div class="hl">
        <button type="button" class="backb inf" data-act="back" aria-label="뒤로">${icon('chevron-left', '30px')}</button>
        <div><h1 class="in">${capture.dateLong} ${capture.clock} 캡처</h1><div class="sub in" style="animation-delay:.08s">${escapeHtml(capture.place)}에서 말하기 전 10초를 1초 간격으로 기록</div></div>
      </div>
      <div class="aname inf"><i></i>캡차</div>
    </div>
    <div class="cols">
      <div class="left">
        <div class="card in grow" style="animation-delay:.15s">
          <div class="row">
            <div class="slab">${icon('activity')}말하기 전 10초</div>
            <span class="sp"></span>
            <div class="slab" style="width:150px;padding-left:22px">선택한 시점</div>
          </div>
          <div class="chart" id="chart">
            ${lineRowHtml('spd', '속도', 'km/h', speeds, speedChartMax(speeds), '', String(speeds[0]))}
            ${lineRowHtml('ang', '핸들', direction + ' 각도', sizes, angleChartMax(sizes), '°', '')}
            ${onOffRowHtml('brk', '브레이크', brakeFlags, '밟음')}
            ${onOffRowHtml('sig', '방향지시등', signalFlags, signalSide)}
            ${timeAxisHtml()}
            <i id="xh"></i><span id="xt"></span>
          </div>
          <div class="sum inf" style="animation-delay:.6s">${icon('list-checks')}${summarize(samples)}</div>
        </div>
      </div>
      <div class="right">
        <div class="card snap in" style="animation-delay:.3s">
          <div class="slab">${icon('clipboard-list')}캡처 순간의 차량 상태</div>
          <div class="grp">경고와 점검</div>
          ${stateRowHtml('triangle-alert', '경고등', snapshot.telltales)}
          ${stateRowHtml('droplet', '브레이크액', snapshot.brakeFluid)}
          ${stateRowHtml('droplets', '엔진 오일', snapshot.engineOil)}
          ${stateRowHtml('circle-gauge', '타이어 공기압', snapshot.tire)}
          <div class="grp">주행 환경</div>
          ${stateRowHtml('cog', '주행 모드', snapshot.mode)}
          ${stateRowHtml('lightbulb', '전조등', onOffText(snapshot.lowBeam))}
          ${stateRowHtml('cloud-rain', '와이퍼', onOffText(snapshot.wiper))}
          ${stateRowHtml('thermometer', '외부 온도', snapshot.outTemp + '°C')}
          ${stateRowHtml('timer', '이번 주행', snapshot.tripMinutes + '분, ' + snapshot.tripKm + 'km')}
          <div class="qnote">${icon('info')}차량이 지원하는 항목만 표시돼요</div>
        </div>
      </div>
    </div>
  </div>`;
}

function drawDetail() {
  const capture = findCapture(state.detailId);
  if (!capture || !find('#xh')) {
    return;
  }
  const samples = capture.samples;
  const time = clamp(state.detailTime, 0, 9);
  const x = chartX(time);
  const speeds = speedsOf(samples);
  const sizes = angleSizesOf(samples);

  let shownWidth = x;
  if (time >= 8.999) {
    shownWidth = CHART_WIDTH;
  }
  for (const key of ['spd', 'ang', 'brk', 'sig']) {
    find('#cr_' + key).setAttribute('width', shownWidth);
  }
  find('#mk_spd').setAttribute('cx', x);
  find('#mk_spd').setAttribute('cy', chartY(valueAt(speeds, time), speedChartMax(speeds)));
  find('#mk_ang').setAttribute('cx', x);
  find('#mk_ang').setAttribute('cy', chartY(valueAt(sizes, time), angleChartMax(sizes)));

  find('#v_spd').textContent = Math.round(valueAt(speeds, time)) + 'km/h';
  find('#v_ang').textContent = angleText(valueAt(anglesOf(samples), time));

  if (samples[Math.floor(time + 0.000001)].brake) {
    find('#v_brk').textContent = '밟음';
  } else {
    find('#v_brk').textContent = '밟지 않음';
  }

  const signal = samples[Math.round(time)].signal;
  let signalText = '꺼짐';
  if (signal === 'right') {
    signalText = '오른쪽 켜짐';
  }
  if (signal === 'left') {
    signalText = '왼쪽 켜짐';
  }
  find('#v_sig').textContent = signalText;

  find('#xh').style.left = (150 + x) + 'px';
  find('#xt').style.left = (150 + x) + 'px';
  const secondsBefore = Math.round(9 - time);
  if (secondsBefore <= 0) {
    find('#xt').textContent = '캡처 순간';
  } else {
    find('#xt').textContent = secondsBefore + '초 전';
  }

  for (const second of [0, 3, 6]) {
    find('#ax' + second).style.opacity = clamp((Math.abs(time - second) - 0.75) / 0.5, 0, 1);
  }
}
