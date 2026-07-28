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
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '現代文（評論重要語彙・対比概念・パラドックス・アイロニー・抽象具体などの意味）', constraint: '高校現代文の評論で頻出する重要単語・用語の知識' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '古文（重要古文単語「あはれなり」「いとほし」「をかし」「あやし」等の意味・助動詞の基礎意味）', constraint: '高校古文の必須古語単語と助動詞基礎' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '漢文・漢字（漢文の返り点・置き字・再読文字基礎、高校レベルの難読漢字・四字熟語・故事成語）', constraint: '高校漢文の基本ルールと漢字・故事成語' }
];

async function generateQuestions(task, index, total, retries = 2) {
  const prompt = `
あなたは高校国語（現代文・古文・漢文）の優秀な専門講師です。
高校生（高1〜高3）が4択クイズ形式で現代文の評論文語彙、重要古文単語、漢文訓読、漢字・四字熟語を楽しく学べる4択問題を${task.count}問作成してください。

【対象分野】: ${task.topic}
【制約事項】: ${task.constraint}
【必須フォーマット】:
必ず以下の構造を持つJSON配列形式（コードブロックなしの純粋なJSON配列）のみを出力してください。

[
  {
    "question_text": "問題文（例: 評論文用語「アイロニー」の意味として最も適切なものを選べ。）",
    "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
    "correct_index": 0,
    "difficulty": 1
  }
]

※注意点:
- options は必ず4つの選択肢を含めてください。
- correct_index は 0, 1, 2, 3 のいずれかの整数（正解のインデックス）にしてください。
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
  console.log(`Starting High School Japanese Quizzes Generation (${tasks.length} tasks)...`);
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

  console.log(`\nTotal High School Japanese questions generated: ${allQuestions.length}`);

  let sql = `-- High School Japanese Quizzes Seed\n`;
  for (const q of allQuestions) {
    const qText = q.question_text.replace(/'/g, "''");
    const optionsJson = q.options_json.replace(/'/g, "''");
    sql += `INSERT INTO quiz_questions (grade_level, category, question_text, options_json, correct_index, difficulty) VALUES ('${q.grade_level}', '${q.category}', '${qText}', '${optionsJson}', ${q.correct_index}, ${q.difficulty});\n`;
  }

  fs.writeFileSync('high_japanese_seed.sql', sql, 'utf-8');
  console.log('Successfully written to high_japanese_seed.sql!');
}

main();
