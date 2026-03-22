'use strict';

// ===== 定数 =====
const DOMAIN_FILES = [
  'questions/domain1.json',
  'questions/domain2.json',
  'questions/domain3.json',
  'questions/domain4.json',
  'questions/domain5.json',
  'questions/domain6.json',
  'questions/domain7.json',
  'questions/domain8.json',
];

const DOMAIN_COLORS = [
  '#4f8ef7', '#2ecc71', '#9b59b6', '#e67e22',
  '#1abc9c', '#e74c3c', '#3498db', '#f39c12',
];

const CAT_MIN_QUESTIONS = 100;
const CAT_MAX_QUESTIONS = 150;
const CAT_EXAM_SECONDS = 3 * 60 * 60; // 3時間
const PASSING_SCORE = 700;
const PASSING_THETA = 1.2; // スコア700に対応するtheta値
const CONFIDENCE_THRESHOLD = 1.0; // CAT停止の信頼区間閾値

// ===== 状態管理 =====
let allQuestions = []; // 全問題フラット配列（domainオブジェクト付き）
let domainMeta = [];   // ドメインメタ情報

let session = null; // 現在のセッション

// ===== 初期化 =====
async function init() {
  showLoading(true);
  try {
    await loadAllQuestions();
    renderDomainGrid();
    renderStats();
    bindHomeEvents();
  } catch (e) {
    console.error('問題の読み込みに失敗しました:', e);
    document.querySelector('.loading-text').textContent = '問題の読み込みに失敗しました。ページを再読み込みしてください。';
    return;
  }
  showLoading(false);
  showScreen('home');
}

// ===== 問題読み込み =====
async function loadAllQuestions() {
  const results = await Promise.all(
    DOMAIN_FILES.map(f => fetch(f).then(r => r.json()))
  );

  allQuestions = [];
  domainMeta = [];

  results.forEach((data, i) => {
    domainMeta.push({
      domain: data.domain,
      domainName: data.domainName,
      weight: data.weight,
      color: DOMAIN_COLORS[i],
      count: data.questions.length,
    });

    data.questions.forEach(q => {
      allQuestions.push({ ...q, domainIndex: i, domainName: data.domainName, weight: data.weight });
    });
  });
}

// ===== ホーム画面 =====
function renderDomainGrid() {
  const grid = document.getElementById('domain-grid');
  grid.innerHTML = '';
  domainMeta.forEach((d, i) => {
    const btn = document.createElement('button');
    btn.className = 'domain-btn';
    btn.innerHTML = `
      <div class="domain-btn-name">Domain ${d.domain}: ${d.domainName}</div>
      <div class="domain-btn-count">${d.count}問</div>
      <span class="domain-btn-weight">${d.weight}%</span>
    `;
    btn.style.borderLeft = `3px solid ${d.color}`;
    btn.addEventListener('click', () => startPractice(i));
    grid.appendChild(btn);
  });
}

function renderStats() {
  const grid = document.getElementById('stats-grid');
  const stats = loadStats();
  grid.innerHTML = '';

  domainMeta.forEach((d, i) => {
    const s = stats.domains[i] || { correct: 0, total: 0 };
    const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : null;
    const div = document.createElement('div');
    div.className = 'stats-item';
    div.style.borderTop = `3px solid ${d.color}`;
    div.innerHTML = `
      <div class="stats-item-domain">D${d.domain}: ${d.domainName}</div>
      <div class="stats-item-score">${pct !== null ? pct + '%' : '—'}</div>
      <div class="stats-item-detail">${s.correct}/${s.total} 正解</div>
    `;
    grid.appendChild(div);
  });

  // 全体
  const total = Object.values(stats.domains).reduce((a, b) => ({ correct: a.correct + b.correct, total: a.total + b.total }), { correct: 0, total: 0 });
  const div = document.createElement('div');
  div.className = 'stats-item';
  div.innerHTML = `
    <div class="stats-item-domain">全ドメイン合計</div>
    <div class="stats-item-score">${total.total > 0 ? Math.round((total.correct / total.total) * 100) + '%' : '—'}</div>
    <div class="stats-item-detail">${total.correct}/${total.total} 正解</div>
  `;
  grid.appendChild(div);
}

