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

// 10:00 JST に実行
function postQuestion() {
  if (isSkipDay()) {
    console.log('土日祝のためスキップ');
    return;
  }
  const q = getTodaysQuestion();
  postToSlack(buildQuestionBlocks(q));
  console.log('問題投稿完了: ' + q.id);
}

// 18:00 JST に実行
function postAnswer() {
  if (isSkipDay()) {
    console.log('土日祝のためスキップ');
    return;
  }
  const q = getTodaysQuestion();
  postToSlack(buildAnswerBlocks(q));
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

// ---- 今日の問題を取得 ----
function getTodaysQuestion() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'questions_' + getTodayStr();
  const cached = cache.get(cacheKey);

  let allQuestions;
  if (cached) {
    allQuestions = JSON.parse(cached);
  } else {
    allQuestions = [];
    for (let i = 1; i <= 8; i++) {
      const res = UrlFetchApp.fetch(GITHUB_RAW_BASE + 'domain' + i + '.json');
      const data = JSON.parse(res.getContentText());
      data.questions.forEach(q => allQuestions.push(Object.assign({}, q, { domainName: data.domainName })));
    }
    // 最大6時間キャッシュ
    cache.put(cacheKey, JSON.stringify(allQuestions), 21600);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayIndex = Math.floor((today - EPOCH) / 86400000);
  return allQuestions[dayIndex % allQuestions.length];
}

// ---- Slackブロック生成 ----
function buildQuestionBlocks(q) {
  const diffLabel = ['', '⭐ Easy', '⭐⭐ Medium', '⭐⭐⭐ Hard'][q.difficulty];
  return {
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '📚 今日のCISSP一問 (' + getTodayStr() + ')' } },
      { type: 'section', text: { type: 'mrkdwn', text: '*ドメイン:* ' + q.domainName + '　*難易度:* ' + diffLabel + '\n*トピック:* ' + q.topic } },
      { type: 'divider' },
      { type: 'section', text: { type: 'mrkdwn', text: '*Q. ' + q.question + '*' } },
      { type: 'section', text: { type: 'mrkdwn', text: q.options.map(o => '• ' + o).join('\n') } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: '💡 解答は18:00に投稿されます' }] }
    ]
  };
}

function buildAnswerBlocks(q) {
  const correct = q.options[q.answer];
  // explanationの不正解セクション区切り文字をSlack用に変換
  const explanation = q.explanation.replace('━━ 不正解の選択肢について ━━', '━━ 不正解の選択肢について ━━');
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
