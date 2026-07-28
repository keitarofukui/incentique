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
  console.error("Please run with GEMINI_API_KEY=your_key node scripts/generate_manga_quizzes.mjs");
  process.exit(1);
}

const MODEL = 'gemini-3.1-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const mangaTasks = [
  { title: 'ドラゴンボール', category: 'anime_manga', count: 30, promptDesc: '孫悟空、ドラゴンボール収集、天下一武道会、かめはめ波、サイヤ人、名台詞などのファンクイズ' },
  { title: 'ハイキュー!!', category: 'anime_manga', count: 30, promptDesc: '日向翔陽、影山飛雄、烏野高校バレー部、変人速攻、ライバル校（青葉城西・音駒・梟谷）、名言クイズ' },
  { title: '鬼滅の刃', category: 'anime_manga', count: 30, promptDesc: '竈門炭治郎、全集中の呼吸、水・日の呼吸、鬼殺隊の柱（煉獄・冨岡等）、十二鬼月に関するクイズ' },
  { title: 'スラムダンク', category: 'anime_manga', count: 30, promptDesc: '桜木花道、流川楓、赤木、安西先生の名言、湘北高校バスケ部、ライバル校（陵南・海南・山王）に関するクイズ' },
  { title: '今日から俺は!!', category: 'anime_manga', count: 30, promptDesc: '三橋貴志、伊藤真司、金髪とウニ頭、軟葉高校、今井・谷川、名勝負やギャグエピソードに関するクイズ' },
  { title: '宇宙兄弟', category: 'anime_manga', count: 30, promptDesc: '南波六太（ムッタ）、南波日々人（ヒビト）、JAXA・NASAの宇宙飛行士選考、宇宙飛行士の知識や感動の名言クイズ' }
];

async function generateMangaQuestions(task) {
  const prompt = `あなたは人気マンガ・アニメの知識に精通したエンタメクイズAIです。
人気作品『${task.title}』に関する楽しい4択クイズを【${task.count}問】作成してください。

【対象作品・内容テーマ】
${task.promptDesc}

【ルール】
・ファンなら思わずニヤリとする楽しい問題、熱い名言・キャラクターの技や設定に関する面白い問題にしてください。
・正解は1つ、選択肢は必ず4つ作成してください。
・同じ問題が重複しないように工夫してください。

出力フォーマット（必ず厳密なJSON配列のみを出力してください）:
[
  {
    "question_text": "【${task.title}】問題文...",
    "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
    "correct_index": 0,
    "difficulty": 1
  }
]`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!res.ok) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      const resData = await res.json();
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      const cleanJson = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return parsed.map(q => ({
        grade_level: 'all',
        category: 'anime_manga',
        question_text: q.question_text.startsWith(`【${task.title}】`) ? q.question_text : `【${task.title}】${q.question_text}`,
        options: q.options,
        correct_index: q.correct_index ?? 0,
        difficulty: 1
      }));
    } catch (err) {
      console.error(`Attempt ${attempt+1} failed for ${task.title}:`, err.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return [];
}

async function main() {
  console.log(`Starting 180 Fun Breather Manga Quizzes (6 works x 30 questions)...`);
  let allQuestions = [];

  for (let i = 0; i < mangaTasks.length; i++) {
    const task = mangaTasks[i];
    console.log(`[${i + 1}/${mangaTasks.length}] Generating 30 questions for ${task.title}...`);
    const qs = await generateMangaQuestions(task);
    console.log(`  -> Generated ${qs.length} questions for ${task.title}`);
    allQuestions = allQuestions.concat(qs);
    await new Promise(r => setTimeout(r, 1500));
  }

  let sql = `-- Manga & Anime Fun Breather Quizzes\n`;
  for (const q of allQuestions) {
    const optionsJson = JSON.stringify(q.options || []).replace(/'/g, "''");
    const qText = q.question_text.replace(/'/g, "''");
    sql += `INSERT INTO quiz_questions (grade_level, category, question_text, options_json, correct_index, difficulty) VALUES ('${q.grade_level}', '${q.category}', '${qText}', '${optionsJson}', ${q.correct_index}, ${q.difficulty});\n`;
  }

  const outPath = path.join(process.cwd(), 'manga_seed.sql');
  fs.writeFileSync(outPath, sql, 'utf8');
  console.log(`Successfully generated ${allQuestions.length} manga questions! Saved to: ${outPath}`);
}

main();
