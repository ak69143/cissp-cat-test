'use strict';

// ===== 称号定義 =====
const TITLES = [
  { xp: 0,       title: 'セキュリティ候補生',         badges: [] },
  { xp: 3000,    title: 'リスク見習い',               badges: [] },
  { xp: 9000,    title: '脆弱性ハンター',             badges: [] },
  { xp: 20000,   title: 'コントロール実践者',         badges: [] },
  { xp: 40000,   title: 'インシデント対応者',         badges: [] },
  { xp: 70000,   title: 'コンプライアンス担当',       badges: [] },
  { xp: 110000,  title: 'セキュリティスペシャリスト', badges: [] },
  { xp: 160000,  title: 'ドメインマスター',           badges: [] },
  { xp: 230000,  title: '準CISSP',                    badges: ['exam-pass'] },
  { xp: 320000,  title: '認定アーキテクト',           badges: ['all-domains'] },
  { xp: 430000,  title: 'ISC² エキスパート',          badges: ['exam-master', 'all-domains'] },
  { xp: 570000,  title: 'CISSPマスター',              badges: ['exam-triple', 'correct-1000', 'all-domains'] },
  { xp: 750000,  title: 'セキュリティの賢者',         badges: ['streak-30days', '_habit2'] },
  { xp: 1000000, title: '伝説のCISSP',                badges: ['first-exam', 'exam-pass', 'exam-master', 'exam-triple', 'exam-brutal', 'streak-30days'] },
];

// ===== バッジ定義 =====
const BADGE_DEFS = [
  // 学習系（六角形・青）
  { id: 'first-correct',   name: 'First Step',    category: 'study',  shape: 'hex',    condition: '初めて正解する' },
  { id: 'correct-100',     name: '勉強家',         category: 'study',  shape: 'hex',    condition: '累計100問正解' },
  { id: 'correct-500',     name: '熱心な学習者',   category: 'study',  shape: 'hex',    condition: '累計500問正解' },
  { id: 'correct-1000',    name: '千問突破',       category: 'study',  shape: 'hex',    condition: '累計1000問正解' },
  { id: 'streak-5',        name: '5連続正解',      category: 'study',  shape: 'hex',    condition: '5問連続正解' },
  { id: 'streak-10',       name: '10連続正解',     category: 'study',  shape: 'hex',    condition: '10問連続正解' },
  { id: 'perfect-session', name: 'パーフェクト',   category: 'study',  shape: 'hex',    condition: '10問以上で全問正解' },
  // 試験系（盾形・金）
  { id: 'first-exam',      name: '初陣',           category: 'exam',   shape: 'shield', condition: '模擬試験を初完走' },
  { id: 'exam-pass',       name: '合格突破',       category: 'exam',   shape: 'shield', condition: '模擬試験700点以上' },
  { id: 'exam-master',     name: 'マスタースコア', category: 'exam',   shape: 'shield', condition: '模擬試験800点以上' },
  { id: 'exam-triple',     name: '三連覇',         category: 'exam',   shape: 'shield', condition: '3回連続合格' },
  { id: 'exam-brutal',     name: '最後まで戦った', category: 'exam',   shape: 'shield', condition: 'BRUTAL KILL到達' },
  // ドメイン系（円形・ドメインカラー）
  { id: 'domain-1', name: 'D1マスター', category: 'domain', shape: 'circle', condition: 'D1を70%以上（20問以上）', domainIdx: 0 },
  { id: 'domain-2', name: 'D2マスター', category: 'domain', shape: 'circle', condition: 'D2を70%以上（20問以上）', domainIdx: 1 },
  { id: 'domain-3', name: 'D3マスター', category: 'domain', shape: 'circle', condition: 'D3を70%以上（20問以上）', domainIdx: 2 },
  { id: 'domain-4', name: 'D4マスター', category: 'domain', shape: 'circle', condition: 'D4を70%以上（20問以上）', domainIdx: 3 },
  { id: 'domain-5', name: 'D5マスター', category: 'domain', shape: 'circle', condition: 'D5を70%以上（20問以上）', domainIdx: 4 },
  { id: 'domain-6', name: 'D6マスター', category: 'domain', shape: 'circle', condition: 'D6を70%以上（20問以上）', domainIdx: 5 },
  { id: 'domain-7', name: 'D7マスター', category: 'domain', shape: 'circle', condition: 'D7を70%以上（20問以上）', domainIdx: 6 },
  { id: 'domain-8', name: 'D8マスター', category: 'domain', shape: 'circle', condition: 'D8を70%以上（20問以上）', domainIdx: 7 },
  { id: 'all-domains',     name: '全ドメイン制覇', category: 'domain', shape: 'circle', condition: '全8ドメイン70%以上' },
  // 習慣系（星形・緑）
  { id: 'night-owl',       name: '夜型学習者',     category: 'habit',  shape: 'star',     condition: '22時〜3時の間に学習' },
  { id: 'early-bird',      name: '早起き学習者',   category: 'habit',  shape: 'star',     condition: '5時〜8時の間に学習' },
  { id: 'streak-7days',    name: '7日連続',         category: 'habit',  shape: 'star',     condition: '7日連続アクセス' },
  { id: 'streak-30days',   name: '1ヶ月皆勤',      category: 'habit',  shape: 'star',     condition: '30日連続アクセス' },
  { id: 'streak-50days',   name: '50日連続',        category: 'habit',  shape: 'star',     condition: '50日連続アクセス' },
  { id: 'streak-100days',  name: '100日連続',       category: 'habit',  shape: 'star',     condition: '100日連続アクセス' },
  { id: 'streak-200days',  name: '200日連続',       category: 'habit',  shape: 'star',     condition: '200日連続アクセス' },
  { id: 'streak-365days',  name: '1年皆勤',         category: 'habit',  shape: 'star',     condition: '365日連続アクセス' },
  // 用語系（六角形・紫）
  { id: 'terms-first',     name: '用語初制覇',     category: 'terms',  shape: 'hex-terms', condition: '用語テストで初めて正解' },
  { id: 'terms-100',       name: '用語100選',      category: 'terms',  shape: 'hex-terms', condition: '用語テスト累計100問正解' },
  { id: 'terms-500',       name: '用語500選',      category: 'terms',  shape: 'hex-terms', condition: '用語テスト累計500問正解' },
  { id: 'terms-perfect',   name: '用語パーフェクト', category: 'terms', shape: 'hex-terms', condition: '用語テスト全問正解（10問以上）' },
];

