import fs from 'fs';
import path from 'path';

let GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  try {
    const envPath = path.join(process.cwd(), '.dev.vars');
    const envFile = fs.readFileSync(envPath, 'utf8');
    const match = envFile.match(/GEMINI_API_KEY=(.+)/);
    if (match) {
      GEMINI_API_KEY = match[1].trim();
    }
  } catch (e) {
    // ignore
  }
}

if (!GEMINI_API_KEY) {
  console.error("Please run with GEMINI_API_KEY=your_key node scripts/bulk_generate.mjs");
  process.exit(1);
}

const MODEL = 'gemini-3.1-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// 420 NEW Questions focusing on Junior High 1st Year (12 tasks x 35 questions)
const tasks = [
  // --- 中学1年 前半レベル 新テーマ12個 (420問) ---
  { gradeLevel: 'junior_1', category: 'english', count: 35, topic: 'アルファベット・ヘボン式ローマ字・単語・be動詞・一般動詞の基礎', constraint: '中1前半のローマ字・be動詞・一般動詞基礎' },
  { gradeLevel: 'junior_1', category: 'english', count: 35, topic: '疑問文(Do you~? / Are you~?)と疑問詞(What / Who / Where)', constraint: '中1前半の疑問文と疑問詞' },
  { gradeLevel: 'junior_1', category: 'english', count: 35, topic: '人称代名詞(I/my/me/mine, he/she/they)と複数形(s/es)', constraint: '中1前半の代名詞と複数形' },
  { gradeLevel: 'junior_1', category: 'math', count: 35, topic: '正の数・負の数の計算（加減乗除・絶対値・四則計算）', constraint: '中1前半の正負の数の基礎計算' },
  { gradeLevel: 'junior_1', category: 'math', count: 35, topic: '文字と式（文字を使った式・代入・1次式の加減計算）', constraint: '中1前半の文字と式の計算' },
  { gradeLevel: 'junior_1', category: 'math', count: 35, topic: '一次方程式（移項のルール・方程式の計算・解の求め方）', constraint: '中1前半の一次方程式の計算' },
  { gradeLevel: 'junior_1', category: 'science', count: 35, topic: '植物のつくりと働き（光合成・蒸散・花のつくり・維管束）', constraint: '中1生物分野の花と植物の仕組み' },
  { gradeLevel: 'junior_1', category: 'science', count: 35, topic: '身近な物質と気体の性質（酸素・二酸化炭素・水素・水溶液とリトマス紙）', constraint: '中1化学分野の気体と水溶液' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 35, topic: '世界の姿と日本の姿（47都道府県・県庁所在地・気候・時差の基礎）', constraint: '中1地理の冒頭・都道府県・世界と日本' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 35, topic: '縄文時代〜奈良時代（聖徳太子・大化の改新・平城京・大仏）', constraint: '中1歴史の縄文〜奈良時代' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 35, topic: '漢字の成り立ち・部首・音読み訓読み・類義語対義語', constraint: '中1国語の漢字・語彙基礎' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 35, topic: '慣用句・ことわざ・文節と単語の区切り', constraint: '中1国語の慣用句と文法基礎' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: 'IT・テクノロジー・AI・社会問題に関する英単語', constraint: '高校生向け最新テクノロジー・社会ニュース英単語' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '環境保護・SDGs・気候変動に関する英単語', constraint: '高校英語でよく出る環境・SDGs関連テーマ英単語' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: 'ニュースや長文で使われる重要前置詞と熟語イディオム', constraint: '高1・高2必須の英熟語・慣用表現' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '日本史（安土桃山・織田信長・豊臣秀吉・関ヶ原の戦い）', constraint: '高校日本史の織豊政権と安土桃山時代' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '日本史（幕末・黒船来航・ペリー・新選組・薩長同盟・大政奉還）', constraint: '高校日本史の幕末・明治維新直前' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '日本史（大正デモクラシー・吉野作造・政党政治の成立）', constraint: '高校日本史の大正時代・民主主義運動' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '世界史（ルネサンス・宗教改革・ルター・カルヴァン）', constraint: '高校世界史の近世ヨーロッパ思想・宗教改革' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '世界史（産業革命・イギリス・工場制機械工業の成立）', constraint: '高校世界史の産業革命と社会変化' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '公共・政治経済（金融政策・日本銀行・金利・インフレ・デフレ）', constraint: '高校公共・政経の金融・日本銀行の働き' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '公共・政治経済（国際連合の仕組み・安全保障理事会・拒否権）', constraint: '高校公共の国際政治・国連の組織ルール' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '化学基礎（酸と塩基・pH値・中和反応の基本計算）', constraint: '高校化学基礎の酸・塩基・中和の知識' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '化学基礎（酸化還元反応・金属のイオン化傾向）', constraint: '高校化学基礎の酸化還元・イオン化傾向' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '生物基礎（生態系・食物連鎖・生産者・消費者・エネルギーの流れ）', constraint: '高校生物基礎の生態系とバイオーム知識' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '生物基礎（自律神経とホルモン・恒常性・体内の環境維持）', constraint: '高校生物基礎の自律神経・内分泌系' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '物理基礎（等加速度直線運動・オームの法則と電気回路）', constraint: '高校物理基礎の運動と電気の基本法則' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '地学基礎（天気・低気圧・高気圧・温暖前線と寒冷前線）', constraint: '高校地学基礎の気象・前線と天気の変化' },
];