function bindHomeEvents() {
  document.getElementById('btn-cat-exam').addEventListener('click', () => openExamModal());
  document.getElementById('btn-practice').addEventListener('click', () => {
    document.getElementById('domain-selector').classList.toggle('hidden');
  });
  document.getElementById('btn-reset-stats').addEventListener('click', () => {
    if (confirm('学習記録をすべてリセットしますか？')) {
      localStorage.removeItem('cissp_stats');
      renderStats();
    }
  });
  bindModalEvents();
}

// ===== 試験開始モーダル =====
function openExamModal() {
  // デフォルトを学習モードに設定
  applyPreset('study');
  document.getElementById('exam-modal-overlay').classList.remove('hidden');
}

function closeExamModal() {
  document.getElementById('exam-modal-overlay').classList.add('hidden');
}

function bindModalEvents() {
  // プリセットボタン
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyPreset(btn.dataset.preset);
    });
  });

  // キャンセル・開始
  document.getElementById('modal-cancel').addEventListener('click', closeExamModal);
  document.getElementById('modal-start').addEventListener('click', () => {
    const settings = readModalSettings();
    closeExamModal();
    startCatExam(settings);
  });

  // モーダル外クリックで閉じる
  document.getElementById('exam-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('exam-modal-overlay')) closeExamModal();
  });
}

function applyPreset(preset) {
  const customOptions = document.getElementById('custom-options');
  const optScore = document.getElementById('opt-score');
  const optHint = document.getElementById('opt-hint');
  const optExp = document.getElementById('opt-explanation');

  const optAccuracy = document.getElementById('opt-accuracy');

  if (preset === 'study') {
    optScore.checked = true;
    optHint.checked = true;
    optExp.checked = true;
    optAccuracy.checked = true;
    customOptions.classList.add('hidden');
  } else if (preset === 'exam') {
    optScore.checked = false;
    optHint.checked = false;
    optExp.checked = false;
    optAccuracy.checked = false;
    customOptions.classList.add('hidden');
  } else {
    // カスタム：現在値を維持、設定UIを表示
    customOptions.classList.remove('hidden');
  }
}

function readModalSettings() {
  return {
    showScore: document.getElementById('opt-score').checked,
    showHints: document.getElementById('opt-hint').checked,
    showExplanation: document.getElementById('opt-explanation').checked,
    showAccuracy: document.getElementById('opt-accuracy').checked,
  };
}

// ===== セッション管理 =====
function createSession(mode, questionPool) {
  return {
    mode,             // 'cat' | 'practice'
    questions: questionPool,
    answered: [],     // { question, selectedIndex, isCorrect }
    currentIndex: 0,
    theta: 0,         // 能力推定値（-3〜3）
    confidence: 0,    // 信頼度（0〜1）
    domainCounts: new Array(8).fill(0),   // ドメイン別出題数
    startTime: Date.now(),
    timerInterval: null,
    finished: false,
  };
}

// ===== CAT試験開始 =====
function startCatExam(settings = { showScore: true, showHints: true, showExplanation: true }) {
  const pool = buildCatPool();
  session = createSession('cat', pool);
  session.settings = settings;

  showScreen('question');

  const modeLabel = settings.showScore === false && settings.showHints === false && settings.showExplanation === false
    ? '本番試験モード（CAT）' : '模擬試験（CAT）';
  document.getElementById('sidebar-mode-label').textContent = modeLabel;
  document.getElementById('q-total').textContent = `${CAT_MIN_QUESTIONS}〜${CAT_MAX_QUESTIONS}`;
  document.getElementById('timer-block').classList.remove('hidden');

  // 推定スコア表示制御
  const scoreBlock = document.getElementById('score-block');
  if (settings.showScore) scoreBlock.classList.remove('hidden');
  else scoreBlock.classList.add('hidden');

  // 正答率表示制御
  const accuracyBlock = document.getElementById('accuracy-block');
  if (settings.showAccuracy !== false) accuracyBlock.classList.remove('hidden');
  else accuracyBlock.classList.add('hidden');

  document.getElementById('btn-abort').onclick = () => {
    if (confirm('試験を中断して結果を見ますか？')) finishSession('abort');
  };

  startTimer(CAT_EXAM_SECONDS);
  renderDomainMiniList();
  renderNextQuestion();
}