const HABIT_BADGE_IDS = ['night-owl', 'early-bird', 'streak-7days', 'streak-30days'];

const DOMAIN_COLORS_G = ['#4f8ef7','#2ecc71','#9b59b6','#e67e22','#1abc9c','#e74c3c','#3498db','#f39c12'];

const XP_RULES = {
  practiceCorrect: 10,
  practiceWrong:   2,
  examCorrect:     15,
  examWrong:       3,
  hardBonus:       5,
  termsCorrect:    1,
  termsWrong:      0,
  examCompletion:  50,
  examPass:        150,
  streak5Bonus:    20,  // every multiple of 5
  streak10Bonus:   50,  // every multiple of 10
};

const GAMIF_KEY = 'cissp_gamification';

// ===== データ管理 =====
function loadGamif() {
  try {
    const raw = localStorage.getItem(GAMIF_KEY);
    if (!raw) return _defaultGamif();
    const data = JSON.parse(raw);
    return _mergeDefaults(data);
  } catch { return _defaultGamif(); }
}

function _defaultGamif() {
  const badges = {};
  BADGE_DEFS.forEach(b => { badges[b.id] = { earned: false }; });
  return {
    xp: 0,
    title: 'セキュリティ候補生',
    badges,
    stats: { totalCorrect: 0, totalAnswered: 0, correctStreak: 0, maxCorrectStreak: 0, sessionsCompleted: 0, examsPassed: 0, consecutiveExamsPassed: 0, termsCorrect: 0 },
    streak: { current: 0, max: 0, lastDate: '' },
  };
}

function _mergeDefaults(data) {
  const def = _defaultGamif();
  data.stats = { ...def.stats, ...data.stats };
  data.streak = { ...def.streak, ...data.streak };
  BADGE_DEFS.forEach(b => { if (!data.badges[b.id]) data.badges[b.id] = { earned: false }; });
  if (!data.title) data.title = def.title;
  return data;
}

function saveGamif(data) {
  localStorage.setItem(GAMIF_KEY, JSON.stringify(data));
}

function _loadCisspStats() {
  try {
    const raw = localStorage.getItem('cissp_stats');
    if (!raw) return { practice: { domains: {} }, exam: { domains: {} } };
    const d = JSON.parse(raw);
    if (d.domains && !d.practice) return { practice: { domains: d.domains }, exam: { domains: {} } };
    return { practice: { domains: {} }, exam: { domains: {} }, ...d };
  } catch { return { practice: { domains: {} }, exam: { domains: {} } }; }
}

function _getDomainCombined(domainIdx) {
  const s = _loadCisspStats();
  const p = s.practice?.domains?.[domainIdx] || { correct: 0, total: 0 };
  const e = s.exam?.domains?.[domainIdx] || { correct: 0, total: 0 };
  return { correct: p.correct + e.correct, total: p.total + e.total };
}

// ===== 称号ロジック =====
function getCurrentTitle(xp, badges) {
  let result = TITLES[0];
  for (const t of TITLES) {
    if (xp < t.xp) break;
    if (_badgesMet(t.badges, badges)) result = t;
  }
  return result;
}

function _badgesMet(required, badges) {
  return required.every(b => {
    if (b === '_habit2') {
      return HABIT_BADGE_IDS.filter(id => badges[id]?.earned).length >= 2;
    }
    return badges[b]?.earned;
  });
}

