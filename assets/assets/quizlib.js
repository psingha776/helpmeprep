/* ============================================
   quizlib.js — Shared quiz logic (study days)
   v1.1 changes:
     • After selecting an answer, all other choices are disabled.
     • A "Show all four explanations" collapsible <details> panel
       appears beneath the result, listing checkmark/cross for each choice.
     • Answers and scores are persisted in localStorage (keyed by
       page filename) and restored on reload.
     • resetQuiz() clears storage and re-shuffles the choices for
       every question, then re-renders.
     • triggerConfetti() fires a 3-second canvas confetti animation
       when all 30 questions have been answered.
   ============================================ */

/* Helpers */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getStorageKey() {
  return "hmp_quiz_" + location.pathname.split("/").pop().replace(".html", "");
}

let quizData;

function buildFreshData() {
  return QUESTIONS.map((q, originalIdx) => {
    const choiceOrder = shuffleArray([0, 1, 2, 3]);
    return { originalIdx, choiceOrder, newCorrect: choiceOrder.indexOf(q.correct),
             answered: false, selectedChoice: null, wasCorrect: null };
  });
}

function loadData() {
  try {
    const saved = localStorage.getItem(getStorageKey());
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === QUESTIONS.length) return parsed;
    }
  } catch (_) {}
  return null;
}

function saveData() {
  try { localStorage.setItem(getStorageKey(), JSON.stringify(quizData)); } catch (_) {}
}

function countCorrect()  { return quizData.filter(d => d.wasCorrect === true).length; }
function countAnswered() { return quizData.filter(d => d.answered).length; }

function renderQuestions() {
  const root = document.getElementById("questionList");
  root.innerHTML = quizData.map((qd, qi) => buildQuestionHTML(qi, qd)).join("");
  updateProgress();
}

function buildQuestionHTML(qi, qd) {
  const q  = QUESTIONS[qd.originalIdx];
  const sc = qd.choiceOrder.map(ci => q.choices[ci]);
  const se = qd.choiceOrder.map(ci => q.explanations[ci]);

  const choicesHTML = sc.map((text, di) => {
    let cls = "choice", disabled = "";
    if (qd.answered) {
      disabled = "disabled";
      if      (di === qd.selectedChoice && qd.wasCorrect)  cls += " selected correct";
      else if (di === qd.selectedChoice && !qd.wasCorrect) cls += " selected wrong";
      else if (di === qd.newCorrect     && !qd.wasCorrect) cls += " reveal-correct";
      else                                                  cls += " faded";
    }
    return `<button class="${cls}" data-ci="${di}" onclick="selectChoice(${qi},${di})" ${disabled}>
        <span class="choice-letter">${String.fromCharCode(65 + di)}</span>
        <span>${text}</span></button>`;
  }).join("");

  let explHTML = "";
  if (qd.answered) {
    const allRows = sc.map((text, di) => {
      const ok = di === qd.newCorrect;
      return `<div class="expl-item ${ok ? "expl-correct" : "expl-wrong"}">
          <span class="expl-icon">${ok ? "✅" : "❌"}</span>
          <div><strong>${String.fromCharCode(65+di)}. ${text}</strong>
          <p class="expl-text">${se[di]}</p></div></div>`;
    }).join("");
    explHTML = `<div class="explanation show ${qd.wasCorrect ? "correct" : "wrong"}">
        <div class="explanation-title">${qd.wasCorrect ? "✓ Correct" : "✗ Not quite"}</div>
        <div class="explanation-text">${se[qd.selectedChoice]}</div>
        <details class="all-explanations">
          <summary>Show all four explanations</summary>
          <div class="all-expl-panel">${allRows}</div>
        </details></div>`;
  } else {
    explHTML = `<div class="explanation"><div class="explanation-title"></div>
        <div class="explanation-text"></div></div>`;
  }

  return `<div class="question" data-q="${qi}">
      <div class="question-num">Question ${qi + 1} of ${QUESTIONS.length}</div>
      <div class="question-text">${q.text}</div>
      <div class="choices">${choicesHTML}</div>${explHTML}</div>`;
}