async function generateQuestions(task, index, total, retries = 2) {
  const gradeTitle = task.gradeLevel === 'junior_1' ? '中学1年生（1学期・前半レベル）' : '高校1年生〜2年生レベル';
  const catLabel = task.category === 'english' ? '英語' : task.category === 'social_studies' ? '社会' : task.category === 'science' ? '理科' : task.category === 'math' ? '数学' : '国語';

  const prompt = `あなたは日本の小中高生向け学習支援アプリの優秀な教育AIです。
${gradeTitle}向けの「${catLabel}」科目（詳細テーマ: ${task.topic}）に関する4択クイズを重複なく【${task.count}問】作成してください。

【厳格な範囲・難易度指定】
・範囲制限: ${task.constraint}
・選択肢は必ず4つ作成し、間違い選択肢（ダミー）も紛らわしく教育的な内容にしてください。
・同じ問題や似通った表現の問題が絶対に重複しないよう、テーマ内で様々な角度から出題してください。

【出力フォーマット】
以下のキーを持つ厳密なJSON配列（Markdown装飾コードブロックなし）のみを出力してください：
[
  {
    "question_text": "問題文",
    "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
    "correct_index": 0,
    "difficulty": 2
  }
]`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (!res.ok) {
        console.error(`Failed [${index}/${total}] (Attempt ${attempt+1}): ${res.status}`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      const resData = await res.json();
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      const cleanJson = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return parsed.map(q => ({
        grade_level: task.gradeLevel,
        category: task.category,
        question_text: q.question_text,
        options: q.options,
        correct_index: q.correct_index ?? 0,
        difficulty: q.difficulty ?? 1
      }));
    } catch (err) {
      if (attempt === retries) {
        console.error(`Error generating [${index}/${total}] ${task.topic}:`, err.message);
        return [];
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return [];
}

async function main() {
  console.log(`Starting bulk generation for 1,260 NEW questions (36 tasks x 35 questions)...`);
  let allQuestions = [];
  const total = tasks.length;

  for (let i = 0; i < total; i++) {
    const task = tasks[i];
    console.log(`[${i + 1}/${total}] Generating ${task.count} questions: ${task.gradeLevel} / ${task.topic}...`);
    const qs = await generateQuestions(task, i + 1, total);
    console.log(`  -> Generated ${qs.length} questions`);
    allQuestions = allQuestions.concat(qs);

    // Rate limit pause (2 seconds)
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n========================================`);
  console.log(`Total questions successfully generated: ${allQuestions.length}`);
  console.log(`========================================\n`);

  let sql = `-- Bulk AI Generated New Quizzes\n`;
  for (const q of allQuestions) {
    const optionsJson = JSON.stringify(q.options || []).replace(/'/g, "''");
    const qText = q.question_text.replace(/'/g, "''");
    sql += `INSERT INTO quiz_questions (grade_level, category, question_text, options_json, correct_index, difficulty) VALUES ('${q.grade_level}', '${q.category}', '${qText}', '${optionsJson}', ${q.correct_index}, ${q.difficulty});\n`;
  }

  const outPath = path.join(process.cwd(), 'bulk_seed.sql');
  fs.writeFileSync(outPath, sql, 'utf8');
  console.log(`Generated SQL saved to: ${outPath}`);
}

main();