function getNextTitleInfo(data) {
  const idx = TITLES.findIndex(t => t.title === data.title);
  if (idx === -1 || idx === TITLES.length - 1) return null;
  const next = TITLES[idx + 1];
  const xpNeeded = Math.max(0, next.xp - data.xp);
  const missingBadges = next.badges.filter(b => {
    if (b === '_habit2') {
      return HABIT_BADGE_IDS.filter(id => data.badges[id]?.earned).length < 2;
    }
    return !data.badges[b]?.earned;
  });
  return { next, xpNeeded, missingBadges };
}

// ===== バッジロジック =====
function checkAndAwardBadges(data, ctx) {
  const newBadges = [];
  const { isCorrect, q, session } = ctx || {};

  function award(id) {
    if (data.badges[id]?.earned) return;
    data.badges[id] = { earned: true, date: new Date().toISOString() };
    newBadges.push(id);
  }

  function check(id, cond) { if (cond) award(id); }

  // 答えレベルバッジ
  if (isCorrect !== undefined) {
    check('first-correct', isCorrect);
    check('correct-100',   data.stats.totalCorrect >= 100);
    check('correct-500',   data.stats.totalCorrect >= 500);
    check('correct-1000',  data.stats.totalCorrect >= 1000);
    check('streak-5',      data.stats.correctStreak >= 5);
    check('streak-10',     data.stats.correctStreak >= 10);

    const h = new Date().getHours();
    check('night-owl',  h >= 22 || h < 3);
    check('early-bird', h >= 5 && h < 8);

    // 用語系バッジ
    if (session?.mode === 'terms' && isCorrect) {
      check('terms-first', true);
      check('terms-100',   data.stats.termsCorrect >= 100);
      check('terms-500',   data.stats.termsCorrect >= 500);
    }
  }

  // ドメインバッジ（毎回チェック）
  for (let i = 0; i < 8; i++) {
    const d = _getDomainCombined(i);
    check(`domain-${i + 1}`, d.total >= 20 && d.correct / d.total >= 0.7);
  }
  const allMastered = Array.from({ length: 8 }, (_, i) => {
    const d = _getDomainCombined(i);
    return d.total >= 20 && d.correct / d.total >= 0.7;
  }).every(Boolean);
  check('all-domains', allMastered);

  // 連続日数バッジ
  check('streak-7days',   data.streak.current >= 7);
  check('streak-30days',  data.streak.current >= 30);
  check('streak-50days',  data.streak.current >= 50);
  check('streak-100days', data.streak.current >= 100);
  check('streak-200days', data.streak.current >= 200);
  check('streak-365days', data.streak.current >= 365);

  return newBadges;
}

function updateStreak() {
  const data = loadGamif();
  const today = new Date().toISOString().split('T')[0];
  if (data.streak.lastDate === today) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  data.streak.current = data.streak.lastDate === yesterday ? data.streak.current + 1 : 1;
  data.streak.max = Math.max(data.streak.max, data.streak.current);
  data.streak.lastDate = today;

  const newBadges = checkAndAwardBadges(data, {});
  const oldTitle = data.title;
  data.title = getCurrentTitle(data.xp, data.badges).title;
  saveGamif(data);

  newBadges.forEach((id, i) => setTimeout(() => showBadgeToast(id), i * 800));
  if (data.title !== oldTitle) setTimeout(() => showTitleUpModal(data.title), newBadges.length * 800 + 500);
}

