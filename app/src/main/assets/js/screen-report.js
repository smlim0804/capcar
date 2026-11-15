const QR_SIZE = 25;

function isQrCornerDot(row, column) {
  if (row < 0 || row > 6 || column < 0 || column > 6) {
    return false;
  }
  if (row === 0 || row === 6 || column === 0 || column === 6) {
    return true;
  }
  return row >= 2 && row <= 4 && column >= 2 && column <= 4;
}

function isQrDot(row, column) {
  const corners = [[0, 0], [0, QR_SIZE - 7], [QR_SIZE - 7, 0]];
  for (const corner of corners) {
    const cornerRow = row - corner[0];
    const cornerColumn = column - corner[1];
    if (cornerRow >= -1 && cornerRow <= 7 && cornerColumn >= -1 && cornerColumn <= 7) {
      return isQrCornerDot(cornerRow, cornerColumn);
    }
  }
  return (row * row * 3 + column * column * 7 + row * column * 5 + row + column) % 7 < 3;
}

function qrCodeHtml() {
  let dots = '';
  for (let row = 0; row < QR_SIZE; row++) {
    for (let column = 0; column < QR_SIZE; column++) {
      if (isQrDot(row, column)) {
        dots += '<rect x="' + column + '" y="' + row + '" width="1.03" height="1.03"/>';
      }
    }
  }
  return '<svg viewBox="0 0 ' + QR_SIZE + ' ' + QR_SIZE + '" width="100%" height="100%" aria-hidden="true"><g fill="var(--ink)">' + dots + '</g></svg>';
}

function commonConditions(group) {
  let maxSpeed = 0;
  let allRight = true;
  let allLeft = true;
  let allBrake = true;
  let allGearD = true;
  let wiperOn = 0;

  for (const capture of group) {
    const last = lastSample(capture);
    if (last.speed > maxSpeed) {
      maxSpeed = last.speed;
    }
    if (last.angle < 30) {
      allRight = false;
    }
    if (last.angle > -30) {
      allLeft = false;
    }
    if (!last.brake) {
      allBrake = false;
    }
    if (last.gear !== 'D') {
      allGearD = false;
    }
    if (last.wiper) {
      wiperOn += 1;
    }
  }

  const chips = [];
  if (maxSpeed <= 20) {
    chips.push(['gauge', '시속 20km 이하']);
  } else if (maxSpeed <= 40) {
    chips.push(['gauge', '시속 40km 이하']);
  }
  if (allRight) {
    chips.push(['corner-up-right', '우회전 중']);
  } else if (allLeft) {
    chips.push(['corner-up-left', '좌회전 중']);
  }
  if (allBrake) {
    chips.push(['circle-dot', '브레이크 밟음']);
  }
  if (allGearD) {
    chips.push(['cog', '기어 D']);
  }

  let different = '없음';
  if (wiperOn > 0 && wiperOn < group.length) {
    different = '와이퍼 (켜짐 ' + wiperOn + '회, 꺼짐 ' + (group.length - wiperOn) + '회)';
  }
  return { chips: chips, different: different };
}

function reportViewHtml() {
  const group = groupOf(state.reportKey);
  const first = group[0];
  const latest = group[group.length - 1];
  const recent = group.slice(-4);
  const common = commonConditions(group);

  let subtitle = '1회 캡처, ' + latest.dateLong;
  if (group.length > 1) {
    subtitle = group.length + '회 캡처, ' + first.dateLong + '부터 ' + latest.dateLong + '까지';
  }

  let chips = '<span class="slab">공통 조건을 찾지 못했어요</span>';
  if (common.chips.length > 0) {
    chips = '';
    for (let i = 0; i < common.chips.length; i++) {
      const chip = common.chips[i];
      chips += '<span class="rchip inp" style="animation-delay:' + (0.35 + i * 0.1) + 's">' + icon(chip[0]) + chip[1] + '</span>';
    }
  }

  let rows = '';
  let quotes = '';
  for (let i = 0; i < recent.length; i++) {
    const capture = recent[i];
    const last = lastSample(capture);
    let brake = '안 밟음';
    if (last.brake) {
      brake = '밟음';
    }
    rows += `<tr class="inf" style="animation-delay:${0.5 + i * 0.12}s">
      <td>${capture.date} ${capture.clock}</td>
      <td>${last.speed}km/h</td>
      <td>${brake}</td>
      <td>${angleText(last.angle)}</td>
      <td class="dim">${onOffText(last.wiper)}</td>
      <td class="dim">${escapeHtml(capture.place)}</td>
      <td class="act"><button type="button" class="mini" data-act="detail" data-id="${capture.id}" data-back="report">세부 보기${icon('chevron-right')}</button></td>
    </tr>`;
    quotes += `<div class="q inf" style="animation-delay:${0.8 + i * 0.12}s"><span>${capture.date}</span><p>“${escapeHtml(quoteOf(capture))}”</p></div>`;
  }

  return `<div class="v-report">
    <div class="ahead">
      <div class="hl">
        <button type="button" class="backb inf" data-act="cards" aria-label="오늘 남긴 캡처로">${icon('chevron-left', '30px')}</button>
        <div><h1 class="in">${escapeHtml(symptomTitle(latest))}</h1><div class="sub in" style="animation-delay:.08s">${subtitle}</div></div>
      </div>
      <div class="aname inf"><i></i>캡차</div>
    </div>
    <div class="cols">
      <div class="left">
        <div class="card in" style="animation-delay:.15s">
          <div class="slab">${icon('repeat')}${group.length}회 모두 같았던 조건</div>
          <div class="rchips">${chips}</div>
          <div class="diff"><span>달랐던 조건</span>${common.different}</div>
        </div>
        <div class="card in" style="padding-bottom:22px;animation-delay:.3s">
          <div class="slab">${icon('list')}캡처한 순간</div>
          <table>
            <tr><th>날짜와 시각</th><th>속도</th><th>브레이크</th><th>핸들</th><th>와이퍼</th><th>위치</th><th></th></tr>
            ${rows}
          </table>
        </div>
        <div class="card in grow" style="padding-bottom:22px;animation-delay:.45s">
          <div class="slab" style="margin-bottom:8px">${icon('mic')}운전자가 말한 그대로</div>
          ${quotes}
        </div>
      </div>
      <div class="right">
        <div class="qrbox in" style="animation-delay:.3s">
          <div class="one" style="display:flex;align-items:center;gap:10px;font-size:28px;font-weight:700;letter-spacing:-0.02em">${icon('smartphone')}폰으로 보내기</div>
          <div class="qr">${qrCodeHtml()}</div>
          <div class="one" style="font-size:21px;font-weight:500;color:var(--ink2);margin-bottom:28px">QR 코드를 찍으면 리포트가 폰에 열려요</div>
          <button type="button" class="btn primary" data-act="shop">${icon('wrench')}정비소에 보여 주기</button>
          <div class="qnote">${icon('info')}이 리포트는 고장을 진단하지 않아요</div>
        </div>
      </div>
    </div>
  </div>`;
}