// CATの問題プールをドメイン比率に従って構築
function buildCatPool() {
  // 各ドメインの目標問題数（最大150問×比率）
  const targets = domainMeta.map(d => Math.round(CAT_MAX_QUESTIONS * d.weight / 100));

  // ドメインごとにシャッフルして必要数取得
  const pool = [];
  domainMeta.forEach((d, i) => {
    const domainQs = allQuestions.filter(q => q.domainIndex === i);
    const shuffled = shuffle([...domainQs]);
    pool.push(...shuffled.slice(0, Math.min(targets[i], shuffled.length)));
  });

  return shuffle(pool); // 全体をシャッフル（後でCATアルゴリズムで選択）
}

// ===== ドメイン練習開始 =====
function startPractice(domainIndex) {
  const diffFilter = parseInt(document.getElementById('difficulty-filter').value);
  let pool = allQuestions.filter(q => q.domainIndex === domainIndex);
  if (diffFilter > 0) pool = pool.filter(q => q.difficulty === diffFilter);
  if (pool.length === 0) { alert('該当する問題がありません。'); return; }

  pool = shuffle([...pool]);
  session = createSession('practice', pool);
  session.settings = { showScore: false, showHints: true, showExplanation: true };

  showScreen('question');
  document.getElementById('sidebar-mode-label').textContent = `練習: D${domainMeta[domainIndex].domain}`;
  document.getElementById('q-total').textContent = pool.length;
  document.getElementById('timer-block').classList.add('hidden');
  document.getElementById('score-block').classList.add('hidden');

  document.getElementById('btn-abort').onclick = () => {
    if (confirm('練習を中断して結果を見ますか？')) finishSession('abort');
  };

  renderDomainMiniList();
  renderNextQuestion();
}

// ===== CATアルゴリズム =====

