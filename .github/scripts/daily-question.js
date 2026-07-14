#!/usr/bin/env node
// 使い方: node daily-question.js [question|answer]
'use strict';

const fs = require('fs');
const https = require('https');
const { URL } = require('url');
const holidayJp = require('@holiday-jp/holiday_jp');

const mode = process.argv[2] || 'question';
const webhookUrl = process.env.SLACK_WEBHOOK_URL;

if (!webhookUrl) {
  console.error('SLACK_WEBHOOK_URL が未設定です');
  process.exit(1);
}

// 祝日チェック（JST基準）
const todayJst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
if (holidayJp.isHoliday(todayJst)) {
  const name = holidayJp.between(todayJst, todayJst)[0]?.name || '祝日';
  console.log(`祝日のためスキップ: ${name}`);
  process.exit(0);
}

// fix-domain1.json〜fix-domain8.json から全問題ロード
const allQuestions = [];
for (let i = 1; i <= 8; i++) {
  const raw = JSON.parse(fs.readFileSync(`questions/fix-domain${i}.json`, 'utf8'));
  raw.questions.forEach(q => allQuestions.push({ ...q, domainName: raw.domainName }));
}

// 日付ベースで今日の問題を決定（基準日: 2024-01-01）
const EPOCH = new Date('2024-01-01T00:00:00Z');
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const dayIndex = Math.floor((today - EPOCH) / 86400000);

// dayIndexをシードにした疑似ランダムでシャッフル（毎日同じ順序が再現できる）
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

// 1日ごとにEasy→Medium→Hardをローテーション
// OFFSET=252 は 2026-05-25 の問題を変えないための調整値
const OFFSET = 252;
const diffGroups = [
  shuffle(allQuestions.filter(q => q.difficulty === 1), 20240101),
  shuffle(allQuestions.filter(q => q.difficulty === 2), 20240101),
  shuffle(allQuestions.filter(q => q.difficulty === 3), 20240101),
];
const eff = dayIndex + OFFSET;
const group = diffGroups[eff % 3];
const q = group[Math.floor(eff / 3) % group.length];

console.log(`mode: ${mode}, dayIndex: ${dayIndex}, question: ${q.id}`);

const blocks = mode === 'question' ? buildQuestionBlocks(q) : buildAnswerBlocks(q);
postToSlack({ blocks });

// dayIndexをシードに選択肢をシャッフルし、問題・解答で同じ順序を再現する
function shuffleOptionsSeeded(q, seed) {
  // q.idのハッシュを混ぜることで、同じ問題が再出題された日も並びが変わる
  const idHash = q.id.split('').reduce((acc, c) => Math.imul(acc, 31) + c.charCodeAt(0) | 0, 0);
  const rng = seededRandom(seed ^ idHash);
  const indices = q.options.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.floor(rng() * (i + 1)));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const labels = ['A', 'B', 'C', 'D'];
  const shuffledOptions = indices.map((orig, pos) => `${labels[pos]}. ${q.options[orig].slice(3)}`);
  const shuffledAnswer = indices.indexOf(q.answer);
  return { shuffledOptions, shuffledAnswer };
}

function buildQuestionBlocks(q) {
  const diffLabel = ['', '⭐ Easy', '⭐⭐ Medium', '⭐⭐⭐ Hard'][q.difficulty];
  const { shuffledOptions } = shuffleOptionsSeeded(q, dayIndex);
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `📚 今日のCISSP一問 (${formatDate(today)})` }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*ドメイン:* ${q.domainName}　*難易度:* ${diffLabel}\n*トピック:* ${q.topic}`
      }
    },
    { type: 'divider' },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Q. ${q.question}*` }
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: shuffledOptions.map(o => `• ${o}`).join('\n') }
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: '💡 解答は18:00に投稿されます' }]
    }
  ];
}

function buildAnswerBlocks(q) {
  const { shuffledOptions, shuffledAnswer } = shuffleOptionsSeeded(q, dayIndex);
  const correct = shuffledOptions[shuffledAnswer];
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `✅ 今日の解答 (${formatDate(today)})` }
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*正解: ${correct}*` }
    },
    { type: 'divider' },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `📖 *解説*\n${q.explanation}` }
    }
  ];
}

function formatDate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

function postToSlack(payload) {
  const parsed = new URL(webhookUrl);
  const body = JSON.stringify(payload);

  const options = {
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const req = https.request(options, res => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('Slack投稿成功');
      } else {
        console.error(`Slack投稿失敗: ${res.statusCode} ${data}`);
        process.exit(1);
      }
    });
  });

  req.on('error', err => {
    console.error(`リクエストエラー: ${err.message}`);
    process.exit(1);
  });

  req.write(body);
  req.end();
}
