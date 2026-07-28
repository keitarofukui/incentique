import fs from 'fs';

let GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  try {
    const devVarsPath = fs.existsSync('.dev.vars') ? '.dev.vars' : '.env';
    if (fs.existsSync(devVarsPath)) {
      const envText = fs.readFileSync(devVarsPath, 'utf-8');
      const match = envText.match(/GEMINI_API_KEY=(.+)/);
      if (match) {
        GEMINI_API_KEY = match[1].trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch (e) {}
}
if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY is not set in environment or .env file');
  process.exit(1);
}

const MODEL = 'gemini-3.1-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const tasks = [
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数I（展開・因数分解・絶対値・2次関数・頂点と軸・2次不等式）', constraint: '高校数学Iの数と式・2次関数基礎' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数I・数A（三角比 sin/cos/tan・正弦定理・余弦定理・場合の数 nPr/nCr・確率・命題）', constraint: '高校数学I・Aの図形と計量・確率・論理' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数II・数B（三角関数・指数対数 log・微分導関数・積分・数列 Σ・ベクトル内積）', constraint: '高校数学II・Bの微分積分・対数・数列・ベクトル基礎' }
];

async function generateQuestions(task, index, total, retries = 2) {
  const prompt = `
あなたは高校数学（数I・数A・数II・数B）の優秀な塾講師です。
高校生（高1〜高3）が4択クイズ形式で基礎概念・公式・計算ルールを楽しく学べる4択問題を${task.count}問作成してください。

【対象分野】: ${task.topic}
【制約事項】: ${task.constraint}
【必須フォーマット】:
必ず以下の構造を持つJSON配列形式（コードブロックなしの純粋なJSON配列）のみを出力してください。

[
  {
    "question_text": "問題文（例: log_2(8) の値を求めよ。）",
    "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
    "correct_index": 0,
    "difficulty": 1
  }
]

※注意点:
- options は必ず4つの選択肢を含めてください。
- correct_index は 0, 1, 2, 3 のいずれかの整数（正解のインデックス）にしてください。
- 記号や数式は分かりやすく表記してください（例: x^2 - 4x + 3 = 0, sin(30°), log_2(8) など）。
`;

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json'
        }
      })
    });

    const data = await response.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error(`Invalid Gemini API response: ${JSON.stringify(data)}`);
    }

    const text = data.candidates[0].content.parts[0].text;
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Parsed response is not a valid non-empty array');
    }

    return parsed.map((item) => ({
      grade_level: task.gradeLevel,
      category: task.category,
      question_text: item.question_text,
      options_json: JSON.stringify(item.options),
      correct_index: item.correct_index,
      difficulty: item.difficulty || 1
    }));
  } catch (err) {
    if (retries > 0) {
      console.warn(`[Retry ${3 - retries}] Task ${index + 1} failed: ${err.message}. Retrying...`);
      await new Promise((r) => setTimeout(r, 2000));
      return generateQuestions(task, index, total, retries - 1);
    }
    throw err;
  }
}

async function main() {
  console.log(`Starting High School Math Quizzes Generation (${tasks.length} tasks)...`);
  let allQuestions = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    console.log(`[Task ${i + 1}/${tasks.length}] Generating ${task.count} questions for ${task.topic}...`);
    try {
      const qList = await generateQuestions(task, i, tasks.length);
      allQuestions.push(...qList);
      console.log(`  -> Successfully generated ${qList.length} questions.`);
    } catch (err) {
      console.error(`  -> Failed task ${i + 1}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\nTotal High School Math questions generated: ${allQuestions.length}`);

  let sql = `-- High School Math Quizzes Seed\n`;
  for (const q of allQuestions) {
    const qText = q.question_text.replace(/'/g, "''");
    const optionsJson = q.options_json.replace(/'/g, "''");
    sql += `INSERT INTO quiz_questions (grade_level, category, question_text, options_json, correct_index, difficulty) VALUES ('${q.grade_level}', '${q.category}', '${qText}', '${optionsJson}', ${q.correct_index}, ${q.difficulty});\n`;
  }

  fs.writeFileSync('high_math_seed.sql', sql, 'utf-8');
  console.log('Successfully written to high_math_seed.sql!');
}

main();
