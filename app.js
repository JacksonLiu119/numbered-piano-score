const tokens = (text) => {
  const result = [];
  for (const character of text.replace(/\s+/g, "")) {
    if (character === "_" || character === "^") {
      if (result.length) result[result.length - 1] += character;
    } else {
      result.push(character);
    }
  }
  return result;
};

const songs = [
  {
    id: "twinkle",
    title: "小星星",
    meta: "C 調 / 4-4 拍 / 數字譜完整主旋律",
    keyOffset: 0,
    defaultTempo: 96,
    lines: [
      ["1155", "665-"],
      ["4433", "221-"],
      ["5544", "332-"],
      ["5544", "332-"],
      ["1155", "665-"],
      ["4433", "221-"]
    ]
  },
  {
    id: "spirited",
    title: "神隱少女",
    meta: "依照你提供的兩張譜例整理 / 右手數字旋律 / 可播放示範",
    keyOffset: 0,
    defaultTempo: 78,
    lines: [
      ["123153252", "1_6317"],
      ["7_6_7_125123443212"],
      ["123153252", "1_66715"],
      ["5_6_7_125123443211"],
      ["3455555654"],
      ["33333343211"],
      ["1_7_6_7_71223232"],
      ["3455555654"],
      ["33334321^7", "6_6_712512322211"]
    ]
  }
];

const scaleSemitones = { "1": 0, "2": 2, "3": 4, "4": 5, "5": 7, "6": 9, "7": 11 };
const whiteLabels = ["5_", "6_", "7_", "1", "2", "3", "4", "5", "6", "7", "1^", "2^"];
const blackPositions = ["8.2%", "16.5%", "33.2%", "41.5%", "49.8%", "66.5%", "74.8%", "91.5%"];

const songSelect = document.querySelector("#songSelect");
const tempoControl = document.querySelector("#tempoControl");
const tempoValue = document.querySelector("#tempoValue");
const songTitle = document.querySelector("#songTitle");
const songMeta = document.querySelector("#songMeta");
const score = document.querySelector("#score");
const piano = document.querySelector("#piano");
const playBtn = document.querySelector("#playBtn");
const stopBtn = document.querySelector("#stopBtn");
const prevPageBtn = document.querySelector("#prevPageBtn");
const nextPageBtn = document.querySelector("#nextPageBtn");
const pageIndicator = document.querySelector("#pageIndicator");

let audioContext;
let activeTimers = [];
let currentSong = songs[0];
let isPlaying = false;
let currentPage = 0;

function init() {
  songs.forEach((song) => {
    const option = document.createElement("option");
    option.value = song.id;
    option.textContent = song.title;
    songSelect.appendChild(option);
  });

  whiteLabels.forEach((label, index) => {
    const key = document.createElement("button");
    key.type = "button";
    key.className = "white-key";
    key.dataset.note = label;
    key.dataset.index = index;
    key.textContent = label.replace("_", "").replace("^", "");
    if (label.endsWith("_")) key.classList.add("low-label");
    if (label.endsWith("^")) key.classList.add("high-label");
    key.addEventListener("click", () => playKeyboardNote(label, key));
    piano.appendChild(key);
  });

  blackPositions.forEach((position) => {
    const key = document.createElement("span");
    key.className = "black-key";
    key.style.left = position;
    key.setAttribute("aria-hidden", "true");
    piano.appendChild(key);
  });

  songSelect.addEventListener("change", () => {
    stopPlayback();
    currentSong = songs.find((song) => song.id === songSelect.value);
    currentPage = 0;
    tempoControl.value = currentSong.defaultTempo;
    renderSong();
  });
  tempoControl.addEventListener("input", () => { tempoValue.textContent = `${tempoControl.value} BPM`; });
  playBtn.addEventListener("click", playSong);
  stopBtn.addEventListener("click", stopPlayback);
  prevPageBtn.addEventListener("click", () => changePage(-1));
  nextPageBtn.addEventListener("click", () => changePage(1));
  tempoControl.value = currentSong.defaultTempo;
  renderSong();
}

function getLines(song) { return song.lines.flatMap((line) => line.map((text) => tokens(text))); }
function pageCount() { return Math.ceil(currentSong.lines.length / 3); }
function changePage(direction) {
  currentPage = Math.max(0, Math.min(pageCount() - 1, currentPage + direction));
  renderSong();
}

