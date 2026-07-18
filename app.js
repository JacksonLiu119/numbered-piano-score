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

const high = (text) => text.replace(/[1-7]/g, "$&^");

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
    meta: "依照你提供的譜例整理 / 右手數字旋律 / 可播放示範",
    keyOffset: 0,
    defaultTempo: 78,
    lines: [
      ["123153252", "16_317_"],
      ["7_6_7_125_123443212"],
      ["123153252", "16_6_7_15_"],
      ["5_6_7_125_123443211"],
      ["3455555654"],
      ["33333343211"],
      ["17_6_7_7_1223232"],
      ["3455555654"],
      ["333343217_", "6_6_7_125_123222111"]
    ]
  },
  {
    id: "jumper",
    title: "跳樓機",
    meta: "依照你提供的三張譜例整理 / 可播放示範 / 鍵盤含高音 1",
    keyOffset: 0,
    defaultTempo: 92,
    lines: [
      ["1111122", "2112"],
      ["2221421", "111455"],
      ["665542424645"],
      ["665545665454"],
      ["22212142", "22212455"],
      ["554565551", "55476655456"],
      ["444444145", "444444565"],
      ["5555456", "66554444424"],
      ["4465445", "4664454"]
    ],
    lyrics: [
      "是不是內心希望 頭破血流",
      "就會讓妳想起 最愛我的時光",
      "Baby 我們的感情好像跳樓機",
      "讓我突然地升空又急速落地",
      "你帶給我一場瘋狂 劫後餘生好難呼吸",
      "那天的天氣難得放晴 你說的話卻把我困在雨季",
      "其實你不是不愛了吧 只是有些摩擦沒處理",
      "怎麼你閉口不語 是不是我正好說中你的心",
      "就承認還是在意吧 哪怕騙騙我也可以"
    ]
  },
  {
    id: "beauty",
    title: "Beauty and A Beat",
    meta: "依照你提供的譜例整理 / 上點高音 / 第一段展開 3 次",
    keyOffset: 0,
    defaultTempo: 104,
    keyboardRange: "full",
    lines: [
      [high("33332"), high("2122211")],
      [high("33332"), high("2122211")],
      [high("33332"), high("2122211")],
      [high("33332"), high("33332")],
      [high("115"), high("4343")],
      [high("1154"), high("3221")],
      [high("1154"), high("3221")],
      [high("23"), high("43")]
    ]
  }
];

const scaleSemitones = { "1": 0, "2": 2, "3": 4, "4": 5, "5": 7, "6": 9, "7": 11 };
const linesPerPage = 2;
const keyboardRanges = {
  standard: ["1_", "2_", "3_", "4_", "5_", "6_", "7_", "1", "2", "3", "4", "5", "6", "7", "1^"],
  full: ["1_", "2_", "3_", "4_", "5_", "6_", "7_", "1", "2", "3", "4", "5", "6", "7", "1^", "2^", "3^", "4^", "5^", "6^", "7^"]
};
const hasBlackAfter = new Set(["1", "2", "4", "5", "6"]);

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

