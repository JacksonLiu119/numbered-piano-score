const songs = [
  {
    id: "twinkle",
    title: "小星星",
    meta: "C 調 / 4-4 拍 / 完整兒歌版本，適合初學右手練習。",
    keyOffset: 0,
    defaultTempo: 96,
    measures: [
      { notes: ["1", "1", "5", "5"], hint: "穩定四拍" },
      { notes: ["6", "6", "5", "-"], hint: "第 4 拍延音" },
      { notes: ["4", "4", "3", "3"], hint: "手型保持放鬆" },
      { notes: ["2", "2", "1", "-"], hint: "收句" },
      { notes: ["5", "5", "4", "4"], hint: "第二段開始" },
      { notes: ["3", "3", "2", "-"], hint: "旋律下行" },
      { notes: ["5", "5", "4", "4"], hint: "同型反覆" },
      { notes: ["3", "3", "2", "-"], hint: "句尾延音" },
      { notes: ["1", "1", "5", "5"], hint: "回到主題" },
      { notes: ["6", "6", "5", "-"], hint: "保持速度" },
      { notes: ["4", "4", "3", "3"], hint: "準備結尾" },
      { notes: ["2", "2", "1", "-"], hint: "結束在主音" }
    ]
  },
  {
    id: "spirited",
    title: "神隱少女風格練習曲",
    meta: "A 小調感 / 4-4 拍 / 原創練習編曲，保留空靈、流動的情緒，不是原曲完整重製譜。",
    keyOffset: -3,
    defaultTempo: 78,
    measures: [
      { notes: ["6.", "1", "2", "3"], hint: "低音起句，像呼吸一樣進入" },
      { notes: ["5", "3", "2", "1"], hint: "右手輕彈" },
      { notes: ["6.", "1", "3", "5"], hint: "三度展開" },
      { notes: ["6", "5", "3", "2"], hint: "句尾放慢一點" },
      { notes: ["1", "2", "3", "5"], hint: "主題動機" },
      { notes: ["6", "5", "3", "1"], hint: "回落" },
      { notes: ["2", "3", "5", "6"], hint: "漸強" },
      { notes: ["7", "6", "5", "-"], hint: "高點延音" },
      { notes: ["6", "7", "1˙", "7"], hint: "高八度記號 ˙" },
      { notes: ["6", "5", "3", "2"], hint: "旋律收束" },
      { notes: ["1", "2", "3", "5"], hint: "再次流動" },
      { notes: ["6", "5", "3", "-"], hint: "留白" },
      { notes: ["3", "5", "6", "1˙"], hint: "第二個高點" },
      { notes: ["7", "6", "5", "3"], hint: "下行要平均" },
      { notes: ["2", "3", "5", "2"], hint: "輕柔反覆" },
      { notes: ["1", "6.", "1", "-"], hint: "回到安靜" },
      { notes: ["0", "1", "2", "3"], hint: "休止後再進" },
      { notes: ["5", "6", "5", "3"], hint: "像水面波紋" },
      { notes: ["2", "1", "6.", "1"], hint: "低音呼應" },
      { notes: ["2", "3", "2", "-"], hint: "短暫停靠" },
      { notes: ["1", "3", "5", "6"], hint: "結尾前推進" },
      { notes: ["7", "1˙", "7", "6"], hint: "最高音輕放" },
      { notes: ["5", "3", "2", "1"], hint: "慢慢落下" },
      { notes: ["6.", "1", "6.", "-"], hint: "結束在柔和低音" }
    ]
  }
];

const scaleSemitones = {
  "1": 0,
  "2": 2,
  "3": 4,
  "4": 5,
  "5": 7,
  "6": 9,
  "7": 11
};

const songSelect = document.querySelector("#songSelect");
const tempoControl = document.querySelector("#tempoControl");
const tempoValue = document.querySelector("#tempoValue");
const songTitle = document.querySelector("#songTitle");
const songMeta = document.querySelector("#songMeta");
const score = document.querySelector("#score");
const playBtn = document.querySelector("#playBtn");
const stopBtn = document.querySelector("#stopBtn");