// 次の問題を選択（CAT）
function selectNextQuestionCat() {
  const answeredIds = new Set(session.answered.map(a => a.question.id));
  const remaining = session.questions.filter(q => !answeredIds.has(q.id));
  if (remaining.length === 0) return null;

  // 現在のthetaに最も近い難易度の問題を選ぶ
  const targetDiff = thetaToDifficulty(session.theta);

  // ドメイン比率も考慮：最も不足しているドメインを優先
  const totalAnswered = session.answered.length;
  const domainShortfall = domainMeta.map((d, i) => {
    const expected = Math.round(totalAnswered * d.weight / 100);
    const actual = session.domainCounts[i];
    return expected - actual;
  });

  // スコアリング：難易度マッチ + ドメイン不足度
  const scored = remaining.map(q => {
    const diffScore = -Math.abs(q.difficulty - targetDiff);
    const domainBonus = domainShortfall[q.domainIndex] * 0.5;
    return { q, score: diffScore + domainBonus };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].q;
}

// theta → 目標難易度（1〜3）
function thetaToDifficulty(theta) {
  if (theta < -0.5) return 1;
  if (theta > 0.5) return 3;
  return 2;
}

// 正誤に応じてthetaを更新（簡易IRT）
function updateTheta(isCorrect, difficulty) {
  const n = session.answered.length;
  // 回答が増えるほど更新幅が小さくなる（収束）
  const step = Math.max(0.1, 0.5 - n * 0.003);
  const diffWeight = difficulty === 1 ? 0.7 : difficulty === 2 ? 1.0 : 1.3;

  if (isCorrect) {
    session.theta = Math.min(3, session.theta + step * diffWeight);
  } else {
    session.theta = Math.max(-3, session.theta - step * diffWeight);
  }

  // 信頼度：回答数が増えるほど上がる
  session.confidence = Math.min(1, n / CAT_MAX_QUESTIONS * 1.5);
}

// theta → スコア（0〜1000）
function thetaToScore(theta) {
  // theta=0 → 500点、theta=PASSING_THETA → 700点
  const score = 500 + (theta / 3) * 500;
  return Math.max(0, Math.min(1000, Math.round(score)));
}

// CAT停止判定
function shouldStopCat() {
  const n = session.answered.length;
  if (n >= CAT_MAX_QUESTIONS) return true;
  if (n < CAT_MIN_QUESTIONS) return false;

  // 95%信頼区間で合否が明確に判定できるか
  const confidenceInterval = 1.96 * (3 / Math.sqrt(n)); // 簡易標準誤差
  const scoreGap = Math.abs(session.theta - PASSING_THETA);
  return scoreGap > confidenceInterval;
}

// ===== 問題レンダリング =====
function renderNextQuestion() {
  let q;

  if (session.mode === 'cat') {
    if (shouldStopCat()) {
      finishSession('cat_stop');
      return;
    }
    q = selectNextQuestionCat();
    if (!q) { finishSession('no_questions'); return; }
  } else {
    if (session.currentIndex >= session.questions.length) {
      finishSession('all_done');
      return;
    }
    q = session.questions[session.currentIndex];
  }

  session.currentQuestion = q;
  const qNum = session.answered.length + 1;

  // UI更新
  document.getElementById('q-num').textContent = qNum;
  document.getElementById('q-current').textContent = qNum;
  document.getElementById('question-text').textContent = q.question;

  const domainBadge = document.getElementById('q-domain-badge');
  domainBadge.textContent = `D${q.domainIndex + 1}: ${q.domainName}`;
  domainBadge.style.background = hexToRgba(DOMAIN_COLORS[q.domainIndex], 0.15);
  domainBadge.style.color = DOMAIN_COLORS[q.domainIndex];

  const diffBadge = document.getElementById('q-difficulty-badge');
  const diffLabels = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
  diffBadge.textContent = diffLabels[q.difficulty];
  diffBadge.className = `q-difficulty-badge ${['', 'easy', 'medium', 'hard'][q.difficulty]}`;

  // 進捗バー
  const maxQ = session.mode === 'cat' ? CAT_MAX_QUESTIONS : session.questions.length;
  document.getElementById('progress-bar').style.width = `${(qNum / maxQ) * 100}%`;

  // 選択肢
  const optionsList = document.getElementById('options-list');
  optionsList.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span class="option-label">${opt.charAt(0)}</span><span>${opt.slice(3)}</span>`;
    btn.addEventListener('click', () => selectAnswer(i));
    optionsList.appendChild(btn);
  });

  // 解説・ボタンを隠す
  document.getElementById('explanation-box').classList.add('hidden');
  document.getElementById('btn-next').classList.add('hidden');
  document.getElementById('btn-finish').classList.add('hidden');

  // ヒントボタン制御
  const settings = session.settings || { showHints: true, showExplanation: true };
  const btnHint = document.getElementById('btn-hint');
  const hintText = document.getElementById('hint-text');
  hintText.classList.add('hidden');
  if (settings.showHints) {
    btnHint.classList.remove('hidden');
    btnHint.disabled = false;
    btnHint.textContent = '💡 ヒントを見る';
    btnHint.onclick = () => showHint(q);
  } else {
    btnHint.classList.add('hidden');
  }

  // スコア更新
  if (session.mode === 'cat' && settings.showScore) updateScoreDisplay();

  renderDomainMiniList();
}

function selectAnswer(selectedIndex) {
  if (session.finished) return;
  const q = session.currentQuestion;
  const isCorrect = selectedIndex === q.answer;

  // ボタンを無効化・色付け
  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add('correct');
    if (i === selectedIndex && !isCorrect) btn.classList.add('incorrect');
  });

  // ヒントボタンを無効化
  document.getElementById('btn-hint').disabled = true;

  // 解説表示（設定に応じて）
  const settings = session.settings || { showExplanation: true };
  const expBox = document.getElementById('explanation-box');
  if (settings.showExplanation) {
    expBox.classList.remove('hidden');
    const expResult = document.getElementById('explanation-result');
    expResult.textContent = isCorrect ? '✓ 正解！' : '✗ 不正解';
    expResult.className = `explanation-result ${isCorrect ? 'correct' : 'incorrect'}`;
    document.getElementById('explanation-text').textContent = q.explanation;
  } else {
    expBox.classList.add('hidden');
  }

  // 記録
  session.answered.push({ question: q, selectedIndex, isCorrect });
  session.domainCounts[q.domainIndex]++;
  if (session.mode !== 'cat') session.currentIndex++;

  // theta更新
  updateTheta(isCorrect, q.difficulty);

  // 統計保存
  saveAnswerToStats(q.domainIndex, isCorrect);

  // スコア・正答率更新
  const s = session.settings || { showScore: true, showAccuracy: true };
  if (session.mode === 'cat' && s.showScore) updateScoreDisplay();
  if (s.showAccuracy !== false) updateAccuracyDisplay();

  // 正誤表示
  const accDisplay = document.getElementById('accuracy-display');
  accDisplay.style.color = isCorrect ? 'var(--success)' : 'var(--danger)';
  setTimeout(() => { accDisplay.style.color = ''; }, 800);

  // 次へボタン
  const isLast = session.mode === 'practice' && session.currentIndex >= session.questions.length;
  const catShouldStop = session.mode === 'cat' && shouldStopCat();

  if (isLast || catShouldStop) {
    document.getElementById('btn-finish').classList.remove('hidden');
    document.getElementById('btn-finish').onclick = () => finishSession('done');
  } else {
    document.getElementById('btn-next').classList.remove('hidden');
    document.getElementById('btn-next').onclick = () => renderNextQuestion();
  }
}

function updateScoreDisplay() {
  const score = thetaToScore(session.theta);
  document.getElementById('score-display').textContent = session.answered.length > 0 ? score : '—';
  const pct = score / 10;
  document.getElementById('score-bar').style.width = `${pct}%`;

  // 合否カラー
  const scoreVal = document.getElementById('score-display');
  scoreVal.style.color = score >= PASSING_SCORE ? 'var(--success)' : 'var(--danger)';
}

function updateAccuracyDisplay() {
  const total = session.answered.length;
  const correct = session.answered.filter(a => a.isCorrect).length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  document.getElementById('accuracy-display').textContent = `${pct}% (${correct}/${total})`;
}

function renderDomainMiniList() {
  const list = document.getElementById('domain-mini-list');
  list.innerHTML = '';
  domainMeta.forEach((d, i) => {
    const count = session.domainCounts[i];
    if (count === 0 && session.mode === 'cat') return;
    const item = document.createElement('div');
    item.className = 'domain-mini-item';
    item.innerHTML = `
      <span class="domain-mini-name" style="color:${d.color}">D${d.domain}</span>
      <span class="domain-mini-count">${count}問</span>
    `;
    list.appendChild(item);
  });
}

// ===== ヒント =====
function showHint(q) {
  const btn = document.getElementById('btn-hint');
  const hintText = document.getElementById('hint-text');

  // 正解以外の選択肢をランダムに1つ選んで除外ヒントを表示
  const wrongIndices = q.options
    .map((_, i) => i)
    .filter(i => i !== q.answer);
  const eliminated = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
  const label = ['A', 'B', 'C', 'D'][eliminated];

  hintText.textContent = `💡 ヒント：選択肢 ${label} は正解ではありません。`;
  hintText.classList.remove('hidden');

  btn.textContent = 'ヒント使用済み';
  btn.disabled = true;

  // 除外された選択肢を薄く表示
  const optBtns = document.querySelectorAll('.option-btn');
  if (optBtns[eliminated]) {
    optBtns[eliminated].style.opacity = '0.35';
  }
}

// ===== タイマー =====
function startTimer(seconds) {
  let remaining = seconds;
  updateTimerDisplay(remaining);

  session.timerInterval = setInterval(() => {
    remaining--;
    updateTimerDisplay(remaining);

    if (remaining <= 600) document.getElementById('timer').classList.add('warning');
    if (remaining <= 300) {
      document.getElementById('timer').classList.remove('warning');
      document.getElementById('timer').classList.add('danger');
    }
    if (remaining <= 0) {
      clearInterval(session.timerInterval);
      finishSession('timeout');
    }
  }, 1000);
}

function updateTimerDisplay(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  document.getElementById('timer').textContent =
    `${String(h).padStart(1,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function stopTimer() {
  if (session && session.timerInterval) clearInterval(session.timerInterval);
}

// ===== 試験終了 =====
function finishSession(reason) {
  session.finished = true;
  session.endTime = Date.now();
  stopTimer();
  showResultScreen(reason);
}

function showResultScreen(reason) {
  showScreen('result');

  const total = session.answered.length;
  const correct = session.answered.filter(a => a.isCorrect).length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const score = thetaToScore(session.theta);
  const elapsed = Math.floor((session.endTime - session.startTime) / 1000);

  // 合否判定
  let verdict, headerClass;
  if (reason === 'timeout') {
    verdict = '時間切れ';
    headerClass = 'incomplete';
  } else if (session.mode === 'practice') {
    verdict = '練習完了';
    headerClass = accuracy >= 70 ? 'pass' : 'fail';
  } else {
    if (score >= PASSING_SCORE) {
      verdict = 'PASS';
      headerClass = 'pass';
    } else {
      verdict = 'FAIL';
      headerClass = 'fail';
    }
  }

  const header = document.getElementById('result-header');
  header.className = `result-header ${headerClass}`;
  document.getElementById('result-verdict').textContent = verdict;

  if (session.mode === 'cat') {
    document.getElementById('result-score').textContent = `${score} / 1000`;
    document.getElementById('result-detail').textContent =
      `合格ライン: ${PASSING_SCORE}点 | ${score >= PASSING_SCORE ? '合格圏内' : 'あと' + (PASSING_SCORE - score) + '点'}`;
  } else {
    document.getElementById('result-score').textContent = `${accuracy}%`;
    document.getElementById('result-detail').textContent = `正答率`;
  }

  document.getElementById('res-total-q').textContent = total;
  document.getElementById('res-correct').textContent = correct;
  document.getElementById('res-accuracy').textContent = `${accuracy}%`;
  document.getElementById('res-time').textContent = formatTime(elapsed);

  // ドメイン別成績
  renderDomainResults();

  // ボタン
  document.getElementById('btn-retry').onclick = () => {
    if (session.mode === 'cat') startCatExam();
    else location.reload();
  };
  document.getElementById('btn-home').onclick = () => {
    session = null;
    renderStats();
    showScreen('home');
  };
  document.getElementById('btn-review').onclick = () => {
    document.getElementById('review-section').classList.toggle('hidden');
    renderReview();
  };

}

function renderDomainResults() {
  const grid = document.getElementById('domain-results-grid');
  grid.innerHTML = '';

  domainMeta.forEach((d, i) => {
    const domainAnswered = session.answered.filter(a => a.question.domainIndex === i);
    if (domainAnswered.length === 0) return;

    const domainCorrect = domainAnswered.filter(a => a.isCorrect).length;
    const pct = Math.round((domainCorrect / domainAnswered.length) * 100);

    const row = document.createElement('div');
    row.className = 'domain-result-row';
    row.innerHTML = `
      <div class="dr-name">D${d.domain}: ${d.domainName}</div>
      <div class="dr-count">${domainCorrect}/${domainAnswered.length}</div>
      <div class="dr-bar-bg">
        <div class="dr-bar-fill" style="width:${pct}%; background:${pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)'}"></div>
      </div>
      <div class="dr-pct" style="color:${pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)'}">${pct}%</div>
    `;
    grid.appendChild(row);
  });
}

function renderReview() {
  const list = document.getElementById('review-list');
  list.innerHTML = '';
  const wrong = session.answered.filter(a => !a.isCorrect);
  if (wrong.length === 0) {
    list.innerHTML = '<p style="color:var(--success)">全問正解です！</p>';
    return;
  }

  wrong.forEach((a, idx) => {
    const q = a.question;
    const item = document.createElement('div');
    item.className = 'review-item';
    item.innerHTML = `
      <div class="review-item-header">
        <span>Q${idx + 1}</span>
        <span style="color:${DOMAIN_COLORS[q.domainIndex]}">D${q.domainIndex + 1}: ${q.domainName}</span>
        <span class="q-difficulty-badge ${['','easy','medium','hard'][q.difficulty]}">${['','Easy','Medium','Hard'][q.difficulty]}</span>
      </div>
      <div class="review-item-q">${q.question}</div>
      <div class="review-item-answer">あなたの回答: ${q.options[a.selectedIndex]}</div>
      <div class="review-item-correct">正解: ${q.options[q.answer]}</div>
      <div class="review-item-exp">${q.explanation}</div>
    `;
    list.appendChild(item);
  });
}

// ===== 統計管理（localStorage）=====
function loadStats() {
  const raw = localStorage.getItem('cissp_stats');
  if (!raw) return { domains: {} };
  try { return JSON.parse(raw); } catch { return { domains: {} }; }
}

function saveAnswerToStats(domainIndex, isCorrect) {
  const stats = loadStats();
  if (!stats.domains[domainIndex]) stats.domains[domainIndex] = { correct: 0, total: 0 };
  stats.domains[domainIndex].total++;
  if (isCorrect) stats.domains[domainIndex].correct++;
  localStorage.setItem('cissp_stats', JSON.stringify(stats));
}

// ===== ユーティリティ =====
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
}

function showLoading(show) {
  document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}時間${m}分${s}秒`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ===== 起動 =====
document.addEventListener('DOMContentLoaded', init);
