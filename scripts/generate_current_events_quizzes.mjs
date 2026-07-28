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
  {
    gradeLevel: 'junior_1',
    category: 'social_studies',
    count: 50,
    topic: '中学生向け時事問題（環境問題・SDGs・日本の地理政治・世界遺産・最新の国際・社会ニュース）',
    constraint: '中学生の定期テストや高校入試でよく出る基礎的な時事問題・社会ニュース'
  },
  {
    gradeLevel: 'junior_1',
    category: 'social_studies',
    count: 50,
    topic: '中学生向け時事問題（日本の最新社会トレンド・気候変動・国際連合・科学技術・主要ニュース）',
    constraint: '中学生が押さえるべき社会・一般常識・ニュース用語'
  },
  {
    gradeLevel: 'high_3',
    category: 'social_studies',
    count: 50,
    topic: '高校生向け時事問題（国際社会・外交・ウクライナ・中東・G7・G20・安全保障・国際機関）',
    constraint: '高校の公共・政治経済・大学入試で頻出する国際時事問題'
  },
  {
    gradeLevel: 'high_3',
    category: 'social_studies',
    count: 50,
    topic: '高校生向け時事問題（日本の経済・金融政策・インフレ・円安・少子高齢化・生成AI・脱炭素・GX）',
    constraint: '高校生が知っておくべき最新の経済・政治・テクノロジー時事用語'
  }
];

async function generateQuestions(task, index, total, retries = 2) {
  const prompt = `
あなたは中学・高校の社会科および時事問題の専門講師です。
中学生・高校生が定期テスト・入試・一般教養として身につけるべき「時事問題・最新社会ニュース・政治経済用語」に関する4択クイズを【${task.count}問】作成してください。

【対象分野】: ${task.topic}
【制約事項】: ${task.constraint}
【必須フォーマット】:
必ず以下の構造を持つJSON配列形式（コードブロックなしの純粋なJSON配列）のみを出力してください。

[
  {
    "question_text": "【時事】問題文（例: 持続可能な開発目標の略称として正しいものはどれか？）",
    "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
    "correct_index": 0,
    "difficulty": 1
  }
]

※注意点:
- options は必ず4つの選択肢を含めてください。
- correct_index は 0, 1, 2, 3 のいずれかの整数にしてください。
- 問題文の冒頭には「【時事】」という接頭辞を付けてください。
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
  console.log(`Starting Current Events Quizzes Generation (${tasks.length} tasks)...`);
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

  console.log(`\nTotal Current Events questions generated: ${allQuestions.length}`);

  let sql = `-- Current Events Quizzes Seed\n`;
  for (const q of allQuestions) {
    const qText = q.question_text.replace(/'/g, "''");
    const optionsJson = q.options_json.replace(/'/g, "''");
    sql += `INSERT INTO quiz_questions (grade_level, category, question_text, options_json, correct_index, difficulty) VALUES ('${q.grade_level}', '${q.category}', '${qText}', '${optionsJson}', ${q.correct_index}, ${q.difficulty});\n`;
  }

  fs.writeFileSync('current_events_seed.sql', sql, 'utf-8');
  console.log('Successfully written to current_events_seed.sql!');
}

main();