// ===== SVGバッジ =====
function _symbol(id) {
  const s = {
    'first-correct':   `<path d="M26 42 L36 54 L54 30" stroke="white" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    'correct-100':     `<path d="M24 52 L24 30 C32 26 48 26 56 30 L56 52 C48 48 32 48 24 52 M40 29 L40 52" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    'correct-500':     `<path d="M40 20 C36 28 26 32 26 42 C26 52 32 58 40 58 C48 58 54 52 54 42 C54 32 44 28 40 20 Z M34 46 C34 50 38 53 40 53" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    'correct-1000':    `<path d="M20 60 L40 22 L60 60 M28 48 L52 48" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    'streak-5':        `<path d="M40 20 L34 40 L40 38 L34 60" stroke="white" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    'streak-10':       `<path d="M30 20 L24 40 L30 38 L24 60 M50 20 L44 40 L50 38 L44 60" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    'perfect-session': `<path d="M40 22 L44.9 36.2 L60 36.2 L47.6 44.8 L52.4 59 L40 50.4 L27.6 59 L32.4 44.8 L20 36.2 L35.1 36.2 Z" stroke="white" stroke-width="2.5" fill="rgba(255,255,255,0.2)" stroke-linecap="round" stroke-linejoin="round"/>`,
    'first-exam':      `<path d="M40 20 L42 34 L54 26 L44 38 L58 38 L44 42 L54 54 L40 44 L26 54 L36 42 L22 38 L36 38 L26 26 L38 34 Z" stroke="white" stroke-width="2" fill="rgba(255,255,255,0.15)" stroke-linecap="round" stroke-linejoin="round"/>`,
    'exam-pass':       `<path d="M24 36 C28 26 36 22 40 22 C44 22 52 26 56 36 M32 40 C30 46 32 52 36 56 C38 58 42 58 44 56 C48 52 50 46 48 40" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M34 42 L46 42 M40 36 L40 52" stroke="white" stroke-width="2" stroke-linecap="round"/>`,
    'exam-master':     `<path d="M40 22 L45 36 L60 36 L49 45 L53 59 L40 50 L27 59 L31 45 L20 36 L35 36 Z" stroke="white" stroke-width="2.5" fill="rgba(255,255,255,0.2)" stroke-linecap="round" stroke-linejoin="round"/>`,
    'exam-triple':     `<text x="40" y="53" text-anchor="middle" font-size="24" font-family="Georgia, serif" fill="white" font-weight="bold">Ⅲ</text>`,
    'exam-brutal':     `<path d="M30 22 L50 22 L44 36 L44 42 L36 42 L36 36 Z M36 42 L36 58 L44 58 L44 42" stroke="white" stroke-width="2.5" fill="rgba(255,255,255,0.15)" stroke-linecap="round" stroke-linejoin="round"/>`,
    'night-owl':       `<path d="M46 24 C36 26 28 34 28 44 C28 54 36 62 46 62 C50 62 54 60 57 57 C52 57 46 54 42 49 C38 44 38 36 42 30 C43 27 44 25 46 24 Z" stroke="white" stroke-width="2.5" fill="rgba(255,255,255,0.15)" stroke-linecap="round" stroke-linejoin="round"/>`,
    'early-bird':      `<circle cx="40" cy="42" r="9" stroke="white" stroke-width="2.5" fill="rgba(255,255,255,0.15)"/><path d="M40 26 L40 33 M55 32 L49 38 M25 32 L31 38 M58 42 L51 42 M29 42 L22 42 M55 52 L49 46" stroke="white" stroke-width="2" stroke-linecap="round"/>`,
    'streak-7days':    `<rect x="22" y="26" width="36" height="30" rx="3" stroke="white" stroke-width="2" fill="none"/><line x1="22" y1="34" x2="58" y2="34" stroke="white" stroke-width="2"/><line x1="32" y1="26" x2="32" y2="30" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="48" y1="26" x2="48" y2="30" stroke="white" stroke-width="2" stroke-linecap="round"/><text x="40" y="50" text-anchor="middle" font-size="12" fill="white" font-weight="bold">7</text>`,
    'streak-30days':   `<rect x="22" y="26" width="36" height="30" rx="3" stroke="white" stroke-width="2" fill="none"/><line x1="22" y1="34" x2="58" y2="34" stroke="white" stroke-width="2"/><line x1="32" y1="26" x2="32" y2="30" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="48" y1="26" x2="48" y2="30" stroke="white" stroke-width="2" stroke-linecap="round"/><text x="40" y="50" text-anchor="middle" font-size="11" fill="white" font-weight="bold">30</text>`,
    'streak-50days':   `<rect x="22" y="26" width="36" height="30" rx="3" stroke="white" stroke-width="2" fill="none"/><line x1="22" y1="34" x2="58" y2="34" stroke="white" stroke-width="2"/><line x1="32" y1="26" x2="32" y2="30" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="48" y1="26" x2="48" y2="30" stroke="white" stroke-width="2" stroke-linecap="round"/><text x="40" y="50" text-anchor="middle" font-size="11" fill="white" font-weight="bold">50</text>`,
    'streak-100days':  `<rect x="22" y="26" width="36" height="30" rx="3" stroke="white" stroke-width="2" fill="rgba(255,255,255,0.1)"/><line x1="22" y1="34" x2="58" y2="34" stroke="white" stroke-width="2"/><line x1="32" y1="26" x2="32" y2="30" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="48" y1="26" x2="48" y2="30" stroke="white" stroke-width="2" stroke-linecap="round"/><text x="40" y="50" text-anchor="middle" font-size="10" fill="white" font-weight="bold">100</text>`,
    'streak-200days':  `<rect x="22" y="26" width="36" height="30" rx="3" stroke="white" stroke-width="2" fill="rgba(255,255,255,0.15)"/><line x1="22" y1="34" x2="58" y2="34" stroke="white" stroke-width="2"/><line x1="32" y1="26" x2="32" y2="30" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="48" y1="26" x2="48" y2="30" stroke="white" stroke-width="2" stroke-linecap="round"/><text x="40" y="50" text-anchor="middle" font-size="10" fill="white" font-weight="bold">200</text>`,
    'streak-365days':  `<path d="M40 22 L44.9 36.2 L60 36.2 L47.6 44.8 L52.4 59 L40 50.4 L27.6 59 L32.4 44.8 L20 36.2 L35.1 36.2 Z" stroke="white" stroke-width="2" fill="rgba(255,255,255,0.2)" stroke-linecap="round" stroke-linejoin="round"/><text x="40" y="46" text-anchor="middle" font-size="8" fill="white" font-weight="bold">365</text>`,
    'all-domains':     `<path d="M40 22 L45 34 L58 34 L48 43 L52 56 L40 48 L28 56 L32 43 L22 34 L35 34 Z" stroke="white" stroke-width="2.5" fill="rgba(255,255,255,0.2)" stroke-linecap="round" stroke-linejoin="round"/>`,
    'terms-first':     `<text x="40" y="53" text-anchor="middle" font-size="28" font-family="serif" fill="white" font-weight="bold">T</text>`,
    'terms-100':       `<path d="M26 54 L26 30 C30 27 36 26 40 28 C44 26 50 27 54 30 L54 54 C50 51 44 50 40 52 C36 50 30 51 26 54 M40 28 L40 52 M30 34 L38 34 M30 38 L38 38 M30 42 L38 42" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    'terms-500':       `<text x="40" y="38" text-anchor="middle" font-size="13" fill="white" font-weight="bold">500</text><path d="M26 44 L54 44 M30 48 L50 48 M34 52 L46 52" stroke="white" stroke-width="2" stroke-linecap="round"/>`,
    'terms-perfect':   `<path d="M26 42 L36 54 L54 30" stroke="white" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 54 L26 32 C34 28 46 28 54 32 L54 54" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>`,
  };
  if (id.startsWith('domain-')) {
    const n = id.split('-')[1];
    return `<text x="40" y="44" text-anchor="middle" font-size="16" fill="white" font-weight="bold">D${n}</text><path d="M33 48 L33 44 Q33 40 40 40 Q47 40 47 44 L47 48 M30 48 L50 48 L50 55 Q50 57 48 57 L32 57 Q30 57 30 55 Z" stroke="white" stroke-width="1.5" fill="rgba(255,255,255,0.2)"/>`;
  }
  return s[id] || '';
}

