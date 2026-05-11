/* ============================================
   quizlib.js — Shared quiz logic (study days)
   Score locks on first pick; other choices
   remain clickable to view their explanations.
   ============================================ */

const state = { answered: new Set(), correct: 0, viewing: new Map() };

function renderQuestions() {
  const root = document.getElementById("questionList");
  root.innerHTML = QUESTIONS.map((q, qi) => `
    <div class="question" data-q="${qi}">
      <div class="question-num">Question ${qi + 1} of ${QUESTIONS.length}</div>
      <div class="question-text">${q.text}</div>
      <div class="choices">
        ${q.choices.map((c, ci) => `
          <button class="choice" data-ci="${ci}" onclick="selectChoice(${qi},${ci})">
            <span class="choice-letter">${String.fromCharCode(65 + ci)}</span>
            <span>${c}</span>
          </button>
        `).join("")}
      </div>
      <div class="explanation">
        <div class="explanation-title"></div>
        <div class="explanation-text"></div>
      </div>
    </div>
  `).join("");
}

function selectChoice(qi, ci) {
  const q = QUESTIONS[qi];
  const block = document.querySelector(`[data-q="${qi}"]`);
  const btns  = block.querySelectorAll(".choice");
  const expl  = block.querySelector(".explanation");

  if (!state.answered.has(qi)) {
    /* ── First pick: lock score ── */
    const isCorrect = ci === q.correct;
    state.answered.add(qi);
    if (isCorrect) state.correct++;
    state.viewing.set(qi, ci);

    btns.forEach((btn, i) => {
      if (i === ci)  btn.classList.add("selected", isCorrect ? "correct" : "wrong");
      if (!isCorrect && i === q.correct) btn.classList.add("reveal-correct");
    });

    expl.classList.add("show", isCorrect ? "correct" : "wrong");
    expl.querySelector(".explanation-title").textContent = isCorrect ? "✓ Correct" : "✗ Not quite";
    expl.querySelector(".explanation-text").textContent  = q.explanations[ci];
    updateProgress();

  } else {
    /* ── Subsequent picks: explore mode (score frozen) ── */
    const prevViewed  = state.viewing.get(qi);
    const lockedIndex = [...btns].findIndex(b => b.classList.contains("selected"));

    // Remove viewing highlight from previously explored choice
    if (prevViewed !== lockedIndex && btns[prevViewed]) {
      btns[prevViewed].classList.remove("viewing");
    }

    // Apply viewing highlight to newly clicked choice (skip if it's the locked pick)
    if (ci !== lockedIndex) {
      btns[ci].classList.add("viewing");
    }
    state.viewing.set(qi, ci);

    // Swap explanation panel — keep correct/wrong colour of the panel intact
    const label = ci === q.correct ? "✓ Correct" : "✗ Incorrect";
    expl.querySelector(".explanation-title").textContent = label;
    expl.querySelector(".explanation-text").textContent  = q.explanations[ci];
  }
}

function updateProgress() {
  const total = QUESTIONS.length, done = state.answered.size;
  document.getElementById("progressFill").style.width = Math.round(done / total * 100) + "%";
  document.getElementById("progressLabel").textContent = `${done} of ${total} answered`;
  document.getElementById("progressScore").textContent = `Score: ${state.correct} / ${done}`;
}

renderQuestions();