function renderSong() {
  songTitle.textContent = currentSong.title;
  songMeta.textContent = currentSong.meta;
  tempoValue.textContent = `${tempoControl.value} BPM`;
  score.innerHTML = "";
  pageIndicator.textContent = `${currentPage + 1} / ${pageCount()}`;
  prevPageBtn.disabled = currentPage === 0;
  nextPageBtn.disabled = currentPage === pageCount() - 1;

  const startLine = currentPage * 3;
  currentSong.lines.slice(startLine, startLine + 3).forEach((line, localLineIndex) => {
    const lineIndex = startLine + localLineIndex;
    const row = document.createElement("div");
    row.className = `score-line${currentSong.id === "twinkle" ? " compact" : ""}`;
    let flatIndex = currentSong.lines.slice(0, lineIndex).reduce((total, previous) => total + previous.reduce((sum, group) => sum + group.length, 0), 0);

    line.forEach((group) => {
      const groupEl = document.createElement("span");
      groupEl.className = "score-group";
      tokens(group).forEach((note) => {
        const glyph = document.createElement("span");
        glyph.className = `note-glyph${note === "0" ? " rest" : ""}${note.endsWith("_") ? " low" : ""}${note.endsWith("^") ? " high" : ""}`;
        glyph.dataset.index = flatIndex;
        glyph.textContent = note.replace("_", "").replace("^", "");
        groupEl.appendChild(glyph);
        flatIndex += 1;
      });
      row.appendChild(groupEl);
    });
    score.appendChild(row);
  });
}

function flattenNotes(song) { return getLines(song).flat(); }

function parseNote(note) {
  if (note === "0" || note === "-") return null;
  const degree = note.match(/[1-7]/)?.[0];
  if (!degree) return null;
  let octave = 4;
  if (note.includes("_")) octave -= 1;
  if (note.includes("^")) octave += 1;
  const semitone = currentSong.keyOffset + scaleSemitones[degree] + (octave - 4) * 12;
  return 261.63 * Math.pow(2, semitone / 12);
}

function pianoKeyFor(note) {
  const normalized = note.replace("_", "").replace("^", "");
  const octave = note.includes("_") ? "low" : note.includes("^") ? "high" : "mid";
  return [...piano.querySelectorAll(".white-key")].find((key) => key.dataset.note.replace("_", "").replace("^", "") === normalized && ((octave === "low" && key.dataset.note.includes("_")) || (octave === "high" && key.dataset.note.includes("^")) || (octave === "mid" && !key.dataset.note.includes("_") && !key.dataset.note.includes("^"))));
}

function playTone(frequency, startTime, duration) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.92);
  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function highlight(index, on, note) {
  const glyph = score.querySelector(`[data-index="${index}"]`);
  if (glyph) glyph.classList.toggle("active", on);
  const key = note && pianoKeyFor(note);
  if (key) key.classList.toggle("active", on);
}

async function ensureAudio() {
  audioContext = audioContext || new AudioContext();
  if (audioContext.state === "suspended") await audioContext.resume();
}

async function playKeyboardNote(note, key) {
  await ensureAudio();
  const frequency = parseNote(note);
  const now = audioContext.currentTime;
  playTone(frequency, now, 0.5);
  key.classList.add("active");
  window.setTimeout(() => key.classList.remove("active"), 430);
}

async function playSong() {
  stopPlayback();
  await ensureAudio();
  isPlaying = true;
  playBtn.textContent = "▶ 播放中";
  const beat = 60 / Number(tempoControl.value);
  const notes = flattenNotes(currentSong);
  let lastFrequency = null;
  const start = audioContext.currentTime + 0.08;

  notes.forEach((note, index) => {
    const frequency = parseNote(note);
    const time = start + index * beat;
    if (frequency) {
      lastFrequency = frequency;
      let sustainBeats = 1;
      while (notes[index + sustainBeats] === "-") sustainBeats += 1;
      playTone(frequency, time, beat * (sustainBeats - 0.08));
    }
    activeTimers.push(window.setTimeout(() => {
      const targetPage = Math.floor(findLineForIndex(index) / 3);
      if (targetPage !== currentPage) { currentPage = targetPage; renderSong(); }
      highlight(index, true, note);
    }, Math.max(0, (time - audioContext.currentTime) * 1000)));
    activeTimers.push(window.setTimeout(() => highlight(index, false, note), Math.max(0, (time - audioContext.currentTime + beat * 0.9) * 1000)));
  });
  activeTimers.push(window.setTimeout(() => { isPlaying = false; playBtn.textContent = "▶ 播放示範"; }, (notes.length * beat + 0.25) * 1000));
}

function findLineForIndex(index) {
  let count = 0;
  for (let lineIndex = 0; lineIndex < currentSong.lines.length; lineIndex += 1) {
    count += currentSong.lines[lineIndex].reduce((total, group) => total + tokens(group).length, 0);
    if (index < count) return lineIndex;
  }
  return 0;
}

function stopPlayback() {
  activeTimers.forEach((timer) => window.clearTimeout(timer));
  activeTimers = [];
  score.querySelectorAll(".active").forEach((note) => note.classList.remove("active"));
  piano.querySelectorAll(".active").forEach((key) => key.classList.remove("active"));
  if (audioContext && isPlaying) { audioContext.close(); audioContext = null; }
  isPlaying = false;
  playBtn.textContent = "▶ 播放示範";
}

init();