function degreeOf(label) { return label.replace("_", "").replace("^", ""); }
function keyboardLabelsForSong(song) { return keyboardRanges[song.keyboardRange || "standard"]; }
function blackKeyPositionsFor(labels) {
  return labels
    .map((label, index) => hasBlackAfter.has(degreeOf(label)) && index < labels.length - 1 ? ((index + 1) / labels.length) * 100 : null)
    .filter((position) => position !== null);
}
function octaveDividerPositionsFor(labels) {
  return labels
    .map((label, index) => degreeOf(label) === "7" && index < labels.length - 1 ? ((index + 1) / labels.length) * 100 : null)
    .filter((position) => position !== null);
}
function renderPiano() {
  const whiteLabels = keyboardLabelsForSong(currentSong);
  piano.innerHTML = "";
  piano.style.setProperty("--white-count", whiteLabels.length);

  whiteLabels.forEach((label, index) => {
    const key = document.createElement("button");
    key.type = "button";
    key.className = "white-key";
    key.dataset.note = label;
    key.dataset.index = index;
    key.setAttribute("aria-label", `彈奏 ${label.replace("_", "低音").replace("^", "高音")}`);
    const labelText = document.createElement("span");
    labelText.className = "key-label";
    labelText.textContent = label.replace("_", "").replace("^", "");
    key.appendChild(labelText);
    if (label.endsWith("_")) key.classList.add("low-label");
    if (label.endsWith("^")) key.classList.add("high-label");
    key.addEventListener("click", () => playKeyboardNote(label, key));
    piano.appendChild(key);
  });

  octaveDividerPositionsFor(whiteLabels).forEach((position) => {
    const divider = document.createElement("span");
    divider.className = "octave-divider";
    divider.style.left = `${position}%`;
    divider.setAttribute("aria-hidden", "true");
    piano.appendChild(divider);
  });

  blackKeyPositionsFor(whiteLabels).forEach((position) => {
    const key = document.createElement("span");
    key.className = "black-key";
    key.style.left = `${position}%`;
    key.setAttribute("aria-hidden", "true");
    piano.appendChild(key);
  });
}

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
    currentPage = 0;
    tempoControl.value = currentSong.defaultTempo;
    renderPiano();
    renderSong();
  });
  tempoControl.addEventListener("input", () => { tempoValue.textContent = `${tempoControl.value} BPM`; });
  playBtn.addEventListener("click", playSong);
  stopBtn.addEventListener("click", stopPlayback);
  prevPageBtn.addEventListener("click", () => changePage(-1));
  nextPageBtn.addEventListener("click", () => changePage(1));
  tempoControl.value = currentSong.defaultTempo;
  renderPiano();
  renderSong();
}

function getLines(song) { return song.lines.flatMap((line) => line.map((text) => tokens(text))); }
function maxWindowStart() { return Math.max(0, currentSong.lines.length - linesPerPage); }
function pageCount() { return maxWindowStart() + 1; }
function pageForLine(lineIndex) { return Math.max(0, Math.min(maxWindowStart(), lineIndex)); }
function changePage(direction) {
  currentPage = Math.max(0, Math.min(maxWindowStart(), currentPage + direction));
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

  const startLine = currentPage;
  currentSong.lines.slice(startLine, startLine + linesPerPage).forEach((line, localLineIndex) => {
    const lineIndex = startLine + localLineIndex;
    const row = document.createElement("div");
    const hasLyric = Boolean(currentSong.lyrics?.[lineIndex]);
    row.className = `score-line${currentSong.id === "twinkle" ? " compact" : ""}${hasLyric ? " with-lyric" : ""}`;
    const notesRow = document.createElement("div");
    notesRow.className = "score-notes";
    let flatIndex = currentSong.lines.slice(0, lineIndex).reduce((total, previous) => total + previous.reduce((sum, group) => sum + tokens(group).length, 0), 0);

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
      notesRow.appendChild(groupEl);
    });
    row.appendChild(notesRow);
    if (hasLyric) {
      const lyric = document.createElement("div");
      lyric.className = "score-lyric";
      lyric.textContent = currentSong.lyrics[lineIndex];
      row.appendChild(lyric);
    }
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
  const keys = [...piano.querySelectorAll(".white-key")];
  const exactKey = keys.find((key) => {
    const keyNote = key.dataset.note;
    const keyDegree = keyNote.replace("_", "").replace("^", "");
    const keyOctave = keyNote.includes("_") ? "low" : keyNote.includes("^") ? "high" : "mid";
    return keyDegree === normalized && keyOctave === octave;
  });
  return exactKey || keys.find((key) => key.dataset.note.replace("_", "").replace("^", "") === normalized && !key.dataset.note.includes("_") && !key.dataset.note.includes("^"));
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
  key.classList.add("active");
  window.setTimeout(() => key.classList.remove("active"), 430);
  await ensureAudio();
  const frequency = parseNote(note);
  const now = audioContext.currentTime;
  playTone(frequency, now, 0.5);
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
      const targetPage = pageForLine(findLineForIndex(index));
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
