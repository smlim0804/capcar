const ROAD_PIXELS_PER_METER = 2.1;
const CAR_Y = 210;

const SHOPS = [];
for (let block = -4; block < 400; block++) {
  const start = block * 250;
  SHOPS.push({ name: '가게 A', side: 'R', position: 927 + start });
  SHOPS.push({ name: '가게 B', side: 'R', position: 887 + start });
  SHOPS.push({ name: '가게 C', side: 'R', position: 957 + start });
  SHOPS.push({ name: '가게 D', side: 'L', position: 905 + start });
  SHOPS.push({ name: '가게 E', side: 'L', position: 945 + start });
  SHOPS.push({ name: '', side: 'L', position: 1010 + start });
  SHOPS.push({ name: '', side: 'R', position: 1030 + start });
}

const CATEGORIES = [
  { name: '제과점', words: ['빵집', '베이커리', '제과'] },
  { name: '카페', words: ['카페', '커피'] },
  { name: '음식점', words: ['식당', '맛집', '밥집'] },
  { name: '주유소', words: ['주유소'] },
  { name: '꽃집', words: ['꽃집'] },
  { name: '편의점', words: ['편의점'] },
  { name: '약국', words: ['약국'] }
];

const SYMPTOM_KEYWORDS = ['끼익', '덜컹', '쇳소리', '떨림', '진동', '경고등', '냄새', '소리'];

const LOOP_SPEEDS = [48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 44, 38, 31, 31, 30, 28, 25, 22, 20, 19, 18, 18, 24, 32, 40, 46];
const LOOP_ANGLES = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 18, 40, 62, 78, 85, 50, 20, 5, 0];
const LOOP_BRAKES = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0];
const LOOP_SIGNALS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0];

function makeSamples(speeds, angles, brakeFrom, signalFrom, wiper) {
  const samples = [];
  for (let i = 0; i < speeds.length; i++) {
    let signal = 'off';
    if (i >= signalFrom) {
      signal = 'right';
    }
    samples.push({
      speed: speeds[i],
      angle: angles[i],
      brake: i >= brakeFrom,
      signal: signal,
      wiper: wiper,
      gear: 'D'
    });
  }
  return samples;
}

function makeSnapshot(changes) {
  const snapshot = {
    telltales: '켜진 것 없음',
    brakeFluid: '정상',
    engineOil: '정상',
    tire: '경고 없음',
    mode: '노멀',
    lowBeam: true,
    wiper: false,
    outTemp: 8,
    tripMinutes: 23,
    tripKm: 11.4
  };
  for (const name in changes) {
    snapshot[name] = changes[name];
  }
  return snapshot;
}

const HISTORY = [
  {
    id: 'h1',
    type: 'symptom',
    key: '끼익',
    date: '11/02',
    dateLong: '11월 2일',
    clock: '오전 8:14',
    place: '○○아파트 진입로',
    placeShort: '○○아파트',
    said: '브레이크 쪽에서 끼익 소리 나',
    extra: '',
    samples: makeSamples([24, 23, 22, 20, 18, 17, 16, 15, 14, 14], [0, 0, 6, 20, 44, 66, 84, 98, 106, 110], 2, 0, false),
    snapshot: makeSnapshot({ lowBeam: false, outTemp: 11, tripMinutes: 6, tripKm: 2.1 })
  },
  {
    id: 'h2',
    type: 'symptom',
    key: '끼익',
    date: '11/08',
    dateLong: '11월 8일',
    clock: '오후 6:40',
    place: '○○마트 주차장 입구',
    placeShort: '○○마트',
    said: '주차장 들어가는데 또 끼익 소리 났어',
    extra: '',
    samples: makeSamples([30, 29, 27, 25, 23, 22, 21, 20, 19, 19], [0, 0, 0, 5, 16, 34, 55, 74, 88, 95], 3, 1, true),
    snapshot: makeSnapshot({ wiper: true, outTemp: 9, tripMinutes: 31, tripKm: 14.8 })
  }
];
