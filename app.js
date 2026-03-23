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

const TERMS_FILES = [
  'questions/terms1.json',
  'questions/terms2.json',
  'questions/terms3.json',
  'questions/terms4.json',
  'questions/terms5.json',
  'questions/terms6.json',
  'questions/terms7.json',
  'questions/terms8.json',
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
let allTerms = [];     // 用語テスト問題
let termsDomainMeta = [];

let session = null; // 現在のセッション

// ===== 初期化 =====
async function init() {
  showLoading(true);
  try {
    await loadAllQuestions();
    await loadAllTerms();
    renderDomainGrid();
    renderTermsDomainGrid();
    renderStats();
    bindHomeEvents();
    bindStatsEvents();
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

// ===== 用語テスト読み込み =====
async function loadAllTerms() {
  try {
    const results = await Promise.all(
      TERMS_FILES.map(f => fetch(f).then(r => r.json()))
    );
    allTerms = [];
    termsDomainMeta = [];
    results.forEach((data, i) => {
      termsDomainMeta.push({
        domain: data.domain,
        domainName: data.domainName,
        color: DOMAIN_COLORS[i],
        count: data.questions.length,
      });
      data.questions.forEach(q => {
        allTerms.push({ ...q, domainIndex: i, domainName: data.domainName });
      });
    });
  } catch (e) {
    console.warn('用語データの読み込みに失敗しました:', e);
  }
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

let statsActiveTab = 'practice';

function renderStats() {
  const grid = document.getElementById('stats-grid');
  const stats = loadStats();
  grid.innerHTML = '';

  if (statsActiveTab === 'exam') {
    const note = document.createElement('div');
    note.className = 'stats-exam-note';
    note.textContent = '⚠️ 学習モードの結果は履歴に反映されません。本番試験モードのみ記録されます。';
    grid.appendChild(note);
    renderExamHistory(grid);
    return;
  }

  const bucket = stats[statsActiveTab] || { domains: {} };

  domainMeta.forEach((d, i) => {
    const s = bucket.domains[i] || { correct: 0, total: 0 };
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

  // 全体合計
  const total = Object.values(bucket.domains).reduce((a, b) => ({ correct: a.correct + b.correct, total: a.total + b.total }), { correct: 0, total: 0 });
  const div = document.createElement('div');
  div.className = 'stats-item';
  div.innerHTML = `
    <div class="stats-item-domain">全ドメイン合計</div>
    <div class="stats-item-score">${total.total > 0 ? Math.round((total.correct / total.total) * 100) + '%' : '—'}</div>
    <div class="stats-item-detail">${total.correct}/${total.total} 正解</div>
  `;
  grid.appendChild(div);
}

function renderExamHistory(container) {
  const history = loadExamHistory();
  const section = document.createElement('div');
  section.className = 'exam-history-section';
  section.innerHTML = '<div class="exam-history-title">過去の試験結果（本番試験モード）</div>';
  if (history.length === 0) {
    section.innerHTML += '<div class="exam-history-empty">まだ記録がありません</div>';
  } else {
    history.forEach((h, idx) => {
      const date = new Date(h.date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      const btn = document.createElement('button');
      btn.className = 'exam-history-link';
      btn.innerHTML = `
        <span class="exam-history-num">${idx + 1}</span>
        <span class="exam-history-date">${date}</span>
        <span class="exam-history-verdict ${h.verdict === 'PASS' ? 'pass' : 'fail'}">${h.verdict}</span>
        <span class="exam-history-score">${h.score}点</span>
        <span class="exam-history-arrow">詳細レポート →</span>
      `;
      btn.addEventListener('click', () => showHistoryModal(h));
      section.appendChild(btn);
    });
  }
  container.appendChild(section);
}

function showHistoryModal(h) {
  const date = new Date(h.date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const verdictClass = h.verdict === 'PASS' ? 'pass' : 'fail';
  const content = document.getElementById('history-modal-content');

  let reportHTML = '';
  if (!h.reportData) {
    reportHTML = `<div class="report-insufficient">分析には最低 ${REPORT_MIN_QUESTIONS} 問の回答が必要です（この回は ${h.total} 問）。</div>`;
  } else {
    const { domainAnalysis, souhyou } = h.reportData;
    const domainRows = domainAnalysis.filter(da => da.pct !== null).map(da => {
      const isWeak = da.pct < 70;
      const topicRows = Object.entries(da.topicMap)
        .filter(([, v]) => v.total >= 2)
        .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
        .slice(0, 3)
        .map(([k, v]) => {
          const pct = Math.round((v.correct / v.total) * 100);
          const color = pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
          return `<span style="color:${color}">${k}: ${pct}%</span>`;
        }).join(' &nbsp;|&nbsp; ');
      return `<div class="report-domain-row ${isWeak ? 'weak' : 'ok'}" style="border-left-color:${DOMAIN_COLORS[da.i]}">
        <div class="report-domain-header">
          <span class="report-domain-name" style="color:${DOMAIN_COLORS[da.i]}">D${da.d.domain}: ${da.d.domainName}</span>
          <span class="report-domain-pct" style="color:${da.pct >= 70 ? 'var(--success)' : da.pct >= 50 ? 'var(--warning)' : 'var(--danger)'}">${da.pct}%</span>
        </div>
        ${topicRows ? `<div class="report-weakness-text">${topicRows}</div>` : ''}
        ${da.weaknessText ? `<div class="report-weakness-text" style="margin-top:6px">${da.weaknessText}</div>` : ''}
      </div>`;
    }).join('');
    reportHTML = `<div class="history-report-domains">${domainRows}</div>
      <div class="history-report-souhyou">${souhyou}</div>`;
  }

  content.innerHTML = `
    <div class="history-result-header ${verdictClass}">
      <div class="history-result-verdict">${h.verdict}</div>
      <div class="history-result-score">${h.score} / 1000</div>
      <div class="history-result-meta">${date} &nbsp;|&nbsp; ${h.total}問 &nbsp;|&nbsp; 正答率 ${h.accuracy}% &nbsp;|&nbsp; ${formatTime(h.elapsed)}</div>
    </div>
    ${reportHTML}
  `;
  document.getElementById('history-modal-overlay').classList.remove('hidden');
}

function bindStatsEvents() {
  // アコーディオン
  document.getElementById('stats-toggle').addEventListener('click', () => {
    const body = document.getElementById('stats-accordion-body');
    const arrow = document.querySelector('.stats-accordion-arrow');
    body.classList.toggle('open');
    arrow.classList.toggle('open');
  });

  // タブ
  document.querySelectorAll('.stats-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.stats-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      statsActiveTab = btn.dataset.tab;
      renderStats();
    });
  });
}

function renderTermsDomainGrid() {
  const grid = document.getElementById('terms-domain-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'domain-btn domain-btn-all';
  allBtn.innerHTML = `
    <div class="domain-btn-name">🌐 全ドメイン</div>
    <div class="domain-btn-count">${allTerms.length}用語</div>
  `;
  allBtn.addEventListener('click', () => startTermsTest(-1));
  grid.appendChild(allBtn);

  termsDomainMeta.forEach((d, i) => {
    const btn = document.createElement('button');
    btn.className = 'domain-btn';
    btn.innerHTML = `
      <div class="domain-btn-name">Domain ${d.domain}: ${d.domainName}</div>
      <div class="domain-btn-count">${d.count}用語</div>
    `;
    btn.style.borderLeft = `3px solid ${d.color}`;
    btn.addEventListener('click', () => startTermsTest(i));
    grid.appendChild(btn);
  });
}

function bindHomeEvents() {
  document.getElementById('btn-cat-exam').addEventListener('click', () => openExamModal());
  document.getElementById('btn-practice').addEventListener('click', () => {
    const isOpen = document.getElementById('domain-selector').classList.toggle('open');
    document.getElementById('btn-practice').classList.toggle('expanded', isOpen);
  });
  document.getElementById('btn-terms').addEventListener('click', () => {
    document.getElementById('domain-selector').classList.remove('open');
    document.getElementById('btn-practice').classList.remove('expanded');
    startTermsTest(-1);
  });
  document.getElementById('btn-reset-stats').addEventListener('click', () => {
    if (statsActiveTab === 'practice') {
      showConfirmModal('ドメイン別練習の記録をリセットしますか？', () => {
        const stats = loadStats();
        stats.practice = { domains: {} };
        localStorage.setItem('cissp_stats', JSON.stringify(stats));
        renderStats();
      });
    } else {
      showConfirmModal('模擬試験の記録をリセットしますか？', () => {
        const stats = loadStats();
        stats.exam = { domains: {} };
        localStorage.setItem('cissp_stats', JSON.stringify(stats));
        localStorage.removeItem('cissp_exam_history');
        renderStats();
      });
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

  // 確認モーダル（汎用）
  document.getElementById('abort-cancel').addEventListener('click', closeConfirmModal);
  document.getElementById('abort-confirm').addEventListener('click', () => {
    const cb = closeConfirmModal();
    if (cb) cb();
  });
  document.getElementById('abort-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('abort-modal-overlay')) closeConfirmModal();
  });

  // 履歴詳細モーダル
  document.getElementById('history-modal-close').addEventListener('click', () => {
    document.getElementById('history-modal-overlay').classList.add('hidden');
  });
  document.getElementById('history-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('history-modal-overlay'))
      document.getElementById('history-modal-overlay').classList.add('hidden');
  });
}

let _confirmCallback = null;

function showConfirmModal(message, onConfirm) {
  _confirmCallback = onConfirm;
  document.getElementById('abort-modal-message').textContent = message;
  document.getElementById('abort-modal-overlay').classList.remove('hidden');
}

function closeConfirmModal() {
  document.getElementById('abort-modal-overlay').classList.add('hidden');
  const cb = _confirmCallback;
  _confirmCallback = null;
  return cb;
}

// 後方互換
function showAbortModal(message) {
  showConfirmModal(message, () => finishSession('abort'));
}

function setupAbortButtons(message) {
  const handler = () => showAbortModal(message);
  document.getElementById('btn-abort').onclick = handler;
  const inlineBtn = document.getElementById('btn-abort-inline');
  inlineBtn.onclick = handler;
  inlineBtn.classList.remove('hidden');
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
    mode,             // 'cat' | 'practice' | 'terms'
    questions: questionPool,
    answered: [],     // { question, selectedIndex, isCorrect }
    currentIndex: 0,
    theta: 0,         // 能力推定値（-3〜3）
    confidence: 0,    // 信頼度（0〜1）
    domainCounts: new Array(8).fill(0),   // ドメイン別出題数
    startTime: Date.now(),
    timerInterval: null,
    finished: false,
    reviewing: false,  // レビューモード中かどうか
    reviewIndex: 0,    // レビュー中の問題インデックス
  };
}

// ===== CAT試験開始 =====
function startCatExam(settings = { showScore: true, showHints: true, showExplanation: true }) {
  const pool = buildCatPool();
  session = createSession('cat', pool);
  session.settings = settings;
  session.isExamMode = !settings.showScore && !settings.showHints && !settings.showExplanation;

  showScreen('question');
  if (session.isExamMode) document.body.classList.add('mode-exam');

  const modeLabel = session.isExamMode ? '本番試験モード（CAT）' : '模擬試験（CAT）';
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

  setupAbortButtons('試験を中断して結果を見ますか？');

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

  setupAbortButtons('練習を中断して結果を見ますか？');

  renderDomainMiniList();
  renderNextQuestion();
}

// ===== 用語テスト開始 =====
function startTermsTest(domainIndex) {
  let pool;
  if (domainIndex === -1) {
    pool = shuffle([...allTerms]);
  } else {
    pool = shuffle(allTerms.filter(q => q.domainIndex === domainIndex));
  }
  if (pool.length === 0) { alert('用語データがありません。'); return; }

  session = createSession('terms', pool);
  session.settings = { showScore: false, showHints: false, showExplanation: true, showAccuracy: true };

  showScreen('question');
  document.body.classList.add('mode-terms');
  const label = domainIndex === -1 ? '用語テスト（全ドメイン）'
    : `用語テスト: D${termsDomainMeta[domainIndex].domain}`;
  document.getElementById('sidebar-mode-label').textContent = label;
  document.getElementById('q-total').textContent = pool.length;
  document.getElementById('timer-block').classList.add('hidden');
  document.getElementById('score-block').classList.add('hidden');
  document.getElementById('accuracy-block').classList.remove('hidden');

  setupAbortButtons('用語テストを中断して結果を見ますか？');

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

// ===== 前の問題に戻れるか判定 =====
function canGoBack() {
  if (!session || session.answered.length === 0) return false;
  const s = session.settings || {};
  const isExamMode = s.showScore === false && s.showHints === false &&
                     s.showExplanation === false && s.showAccuracy === false;
  return !isExamMode;
}

// ===== 問題レンダリング =====
function renderNextQuestion() {
  if (session && session.reviewing) {
    renderReviewQuestion();
    return;
  }

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

  // 戻るボタン制御（非試験モードでは常時表示）
  const btnBack = document.getElementById('btn-back');
  const s2 = session.settings || {};
  const isExamMode = s2.showScore === false && s2.showHints === false &&
                     s2.showExplanation === false && s2.showAccuracy === false;
  if (isExamMode) {
    btnBack.classList.add('hidden');
  } else {
    btnBack.classList.remove('hidden');
    btnBack.disabled = session.answered.length === 0;
    btnBack.onclick = () => {
      session.reviewing = true;
      session.reviewIndex = session.answered.length - 1;
      renderReviewQuestion();
    };
  }

  // スコア更新
  if (session.mode === 'cat' && settings.showScore) updateScoreDisplay();

  renderDomainMiniList();
}

function selectAnswer(selectedIndex) {
  if (session.finished) return;
  const q = session.currentQuestion;
  document.getElementById('btn-back').disabled = true;
  const isCorrect = selectedIndex === q.answer;

  // ボタンを無効化（本番モードは色付けしない）
  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (!session.isExamMode) {
      if (i === q.answer) btn.classList.add('correct');
      if (i === selectedIndex && !isCorrect) btn.classList.add('incorrect');
    }
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
  saveAnswerToStats(q.domainIndex, isCorrect, session.mode);

  // スコア・正答率更新
  const s = session.settings || { showScore: true, showAccuracy: true };
  if (session.mode === 'cat' && s.showScore) updateScoreDisplay();
  if (s.showAccuracy !== false) updateAccuracyDisplay();

  // 正誤フラッシュ（本番モードはスキップ）
  if (!session.isExamMode) {
    const accDisplay = document.getElementById('accuracy-display');
    accDisplay.style.color = isCorrect ? 'var(--success)' : 'var(--danger)';
    setTimeout(() => { accDisplay.style.color = ''; }, 800);
  }

  // 次へボタン
  const isLast = (session.mode === 'practice' || session.mode === 'terms') && session.currentIndex >= session.questions.length;
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

// ===== 前の問題レビュー =====
function renderReviewQuestion() {
  const record = session.answered[session.reviewIndex];
  const q = record.question;

  document.getElementById('q-num').textContent = session.reviewIndex + 1;
  document.getElementById('q-current').textContent = session.reviewIndex + 1;
  document.getElementById('question-text').textContent = q.question;

  const domainBadge = document.getElementById('q-domain-badge');
  domainBadge.textContent = `D${q.domainIndex + 1}: ${q.domainName}`;
  domainBadge.style.background = hexToRgba(DOMAIN_COLORS[q.domainIndex], 0.15);
  domainBadge.style.color = DOMAIN_COLORS[q.domainIndex];

  const diffBadge = document.getElementById('q-difficulty-badge');
  const diffLabels = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
  diffBadge.textContent = diffLabels[q.difficulty];
  diffBadge.className = `q-difficulty-badge ${['', 'easy', 'medium', 'hard'][q.difficulty]}`;

  // 選択肢（読み取り専用・正誤表示）
  const optionsList = document.getElementById('options-list');
  optionsList.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.disabled = true;
    if (i === q.answer) btn.classList.add('correct');
    if (i === record.selectedIndex && !record.isCorrect) btn.classList.add('incorrect');
    btn.innerHTML = `<span class="option-label">${opt.charAt(0)}</span><span>${opt.slice(3)}</span>`;
    optionsList.appendChild(btn);
  });

  // 解説表示
  document.getElementById('explanation-box').classList.remove('hidden');
  const expResult = document.getElementById('explanation-result');
  expResult.textContent = record.isCorrect ? '✓ 正解！' : '✗ 不正解';
  expResult.className = `explanation-result ${record.isCorrect ? 'correct' : 'incorrect'}`;
  document.getElementById('explanation-text').textContent = q.explanation;

  // ヒント非表示
  document.getElementById('btn-hint').classList.add('hidden');
  document.getElementById('hint-text').classList.add('hidden');

  // 戻るボタン
  const btnBack = document.getElementById('btn-back');
  if (session.reviewIndex > 0) {
    btnBack.classList.remove('hidden');
    btnBack.onclick = () => { session.reviewIndex--; renderReviewQuestion(); };
  } else {
    btnBack.classList.add('hidden');
  }

  // 進むボタン
  const btnNext = document.getElementById('btn-next');
  const btnFinish = document.getElementById('btn-finish');
  btnFinish.classList.add('hidden');
  btnNext.classList.remove('hidden');

  if (session.reviewIndex < session.answered.length - 1) {
    btnNext.textContent = '次の問題を確認 →';
    btnNext.onclick = () => { session.reviewIndex++; renderReviewQuestion(); };
  } else {
    btnNext.textContent = '現在の問題へ →';
    btnNext.onclick = () => { session.reviewing = false; renderNextQuestion(); };
  }
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
  } else if (session.mode === 'terms') {
    verdict = '用語テスト完了';
    headerClass = accuracy >= 80 ? 'pass' : 'fail';
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

  // 本番試験モードの履歴保存
  if (session.mode === 'cat' && session.isExamMode) {
    const reportData = total >= REPORT_MIN_QUESTIONS ? generateReport() : null;
    saveExamHistory({ date: new Date().toISOString(), score, verdict, total, correct, accuracy, elapsed, reportData });
  }

  // ボタン
  document.getElementById('btn-retry').onclick = () => {
    if (session.mode === 'cat') startCatExam();
    else if (session.mode === 'terms') { session = null; renderStats(); showScreen('home'); }
    else location.reload();
  };
  document.getElementById('btn-home').onclick = () => {
    session = null;
    renderStats();
    showScreen('home');
  };
  document.getElementById('btn-review').onclick = () => {
    document.getElementById('report-section').classList.add('hidden');
    document.getElementById('review-section').classList.toggle('hidden');
    renderReview();
  };

  // 詳細レポートボタン（CAT模擬試験のみ表示）
  const btnReport = document.getElementById('btn-report');
  if (session.mode === 'cat') {
    btnReport.classList.remove('hidden');
    btnReport.onclick = () => {
      document.getElementById('review-section').classList.add('hidden');
      document.getElementById('report-section').classList.toggle('hidden');
      if (!document.getElementById('report-section').classList.contains('hidden')) {
        renderReport();
      }
    };
  } else {
    btnReport.classList.add('hidden');
  }
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

// ===== 詳細レポート =====
const REPORT_MIN_QUESTIONS = 100;

function renderReport() {
  const total = session.answered.length;

  if (total < REPORT_MIN_QUESTIONS) {
    document.getElementById('report-weakness-list').innerHTML =
      `<div class="report-insufficient">分析には最低 ${REPORT_MIN_QUESTIONS} 問の回答が必要です（現在 ${total} 問）。<br>模擬試験を最後まで解くか、より多くの問題に取り組んでから確認してください。</div>`;
    document.getElementById('report-souhyou').textContent = '';
    return;
  }

  const { domainAnalysis, souhyou } = generateReport();

  // 弱点分析
  const weaknessList = document.getElementById('report-weakness-list');
  weaknessList.innerHTML = '';

  domainAnalysis.forEach(da => {
    if (da.pct === null) return;
    const row = document.createElement('div');
    const isWeak = da.pct < 70;
    row.className = `report-domain-row ${isWeak ? 'weak' : 'ok'}`;
    row.style.borderLeftColor = DOMAIN_COLORS[da.i];

    const topicRows = Object.entries(da.topicMap)
      .filter(([, v]) => v.total >= 2)
      .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
      .slice(0, 3)
      .map(([k, v]) => {
        const pct = Math.round((v.correct / v.total) * 100);
        const color = pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
        return `<span style="color:${color}">${k}: ${pct}%</span>`;
      }).join(' &nbsp;|&nbsp; ');

    row.innerHTML = `
      <div class="report-domain-header">
        <span class="report-domain-name" style="color:${DOMAIN_COLORS[da.i]}">D${da.d.domain}: ${da.d.domainName}</span>
        <span class="report-domain-pct" style="color:${da.pct >= 70 ? 'var(--success)' : da.pct >= 50 ? 'var(--warning)' : 'var(--danger)'}">${da.pct}%</span>
      </div>
      ${topicRows ? `<div class="report-weakness-text">${topicRows}</div>` : ''}
      ${da.weaknessText ? `<div class="report-weakness-text" style="margin-top:6px">${da.weaknessText}</div>` : ''}
    `;
    weaknessList.appendChild(row);
  });

  // 総評
  document.getElementById('report-souhyou').textContent = souhyou;
}

function generateReport() {
  const score = thetaToScore(session.theta);

  const domainAnalysis = domainMeta.map((d, i) => {
    const domainAnswered = session.answered.filter(a => a.question.domainIndex === i);
    const domainCorrect = domainAnswered.filter(a => a.isCorrect).length;
    const pct = domainAnswered.length > 0 ? Math.round((domainCorrect / domainAnswered.length) * 100) : null;

    // トピック別集計
    const topicMap = {};
    domainAnswered.forEach(a => {
      const topic = a.question.topic || '一般';
      if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0 };
      topicMap[topic].total++;
      if (a.isCorrect) topicMap[topic].correct++;
    });

    // 難易度別の誤答分析
    const easyWrong = domainAnswered.filter(a => !a.isCorrect && a.question.difficulty === 1).length;
    const medWrong = domainAnswered.filter(a => !a.isCorrect && a.question.difficulty === 2).length;
    const hardWrong = domainAnswered.filter(a => !a.isCorrect && a.question.difficulty === 3).length;

    let weaknessText = '';
    if (pct !== null && pct < 70) {
      const weakTopics = Object.entries(topicMap)
        .filter(([, v]) => v.total >= 2 && v.correct / v.total < 0.5)
        .map(([k]) => k);
      if (weakTopics.length > 0) {
        weaknessText = `特に「${weakTopics.join('」「')}」の理解強化が必要です。`;
      } else if (easyWrong >= 2) {
        weaknessText = '基礎概念の理解を固めることが先決です。用語テストモードで確認しましょう。';
      } else if (medWrong > hardWrong) {
        weaknessText = '実践的な状況判断が課題です。シナリオ問題で「最初にすべきこと」を意識して練習しましょう。';
      } else {
        weaknessText = '複合的なシナリオへの対応力強化が必要です。管理職視点での意思決定を練習しましょう。';
      }
    }

    return { d, i, domainAnswered, domainCorrect, pct, topicMap, weaknessText };
  });

  // 強い・弱いドメインの特定
  const analyzed = domainAnalysis.filter(da => da.pct !== null);
  const weakDomains = analyzed.filter(da => da.pct < 60).sort((a, b) => a.pct - b.pct);
  const strongDomains = analyzed.filter(da => da.pct >= 80).sort((a, b) => b.pct - a.pct);
  const best = analyzed.sort((a, b) => b.pct - a.pct)[0];
  const worst = [...analyzed].sort((a, b) => a.pct - b.pct)[0];

  // 総評生成
  let souhyou = '';
  const total = session.answered.length;
  const correct = session.answered.filter(a => a.isCorrect).length;
  const accuracy = Math.round((correct / total) * 100);

  if (score >= 800) {
    souhyou = `非常に優秀な結果です（推定スコア ${score}点、正答率 ${accuracy}%）。CISSP試験の本番でも十分に合格が期待できるレベルです。`;
    if (strongDomains.length > 0) {
      souhyou += `特に${strongDomains.slice(0, 2).map(da => `Domain ${da.d.domain}（${da.d.domainName}）`).join('、')}は高い習熟度を示しています。`;
    }
    if (weakDomains.length > 0) {
      souhyou += `さらなる向上のため、${weakDomains.map(da => `Domain ${da.d.domain}`).join('・')}の復習を推奨します。`;
    } else {
      souhyou += '全ドメインで合格水準を超えており、バランスの取れた知識を持っています。';
    }
  } else if (score >= 700) {
    souhyou = `合格圏内の成績です（推定スコア ${score}点、正答率 ${accuracy}%）。`;
    if (best) souhyou += `${best.d.domainName}が最も得意なドメインです（${best.pct}%）。`;
    if (weakDomains.length > 0) {
      souhyou += `合格を確実にするため、${weakDomains.slice(0, 3).map(da => `Domain ${da.d.domain}（${da.d.domainName}）`).join('、')}の重点学習を推奨します。`;
    }
    souhyou += 'マネジメント視点の問題を意識的に練習することで、さらにスコアが安定します。';
  } else if (score >= 550) {
    souhyou = `あと一歩で合格圏内です（推定スコア ${score}点、正答率 ${accuracy}%）。`;
    if (weakDomains.length > 0) {
      souhyou += `特に${weakDomains.slice(0, 3).map(da => `Domain ${da.d.domain}（${da.d.domainName}）`).join('・')}での得点向上が合格への鍵です。`;
    }
    souhyou += 'CISSPは「最初に何をすべきか」「最も適切な対応は」という管理職視点の判断力が試されます。技術的な正しさより、ビジネスリスクと組織ガバナンスを優先する考え方を身につけましょう。';
  } else {
    souhyou = `基礎の強化が必要な段階です（推定スコア ${score}点、正答率 ${accuracy}%）。焦らず、ドメインごとに体系的に学習しましょう。`;
    if (worst) souhyou += `特にDomain ${worst.d.domain}（${worst.d.domainName}）を優先的に取り組むことを推奨します。`;
    souhyou += '用語テストモードで基礎用語を固めた後、ドメイン別練習でシナリオ型問題に取り組むと効果的です。';
  }

  return { domainAnalysis, souhyou };
}

// ===== 統計管理（localStorage）=====
function loadStats() {
  const raw = localStorage.getItem('cissp_stats');
  const empty = { practice: { domains: {} }, exam: { domains: {} } };
  if (!raw) return empty;
  try {
    const data = JSON.parse(raw);
    // 旧フォーマット（domains直下）をpracticeに移行
    if (data.domains && !data.practice) return { practice: { domains: data.domains }, exam: { domains: {} } };
    return { ...empty, ...data };
  } catch { return empty; }
}

function saveAnswerToStats(domainIndex, isCorrect, mode) {
  if (mode === 'terms') return; // 用語テストは記録しない
  if (mode === 'cat' && !session.isExamMode) return; // 学習モードは記録しない
  const bucket = mode === 'cat' ? 'exam' : 'practice';
  const stats = loadStats();
  if (!stats[bucket]) stats[bucket] = { domains: {} };
  if (!stats[bucket].domains[domainIndex]) stats[bucket].domains[domainIndex] = { correct: 0, total: 0 };
  stats[bucket].domains[domainIndex].total++;
  if (isCorrect) stats[bucket].domains[domainIndex].correct++;
  localStorage.setItem('cissp_stats', JSON.stringify(stats));
}

function loadExamHistory() {
  try { return JSON.parse(localStorage.getItem('cissp_exam_history')) || []; }
  catch { return []; }
}

function saveExamHistory(snapshot) {
  const history = loadExamHistory();
  history.unshift(snapshot);
  if (history.length > 3) history.length = 3;
  localStorage.setItem('cissp_exam_history', JSON.stringify(history));
}

// ===== ユーティリティ =====
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
  if (name !== 'question') {
    document.body.classList.remove('mode-terms');
    document.body.classList.remove('mode-exam');
  }
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

// ===== テーマ管理 =====
const THEMES = ['dark', 'light', 'auto'];
const THEME_LABELS = { dark: '🌙', light: '☀️', auto: '🌓' };

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('cissp_theme', theme);
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.textContent = THEME_LABELS[theme];
    btn.title = theme === 'dark' ? 'ダークモード' : theme === 'light' ? 'ライトモード' : 'ブラウザデフォルト';
  });
}

function cycleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
  applyTheme(next);
}

function initTheme() {
  const saved = localStorage.getItem('cissp_theme') || 'dark';
  applyTheme(saved);
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', cycleTheme);
  });
}

// ===== 起動 =====
document.addEventListener('DOMContentLoaded', () => { initTheme(); init(); });