function _hexLighten(hex, amt) {
  return `rgb(${Math.min(255,parseInt(hex.slice(1,3),16)+amt)},${Math.min(255,parseInt(hex.slice(3,5),16)+amt)},${Math.min(255,parseInt(hex.slice(5,7),16)+amt)})`;
}
function _hexDarken(hex, amt) {
  return `rgb(${Math.max(0,parseInt(hex.slice(1,3),16)-amt)},${Math.max(0,parseInt(hex.slice(3,5),16)-amt)},${Math.max(0,parseInt(hex.slice(5,7),16)-amt)})`;
}

function getBadgeSvg(id, earned, size = 56) {
  const def = BADGE_DEFS.find(b => b.id === id);
  if (!def) return '';
  const uid = id.replace(/[^a-z0-9]/g, '');

  let gradDef = '', shapeMain = '', shapeRing = '', shapeShine = '', glowColor = '#888', outerStroke = 'rgba(255,255,255,0.4)';

  if (def.shape === 'hex' || def.shape === 'hex-terms') {
    const isT = def.shape === 'hex-terms';
    const [c0, c1, c2] = isT ? ['#c084fc','#9333ea','#6d28d9'] : ['#93c5fd','#3b82f6','#4338ca'];
    glowColor = c1; outerStroke = c0;
    gradDef   = `<linearGradient id="g${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c0}"/><stop offset="50%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient>`;
    shapeMain = `<polygon points="40,4 72,22 72,58 40,76 8,58 8,22" fill="url(#g${uid})" stroke="${outerStroke}" stroke-width="1.5"/>`;
    shapeRing = `<polygon points="40,10 66,25 66,55 40,70 14,55 14,25" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>`;
    shapeShine= `<polygon points="40,4 72,22 72,58 40,76 8,58 8,22" fill="url(#sh${uid})"/>`;

  } else if (def.shape === 'shield') {
    glowColor = '#f59e0b'; outerStroke = '#fde68a';
    gradDef   = `<linearGradient id="g${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fde68a"/><stop offset="45%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#92400e"/></linearGradient>`;
    shapeMain = `<path d="M40 4 L72 16 L72 46 Q72 66 40 76 Q8 66 8 46 L8 16 Z" fill="url(#g${uid})" stroke="${outerStroke}" stroke-width="1.5"/>`;
    shapeRing = `<path d="M40 11 L65 21 L65 45 Q65 61 40 70 Q15 61 15 45 L15 21 Z" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>`;
    shapeShine= `<path d="M40 4 L72 16 L72 46 Q72 66 40 76 Q8 66 8 46 L8 16 Z" fill="url(#sh${uid})"/>`;

  } else if (def.shape === 'circle') {
    outerStroke = 'rgba(255,255,255,0.45)';
    if (def.id === 'all-domains') {
      glowColor = '#7c3aed';
      gradDef   = `<linearGradient id="g${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#c4b5fd"/><stop offset="50%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#3730a3"/></linearGradient>`;
    } else {
      const bc = DOMAIN_COLORS_G[def.domainIdx] || '#4f8ef7';
      glowColor = bc;
      gradDef   = `<radialGradient id="g${uid}" cx="38%" cy="32%" r="68%"><stop offset="0%" stop-color="${_hexLighten(bc,55)}"/><stop offset="50%" stop-color="${bc}"/><stop offset="100%" stop-color="${_hexDarken(bc,45)}"/></radialGradient>`;
    }
    shapeMain = `<circle cx="40" cy="40" r="36" fill="url(#g${uid})" stroke="${outerStroke}" stroke-width="1.5"/>`;
    shapeRing = `<circle cx="40" cy="40" r="30" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>`;
    shapeShine= `<circle cx="40" cy="40" r="36" fill="url(#sh${uid})"/>`;

  } else if (def.shape === 'star') {
    glowColor = '#10b981'; outerStroke = '#6ee7b7';
    gradDef   = `<linearGradient id="g${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6ee7b7"/><stop offset="50%" stop-color="#10b981"/><stop offset="100%" stop-color="#065f46"/></linearGradient>`;
    shapeMain = `<polygon points="40,4 48.8,27.9 74.2,28.9 54.3,44.6 61.2,69.1 40,55 18.8,69.1 25.7,44.6 5.8,28.9 31.2,27.9" fill="url(#g${uid})" stroke="${outerStroke}" stroke-width="1.5"/>`;
    shapeRing = `<polygon points="40,10.5 47.2,30.1 68.0,30.9 51.7,43.8 57.4,63.9 40,52.3 22.6,63.9 28.3,43.8 12.0,30.9 32.8,30.1" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>`;
    shapeShine= `<polygon points="40,4 48.8,27.9 74.2,28.9 54.3,44.6 61.2,69.1 40,55 18.8,69.1 25.7,44.6 5.8,28.9 31.2,27.9" fill="url(#sh${uid})"/>`;
  }

  const shineDef = `<linearGradient id="sh${uid}" x1="0.1" y1="0" x2="0.7" y2="1"><stop offset="0%" stop-color="white" stop-opacity="0.45"/><stop offset="40%" stop-color="white" stop-opacity="0.1"/><stop offset="100%" stop-color="white" stop-opacity="0"/></linearGradient>`;
  const glowDef  = earned ? `<filter id="gf${uid}" x="-35%" y="-35%" width="170%" height="170%"><feDropShadow dx="0" dy="1" stdDeviation="4" flood-color="${glowColor}" flood-opacity="0.65"/></filter>` : '';
  const filterA  = earned ? `filter="url(#gf${uid})"` : '';
  const grayA    = earned ? '' : ' style="filter:grayscale(1) opacity(0.28)"';
  const lock     = earned ? '' : `<path d="M34 44 L34 38 Q34 32 40 32 Q46 32 46 38 L46 44" stroke="rgba(255,255,255,0.6)" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="30" y="44" width="20" height="14" rx="3" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/><circle cx="40" cy="50" r="2.5" fill="rgba(255,255,255,0.7)"/>`;

  const inner = earned ? `${shapeRing}${shapeShine}${_symbol(id)}` : lock;
  return `<svg viewBox="0 0 80 80" width="${size}" height="${size}" overflow="visible" xmlns="http://www.w3.org/2000/svg"${grayA}><defs>${gradDef}${shineDef}${glowDef}</defs><g ${filterA}>${shapeMain}</g>${inner}</svg>`;
}