let audioContext;
let activeTimers = [];
let currentSong = songs[0];
let isPlaying = false;

function init() {
  songs.forEach((song) => {
    const option = document.createElement("option");
    option.value = song.id;
    option.textContent = song.title;
    songSelect.appendChild(option);
  });

  songSelect.addEventListener("change", () => {
    stopPlayback();
    currentSong = songs.find((song) => song.id === songSelect.value);
    tempoControl.value = currentSong.defaultTempo;
    renderSong();
  });

  tempoControl.addEventListener("input", () => {
    tempoValue.textContent = `${tempoControl.value} BPM`;
  });

  playBtn.addEventListener("click", playSong);
  stopBtn.addEventListener("click", stopPlayback);
  tempoControl.value = currentSong.defaultTempo;
  renderSong();
}

function renderSong() {
  songTitle.textContent = currentSong.title;
  songMeta.textContent = currentSong.meta;
  tempoValue.textContent = `${tempoControl.value} BPM`;
  score.innerHTML = "";

  currentSong.measures.forEach((measure, measureIndex) => {
    const row = document.createElement("article");
    row.className = "measure";

    const bar = document.createElement("div");
    bar.className = "bar";
    bar.textContent = String(measureIndex + 1).padStart(2, "0");

    const notes = document.createElement("div");
    notes.className = "notes";

    measure.notes.forEach((note, noteIndex) => {
      const pill = document.createElement("span");
      pill.className = `note${note === "0" ? " rest" : ""}`;
      pill.dataset.index = getFlatIndex(measureIndex, noteIndex);
      pill.textContent = note;
      notes.appendChild(pill);
    });

    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = measure.hint;

    row.append(bar, notes, hint);
    score.appendChild(row);
  });
}

function getFlatIndex(measureIndex, noteIndex) {
  return currentSong.measures
    .slice(0, measureIndex)
    .reduce((total, measure) => total + measure.notes.length, noteIndex);
}

function flattenNotes(song) {
  return song.measures.flatMap((measure) => measure.notes);
}

function parseNote(note) {
  if (note === "0" || note === "-") return null;

  const degree = note.match(/[1-7]/)?.[0];
  if (!degree) return null;

  let octave = 4;
  if (note.includes(".")) octave -= 1;
  if (note.includes("˙")) octave += 1;

  const semitone = currentSong.keyOffset + scaleSemitones[degree] + (octave - 4) * 12;
  return 261.63 * Math.pow(2, semitone / 12);
}

function playTone(frequency, startTime, duration) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1600, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.22, startTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.92);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function highlight(index, on) {
  const note = score.querySelector(`[data-index="${index}"]`);
  if (note) note.classList.toggle("active", on);
}

async function playSong() {
  stopPlayback();
  audioContext = audioContext || new AudioContext();
  if (audioContext.state === "suspended") await audioContext.resume();

  isPlaying = true;
  playBtn.textContent = "播放中";
  const beat = 60 / Number(tempoControl.value);
  const notes = flattenNotes(currentSong);
  let lastFrequency = null;
  const start = audioContext.currentTime + 0.08;

  notes.forEach((note, index) => {
    const frequency = parseNote(note) || (note === "-" ? lastFrequency : null);
    const time = start + index * beat;

    if (frequency && note !== "-") {
      lastFrequency = frequency;
      playTone(frequency, time, beat * 0.92);
    }

    activeTimers.push(window.setTimeout(() => highlight(index, true), (time - audioContext.currentTime) * 1000));
    activeTimers.push(window.setTimeout(() => highlight(index, false), (time - audioContext.currentTime + beat * 0.9) * 1000));
  });

  activeTimers.push(window.setTimeout(() => {
    isPlaying = false;
    playBtn.textContent = "播放示範";
  }, (notes.length * beat + 0.25) * 1000));
}

function stopPlayback() {
  activeTimers.forEach((timer) => window.clearTimeout(timer));
  activeTimers = [];
  score.querySelectorAll(".active").forEach((note) => note.classList.remove("active"));
  if (audioContext && isPlaying) {
    audioContext.close();
    audioContext = null;
  }
  isPlaying = false;
  playBtn.textContent = "播放示範";
}

init();
