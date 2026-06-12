// ============================================================
// CISSP 今日の一問 - Google Apps Script版
// ============================================================
// セットアップ手順:
// 1. https://script.google.com で新規プロジェクト作成
// 2. このコードを貼り付け
// 3. 「プロジェクトの設定」→「スクリプト プロパティ」に追加:
//    SLACK_WEBHOOK_URL = https://hooks.slack.com/services/...
// 4. 下部「トリガーの設定方法」を参照してトリガーを2つ追加
// ============================================================

const SLACK_WEBHOOK_URL_KEY = 'SLACK_WEBHOOK_URL';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/ak69143/cissp-cat-test/main/questions/';
const EPOCH = new Date('2024-01-01T00:00:00+09:00');

// OFFSET=2 は 2026-05-27 をEasyとして開始するための調整値（dayIndex=877, eff=879, 879%3=0）
const OFFSET = 2;

// 10:00 JST に実行
function postQuestion() {
  if (isSkipDay()) {
    console.log('土日祝のためスキップ');
    return;
  }
  const { q, dayIndex } = getTodaysQuestion();
  postToSlack(buildQuestionBlocks(q, dayIndex));
  console.log('問題投稿完了: ' + q.id);
}

// 18:00 JST に実行
function postAnswer() {
  if (isSkipDay()) {
    console.log('土日祝のためスキップ');
    return;
  }
  const { q, dayIndex } = getTodaysQuestion();
  postToSlack(buildAnswerBlocks(q, dayIndex));
  console.log('解答投稿完了: ' + q.id);
}

// ---- 祝日・土日チェック ----
function isSkipDay() {
  const today = new Date();
  const day = today.getDay(); // 0=日, 6=土
  if (day === 0 || day === 6) return true;

  // Google Calendar の日本の祝日カレンダーで判定
  try {
    const cal = CalendarApp.getCalendarById('ja.japanese#holiday@group.v.calendar.google.com');
    const events = cal.getEventsForDay(today);
    if (events.length > 0) {
      console.log('祝日: ' + events[0].getTitle());
      return true;
    }
  } catch (e) {
    console.log('祝日カレンダー取得失敗（スキップしない）: ' + e);
  }
  return false;
}

// ---- 今日の問題を取得（Easy→Medium→Hardローテーション） ----
function getTodaysQuestion() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayIndex = Math.floor((today - EPOCH) / 86400000);

  // 1問だけキャッシュ（全問キャッシュはCacheService 100KB制限を超える）
  const cache = CacheService.getScriptCache();
  const cacheKey = 'question_v2_' + getTodayStr();
  const cached = cache.get(cacheKey);
  if (cached) return { q: JSON.parse(cached), dayIndex };

  const allQuestions = [];
  for (let i = 1; i <= 8; i++) {
    const res = UrlFetchApp.fetch(GITHUB_RAW_BASE + 'domain' + i + '.json');
    const data = JSON.parse(res.getContentText());
    data.questions.forEach(q => allQuestions.push(Object.assign({}, q, { domainName: data.domainName })));
  }

  // 1日ごとにEasy→Medium→Hardをローテーション
  const diffGroups = [
    shuffle(allQuestions.filter(q => q.difficulty === 1), 20240101),
    shuffle(allQuestions.filter(q => q.difficulty === 2), 20240101),
    shuffle(allQuestions.filter(q => q.difficulty === 3), 20240101),
  ];
  const eff = dayIndex + OFFSET;
  const group = diffGroups[eff % 3];
  const q = group[Math.floor(eff / 3) % group.length];

  cache.put(cacheKey, JSON.stringify(q), 21600);
  return { q, dayIndex };
}

// ---- 疑似乱数生成（シード付き） ----
function seededRandom(seed) {
  let s = seed ^ 0xdeadbeef;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0x100000000;
  };
}