// ===== UI レンダリング =====
function renderGamifHome() {
  const section = document.getElementById('gamif-section');
  if (!section) return;
  const data = loadGamif();

  // 称号名
  document.getElementById('gamif-title-name').textContent = data.title;

  // XPバー
  const info = getNextTitleInfo(data);
  const barFill = document.getElementById('gamif-xp-bar-fill');
  const xpText  = document.getElementById('gamif-xp-text');
  if (info) {
    const rangeStart = TITLES.find(t => t.title === data.title)?.xp || 0;
    const rangeEnd   = info.next.xp;
    const pct = Math.min(100, Math.round(((data.xp - rangeStart) / (rangeEnd - rangeStart)) * 100));
    barFill.style.width = pct + '%';
    xpText.textContent  = _fmtXp(data.xp) + ' / ' + _fmtXp(rangeEnd) + ' XP';
  } else {
    barFill.style.width = '100%';
    xpText.textContent  = _fmtXp(data.xp) + ' XP（最高称号）';
  }

  // 次の称号ヒント
  const nextRow = document.getElementById('gamif-next-row');
  if (info) {
    const parts = [];
    if (info.xpNeeded > 0) parts.push(`あと ${_fmtXp(info.xpNeeded)} XP`);
    if (info.missingBadges.length > 0) {
      const names = info.missingBadges
        .filter(b => b !== '_habit2')
        .map(b => BADGE_DEFS.find(d => d.id === b)?.name || b);
      if (info.missingBadges.includes('_habit2')) names.push('習慣系バッジ2種');
      parts.push(`${names.join('・')}バッジが必要`);
    }
    nextRow.textContent = `次の称号「${info.next.title}」まで：${parts.join('、')}`;
    nextRow.style.display = '';
  } else {
    nextRow.style.display = 'none';
  }

  // ミニバッジ一覧（取得済み）
  const earnedDefs = BADGE_DEFS.filter(b => data.badges[b.id]?.earned);
  const badgesRow  = document.getElementById('gamif-badges-row');
  const MAX_MINI   = 8;
  let html = '';
  earnedDefs.slice(0, MAX_MINI).forEach(b => {
    html += `<span class="gamif-mini-badge" title="${b.name}">${getBadgeSvg(b.id, true, 36)}</span>`;
  });
  if (earnedDefs.length > MAX_MINI) {
    html += `<span class="gamif-mini-badge gamif-more">+${earnedDefs.length - MAX_MINI}</span>`;
  }
  if (earnedDefs.length === 0) {
    html = '<span class="gamif-no-badges">バッジをまだ持っていません</span>';
  }
  badgesRow.innerHTML = html;
}

