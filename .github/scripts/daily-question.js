#!/usr/bin/env node
// 使い方: node daily-question.js [question|answer]
'use strict';

const fs = require('fs');
const https = require('https');
const { URL } = require('url');

const mode = process.argv[2] || 'question';
const webhookUrl = process.env.SLACK_WEBHOOK_URL;

if (!webhookUrl) {
  console.error('SLACK_WEBHOOK_URL が未設定です');
  process.exit(1);
}

// domain1.json〜domain8.json から全問題ロード
const allQuestions = [];
for (let i = 1; i <= 8; i++) {
  const raw = JSON.parse(fs.readFileSync(`questions/domain${i}.json`, 'utf8'));
  raw.questions.forEach(q => allQuestions.push({ ...q, domainName: raw.domainName }));
}

// 日付ベースで今日の問題を決定（基準日: 2024-01-01）
const EPOCH = new Date('2024-01-01T00:00:00Z');
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const dayIndex = Math.floor((today - EPOCH) / 86400000);
const q = allQuestions[dayIndex % allQuestions.length];

console.log(`mode: ${mode}, dayIndex: ${dayIndex}, question: ${q.id}`);

const blocks = mode === 'question' ? buildQuestionBlocks(q) : buildAnswerBlocks(q);
postToSlack({ blocks });

function buildQuestionBlocks(q) {
  const diffLabel = ['', '⭐ Easy', '⭐⭐ Medium', '⭐⭐⭐ Hard'][q.difficulty];
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
      text: { type: 'mrkdwn', text: q.options.map(o => `• ${o}`).join('\n') }
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: '💡 解答は18:00に投稿されます' }]
    }
  ];
}

function buildAnswerBlocks(q) {
  const correct = q.options[q.answer];
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