function shuffle(arr, seed) {
  const rng = seededRandom(seed);
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// dayIndexをシードに選択肢をシャッフルし、問題・解答で同じ順序を再現する
function shuffleOptionsSeeded(q, dayIndex) {
  // q.idのハッシュを混ぜることで、同じ問題が再出題された日も並びが変わる
  const idHash = q.id.split('').reduce((acc, c) => Math.imul(acc, 31) + c.charCodeAt(0) | 0, 0);
  const rng = seededRandom(dayIndex ^ idHash);
  const indices = q.options.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const labels = ['A', 'B', 'C', 'D'];
  const shuffledOptions = indices.map((orig, pos) => `${labels[pos]}. ${q.options[orig].slice(3)}`);
  const shuffledAnswer = indices.indexOf(q.answer);
  return { shuffledOptions, shuffledAnswer, indices };
}

// 解説内の選択肢ラベル（A/B/C/D）をシャッフル後のラベルに置き換え、A→B→C→D順に並べ直す
function remapExplanationLabels(explanation, indices) {
  const labels = ['A', 'B', 'C', 'D'];
  const origToNew = {};
  indices.forEach((origPos, newPos) => { origToNew[labels[origPos]] = labels[newPos]; });

  // 行頭の "X. " を新ラベルに置換
  const remapped = explanation.replace(/^([A-D])\. /gm, (_, label) => (origToNew[label] || label) + '. ');

  // 「不正解の選択肢について」セクション以降の行をA→D順にソート
  const sep = '━━ 不正解の選択肢について ━━';
  const sepIdx = remapped.indexOf(sep);
  if (sepIdx === -1) return remapped;

  const header = remapped.slice(0, sepIdx + sep.length);
  const rest = remapped.slice(sepIdx + sep.length);
  const lines = rest.split('\n');
  const optionLines = lines.filter(l => /^[A-D]\. /.test(l)).sort();
  let optIdx = 0;
  const sorted = lines.map(l => /^[A-D]\. /.test(l) ? optionLines[optIdx++] : l);
  return header + sorted.join('\n');
}

// ---- Slackブロック生成 ----
function buildQuestionBlocks(q, dayIndex) {
  const diffLabel = ['', '⭐ Easy', '⭐⭐ Medium', '⭐⭐⭐ Hard'][q.difficulty];
  const { shuffledOptions } = shuffleOptionsSeeded(q, dayIndex);
  return {
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '📚 今日のCISSP一問 (' + getTodayStr() + ')' } },
      { type: 'section', text: { type: 'mrkdwn', text: '*ドメイン:* ' + q.domainName + '　*難易度:* ' + diffLabel + '\n*トピック:* ' + q.topic } },
      { type: 'divider' },
      { type: 'section', text: { type: 'mrkdwn', text: '*Q. ' + q.question + '*' } },
      { type: 'section', text: { type: 'mrkdwn', text: shuffledOptions.map(o => '• ' + o).join('\n') } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: '💡 解答は18:00に投稿されます' }] }
    ]
  };
}

function buildAnswerBlocks(q, dayIndex) {
  const { shuffledOptions, shuffledAnswer, indices } = shuffleOptionsSeeded(q, dayIndex);
  const correct = shuffledOptions[shuffledAnswer];
  const explanation = remapExplanationLabels(q.explanation, indices);
  return {
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '✅ 今日の解答 (' + getTodayStr() + ')' } },
      { type: 'section', text: { type: 'mrkdwn', text: '*正解: ' + correct + '*' } },
      { type: 'divider' },
      { type: 'section', text: { type: 'mrkdwn', text: '📖 *解説*\n' + explanation } }
    ]
  };
}

// ---- Slack投稿 ----
function postToSlack(payload) {
  const webhookUrl = PropertiesService.getScriptProperties().getProperty(SLACK_WEBHOOK_URL_KEY);
  if (!webhookUrl) throw new Error('SLACK_WEBHOOK_URL が未設定');

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };
  const res = UrlFetchApp.fetch(webhookUrl, options);
  if (res.getResponseCode() !== 200) {
    throw new Error('Slack投稿失敗: ' + res.getContentText());
  }
}

// ---- ユーティリティ ----
function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '/' + m + '/' + day;
}

// ============================================================
// トリガーの設定方法（手動設定が必要）
//
// GASエディタ左メニュー「トリガー（時計アイコン）」→「トリガーを追加」
//
// [問題投稿]
//   実行する関数: postQuestion
//   イベントのソース: 時間主導型
//   時間ベースのトリガーのタイプ: 日タイマー
//   時刻: 午前10時〜11時
//   タイムゾーン: (GMT+09:00) アジア/東京
//
// [解答投稿]
//   実行する関数: postAnswer
//   イベントのソース: 時間主導型
//   時間ベースのトリガーのタイプ: 日タイマー
//   時刻: 午後6時〜7時
//   タイムゾーン: (GMT+09:00) アジア/東京
// ============================================================