function renderGamifResult(earnedXp, newBadges) {
  const section = document.getElementById('gamif-result-section');
  if (!section) return;
  section.style.display = '';

  const data = loadGamif();

  // XP獲得表示
  document.getElementById('gamif-result-xp').textContent = `+${_fmtXp(earnedXp)} XP 獲得！`;

  // XPバー（合計）
  const info = getNextTitleInfo(data);
  const barFill = document.getElementById('gamif-result-bar-fill');
  if (info) {
    const rangeStart = TITLES.find(t => t.title === data.title)?.xp || 0;
    const pct = Math.min(100, Math.round(((data.xp - rangeStart) / (info.next.xp - rangeStart)) * 100));
    barFill.style.width = '0%';
    setTimeout(() => { barFill.style.width = pct + '%'; }, 100);
  } else {
    barFill.style.width = '100%';
  }

  // 新バッジ
  const badgesEl = document.getElementById('gamif-result-badges');
  if (newBadges.length > 0) {
    badgesEl.innerHTML = newBadges.map(id => {
      const def = BADGE_DEFS.find(b => b.id === id);
      return `<div class="gamif-result-badge-item">${getBadgeSvg(id, true, 48)}<span>${def?.name || id}</span></div>`;
    }).join('');
    badgesEl.style.display = '';
  } else {
    badgesEl.style.display = 'none';
  }
}

function showTitleUpModal(newTitle) {
  const overlay = document.getElementById('titleup-modal-overlay');
  if (!overlay) return;
  document.getElementById('titleup-name').textContent = newTitle;
  overlay.classList.remove('hidden');
}

