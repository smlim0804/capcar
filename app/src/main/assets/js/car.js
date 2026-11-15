function takeSample() {
  return {
    speed: Math.round(state.speed),
    angle: Math.round(state.angle),
    brake: state.brake,
    signal: state.signal,
    wiper: state.wiper,
    gear: state.gear,
    position: state.position
  };
}

function valueAt(list, index) {
  index = clamp(index, 0, list.length - 1);
  let left = Math.floor(index);
  if (left > list.length - 2) {
    left = list.length - 2;
  }
  const right = left + 1;
  return list[left] + (list[right] - list[left]) * (index - left);
}

function loopValue(list, seconds) {
  const left = Math.floor(seconds) % list.length;
  const right = (left + 1) % list.length;
  const part = seconds - Math.floor(seconds);
  return list[left] + (list[right] - list[left]) * part;
}

function driveByLoop(seconds) {
  state.driveSeconds += seconds;
  const second = Math.floor(state.driveSeconds) % LOOP_SPEEDS.length;
  state.speed = loopValue(LOOP_SPEEDS, state.driveSeconds);
  state.angle = loopValue(LOOP_ANGLES, state.driveSeconds);
  state.brake = LOOP_BRAKES[second] === 1;
  if (LOOP_SIGNALS[second] === 1) {
    state.signal = 'right';
  } else {
    state.signal = 'off';
  }
}

function stepCar(seconds) {
  state.clockMinutes += seconds / 60;
  if (state.gear !== 'D') {
    return;
  }
  if (!state.useRealCar) {
    driveByLoop(seconds);
  }

  state.position += state.speed / 3.6 * seconds;
  state.tripKm += state.speed / 3600 * seconds;
  state.tripMinutes += seconds / 60;

  state.secondsSinceSample += seconds;
  if (state.secondsSinceSample >= 1) {
    state.secondsSinceSample -= 1;
    state.buffer.push(takeSample());
    if (state.buffer.length > 10) {
      state.buffer.shift();
    }
  }
}

function setGear(gear) {
  if (state.gear === gear) {
    return;
  }
  state.gear = gear;
  state.extraFor = null;

  if (gear === 'D') {
    state.buffer = [];
    state.secondsSinceSample = 0;
  } else {
    state.speed = 0;
    state.angle = 0;
    state.brake = false;
    state.signal = 'off';
    stopMic();
  }

  if (gear === 'P') {
    state.view = 'cards';
  } else {
    state.view = 'drive';
  }
  showView();
}