function selectChoice(qi, ci) {
  const qd = quizData[qi];
  if (qd.answered) return;

  const q  = QUESTIONS[qd.originalIdx];
  const sc = qd.choiceOrder.map(i => q.choices[i]);
  const se = qd.choiceOrder.map(i => q.explanations[i]);
  const isCorrect = ci === qd.newCorrect;

  qd.answered = true; qd.selectedChoice = ci; qd.wasCorrect = isCorrect;
  saveData();

  const block = document.querySelector(`[data-q="${qi}"]`);
  block.querySelectorAll(".choice").forEach((btn, di) => {
    btn.disabled = true;
    if      (di === ci && isCorrect)              btn.classList.add("selected","correct");
    else if (di === ci && !isCorrect)             btn.classList.add("selected","wrong");
    else if (di === qd.newCorrect && !isCorrect)  btn.classList.add("reveal-correct");
    else                                          btn.classList.add("faded");
  });

  const allRows = sc.map((text, di) => {
    const ok = di === qd.newCorrect;
    return `<div class="expl-item ${ok ? "expl-correct" : "expl-wrong"}">
        <span class="expl-icon">${ok ? "✅" : "❌"}</span>
        <div><strong>${String.fromCharCode(65+di)}. ${text}</strong>
        <p class="expl-text">${se[di]}</p></div></div>`;
  }).join("");

  const expl = block.querySelector(".explanation");
  expl.className = `explanation show ${isCorrect ? "correct" : "wrong"}`;
  expl.innerHTML = `<div class="explanation-title">${isCorrect ? "✓ Correct" : "✗ Not quite"}</div>
      <div class="explanation-text">${se[ci]}</div>
      <details class="all-explanations">
        <summary>Show all four explanations</summary>
        <div class="all-expl-panel">${allRows}</div>
      </details>`;

  updateProgress();
  if (countAnswered() === QUESTIONS.length) triggerConfetti();
}

function updateProgress() {
  const total = QUESTIONS.length, done = countAnswered(), correct = countCorrect();
  document.getElementById("progressFill").style.width  = Math.round(done / total * 100) + "%";
  document.getElementById("progressLabel").textContent = `${done} of ${total} answered`;
  document.getElementById("progressScore").textContent = `Score: ${correct} / ${done || 0}`;
}

function resetQuiz() {
  try { localStorage.removeItem(getStorageKey()); } catch (_) {}
  quizData = buildFreshData();
  saveData();
  renderQuestions();
  const quizSection = document.getElementById("quiz");
  if (quizSection) window.scrollTo({ top: quizSection.offsetTop - 20, behavior: "smooth" });
}

function triggerConfetti() {
  const canvas = document.createElement("canvas");
  canvas.id = "confettiCanvas";
  Object.assign(canvas.style, { position:"fixed", top:"0", left:"0",
    width:"100%", height:"100%", pointerEvents:"none", zIndex:"9999" });
  document.body.appendChild(canvas);
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");
  const colors = ["#ffb84d","#4ade80","#60a5fa","#f87171","#a78bfa","#34d399","#fbbf24","#fb923c"];
  const pieces = Array.from({ length: 160 }, () => ({
    x: Math.random() * canvas.width, y: -10 - Math.random() * 120,
    w: 7 + Math.random() * 9, h: 4 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 3, vy: 2.5 + Math.random() * 3.5,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.14, opacity: 1
  }));
  const startTime = Date.now(), DURATION = 3000;
  (function animate() {
    const elapsed = Date.now() - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rotation += p.rotationSpeed;
      if (elapsed > DURATION * 0.6)
        p.opacity = Math.max(0, 1 - (elapsed - DURATION*0.6)/(DURATION*0.4));
      ctx.save(); ctx.globalAlpha = p.opacity;
      ctx.translate(p.x + p.w/2, p.y + p.h/2); ctx.rotate(p.rotation);
      ctx.fillStyle = p.color; ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    if (elapsed < DURATION) requestAnimationFrame(animate); else canvas.remove();
  })();
}

/* Init */
quizData = loadData() || buildFreshData();
saveData();
renderQuestions();