function showBadgeToast(id) {
  const def = BADGE_DEFS.find(b => b.id === id);
  if (!def) return;
  const toast = document.createElement('div');
  toast.className = 'badge-toast';
  toast.innerHTML = `${getBadgeSvg(id, true, 44)}<div class="badge-toast-text"><div class="badge-toast-title">バッジ獲得！</div><div class="badge-toast-name">${def.name}</div></div>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('badge-toast-show'), 50);
  setTimeout(() => {
    toast.classList.remove('badge-toast-show');
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}

function showBadgeCollection() {
  const overlay = document.getElementById('badge-collection-overlay');
  if (!overlay) return;
  const data    = loadGamif();
  const earned  = BADGE_DEFS.filter(b => data.badges[b.id]?.earned).length;
  document.getElementById('badge-collection-count').textContent = `取得済み: ${earned} / ${BADGE_DEFS.length}`;

  const body       = document.getElementById('badge-collection-body');
  const categories = [
    { key: 'study',  label: '学習系' },
    { key: 'exam',   label: '試験系' },
    { key: 'domain', label: 'ドメイン系' },
    { key: 'habit',  label: '習慣系' },
    { key: 'terms',  label: '用語系' },
  ];

  body.innerHTML = categories.map(cat => {
    const defs = BADGE_DEFS.filter(b => b.category === cat.key);
    const items = defs.map(def => {
      const isEarned = !!data.badges[def.id]?.earned;
      const dateStr  = isEarned ? new Date(data.badges[def.id].date).toLocaleDateString('ja-JP') : def.condition;
      const isNew    = isEarned && Date.now() - new Date(data.badges[def.id].date).getTime() < 90000;
      return `<div class="badge-col-item${isNew ? ' badge-col-new' : ''}">
        <div class="badge-col-svg">${getBadgeSvg(def.id, isEarned, 64)}</div>
        <div class="badge-col-name${isEarned ? '' : ' badge-col-locked'}">${def.name}</div>
        <div class="badge-col-cond">${dateStr}</div>
      </div>`;
    }).join('');
    return `<div class="badge-col-section"><div class="badge-col-label">${cat.label}</div><div class="badge-col-grid">${items}</div></div>`;
  }).join('');

  overlay.classList.remove('hidden');
}

function _fmtXp(n) {
  return n.toLocaleString('ja-JP');
}

// ===== App.js フック =====
let _sessionXpAccum = 0; // セッション中の累計XP（結果画面表示用）

function onAnswerGamif(isCorrect, q, sess) {
  if (!sess) return;
  const data = loadGamif();
  const isTerms   = sess.mode === 'terms';

  // 統計更新
  data.stats.totalAnswered++;
  if (isCorrect) {
    data.stats.totalCorrect++;
    data.stats.correctStreak++;
    data.stats.maxCorrectStreak = Math.max(data.stats.maxCorrectStreak, data.stats.correctStreak);
    if (isTerms) data.stats.termsCorrect++;
  } else {
    data.stats.correctStreak = 0;
  }

  // XP計算
  let xp = 0;
  const isExamMode = sess.mode === 'cat' && sess.isExamMode;
  if (isCorrect) {
    if (isTerms)         xp += XP_RULES.termsCorrect;
    else if (isExamMode) xp += XP_RULES.examCorrect;
    else                 xp += XP_RULES.practiceCorrect;
    if (!isTerms && q && q.difficulty === 3) xp += XP_RULES.hardBonus;
    if (data.stats.correctStreak % 5 === 0)  xp += XP_RULES.streak5Bonus;
    if (data.stats.correctStreak % 10 === 0) xp += XP_RULES.streak10Bonus;
  } else {
    xp += isTerms ? XP_RULES.termsWrong : isExamMode ? XP_RULES.examWrong : XP_RULES.practiceWrong;
  }
  data.xp += xp;
  _sessionXpAccum += xp;

  const newBadges = checkAndAwardBadges(data, { isCorrect, q, session: sess });
  const oldTitle  = data.title;
  data.title      = getCurrentTitle(data.xp, data.badges).title;
  saveGamif(data);

  newBadges.forEach((id, i) => setTimeout(() => showBadgeToast(id), i * 900 + 400));
  if (data.title !== oldTitle) setTimeout(() => showTitleUpModal(data.title), newBadges.length * 900 + 800);
}

function onResultGamif(sess, score, verdict) {
  if (!sess) return;
  const data = loadGamif();
  let xp = 0;

  const total   = sess.answered?.length || 0;
  const correct = sess.answered?.filter(a => a.isCorrect).length || 0;

  if (sess.mode === 'cat') {
    xp += XP_RULES.examCompletion;
    data.stats.sessionsCompleted++;
    if (score >= 700) {
      xp += XP_RULES.examPass;
      data.stats.examsPassed++;
      data.stats.consecutiveExamsPassed++;
    } else {
      data.stats.consecutiveExamsPassed = 0;
    }
  }
  data.xp += xp;

  // セッション合計XP（1問ずつ積んだ分＋完走ボーナス）
  const totalSessionXp = _sessionXpAccum + xp;
  _sessionXpAccum = 0;

  // バッジチェック（試験完了系）
  const newBadges = [];
  function awardR(id, cond) {
    if (!data.badges[id]?.earned && cond) {
      data.badges[id] = { earned: true, date: new Date().toISOString() };
      newBadges.push(id);
    }
  }

  if (sess.mode === 'cat') {
    awardR('first-exam',    true);
    awardR('exam-pass',     score >= 700);
    awardR('exam-master',   score >= 800);
    awardR('exam-triple',   data.stats.consecutiveExamsPassed >= 3);
    awardR('exam-brutal',   verdict === 'FAIL — BRUTAL');
  }
  awardR('perfect-session', sess.mode !== 'terms' && total >= 10 && correct === total);
  awardR('terms-perfect',  sess.mode === 'terms' && total >= 10 && correct === total);

  // ドメイン・連続日数バッジも再チェック
  const extraBadges = checkAndAwardBadges(data, {});
  newBadges.push(...extraBadges);

  const oldTitle = data.title;
  data.title     = getCurrentTitle(data.xp, data.badges).title;
  saveGamif(data);

  renderGamifResult(totalSessionXp, newBadges);

  newBadges.forEach((id, i) => setTimeout(() => showBadgeToast(id), i * 900 + 800));
  if (data.title !== oldTitle) setTimeout(() => showTitleUpModal(data.title), newBadges.length * 900 + 1200);
}

// ===== 初期化 =====
function _initGamification() {
  updateStreak();
  renderGamifHome();

  // コレクションモーダル
  document.getElementById('gamif-collection-btn')?.addEventListener('click', showBadgeCollection);
  document.getElementById('badge-collection-close')?.addEventListener('click', () => {
    document.getElementById('badge-collection-overlay').classList.add('hidden');
  });
  document.getElementById('badge-collection-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('badge-collection-overlay'))
      document.getElementById('badge-collection-overlay').classList.add('hidden');
  });

  // 称号アップモーダル
  document.getElementById('titleup-close')?.addEventListener('click', () => {
    document.getElementById('titleup-modal-overlay').classList.add('hidden');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initGamification);
} else {
  _initGamification();
}
