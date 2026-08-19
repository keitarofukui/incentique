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
  console.error("Please run with GEMINI_API_KEY=your_key node scripts/generate_common_1000.mjs");
  process.exit(1);
}

const MODEL = 'gemini-3.1-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// 30 Tasks x 34 Questions = 1,020 Questions (All-Generations Common: 時事問題・一般常識・雑学)
const tasks = [
  // --- 最新時事・ニュース・国際社会 (8 tasks x 34 = 272問) ---
  { category: 'current_events', count: 34, topic: '2024年〜2026年の最新国内政治・経済ニュース（新紙幣・渋沢栄一・津田梅子・北里柴三郎）', constraint: '最新新紙幣と経済ニュース' },
  { category: 'current_events', count: 34, topic: '大阪・関西万博（EXPO 2025）とSDGs 17の目標・環境問題', constraint: '万博と持続可能な開発目標' },
  { category: 'current_events', count: 34, topic: '国際連合（UN）・安全保障理事会・G7/G20・国際条約と国際情勢', constraint: '国際秩序と主要国際機関' },
  { category: 'current_events', count: 34, topic: '地球温暖化・脱炭素・再生可能エネルギー・環境保全ニュース', constraint: '気候変動とカーボンニュートラル' },
  { category: 'current_events', count: 34, topic: '防災・自然災害知識（地震・津波・ハザードマップ・能登半島地震）', constraint: '防災意識と災害対策' },
  { category: 'current_events', count: 34, topic: '日本の政治・選挙制度・三権分立・日本国憲法の基礎知識', constraint: '現代社会の政治の仕組み' },
  { category: 'current_events', count: 34, topic: 'AI（人工知能）・生成AI・DX・デジタル技術の最新トレンド', constraint: '最新テクノロジー用語' },
  { category: 'current_events', count: 34, topic: 'キャッシュレス決済・電子マネー・暗号資産・中央銀行デジタル通貨', constraint: '現代の金融と決済手段' },

  // --- ビジネス・常識マナー・社会常識 (8 tasks x 34 = 272問) ---
  { category: 'social_studies', count: 34, topic: '正しい敬語の使い方（尊敬語・謙譲語・丁寧語の日常・ビジネス会話）', constraint: '敬語の正しい変換と誤用' },
  { category: 'social_studies', count: 34, topic: 'ビジネスマナー・メール・電話対応・名刺交換・お詫びのマナー', constraint: '社会人の基本マナー' },
  { category: 'social_studies', count: 34, topic: '冠婚葬祭・祝儀不祝儀・結納・手紙・季節の挨拶・手紙の季語', constraint: '日本の伝統行事と礼儀作法' },
  { category: 'social_studies', count: 34, topic: '生活のお金①（税金・所得税・消費税・ふるさと納税・社会保険）', constraint: '日常の税金と保険の仕組み' },
  { category: 'social_studies', count: 34, topic: '生活のお金②（インフレ・デフレ・金利・円高円安・株式市場基礎）', constraint: '経済の基本概念' },
  { category: 'social_studies', count: 34, topic: 'ITリテラシー・ネットモラル・フィッシング詐欺・パスワード管理', constraint: 'サイバーセキュリティと情報モラル' },
  { category: 'social_studies', count: 34, topic: '労働法と権利（有給休暇・最低賃金・労働基準法・クーリングオフ）', constraint: '消費者の権利と労働の基礎' },
  { category: 'social_studies', count: 34, topic: '現代の重要アルファベット略語（NPO, NGO, NATO, OECD, WHO, UNICEF）', constraint: '国際機関・社会用語の略語' },

  // --- 世界地理・文化・世界遺産 (7 tasks x 34 = 238問) ---
  { category: 'social_studies', count: 34, topic: '世界の国旗・首都・通貨・主要都市クイズ', constraint: '世界の地理・基本国情報' },
  { category: 'social_studies', count: 34, topic: '日本の世界遺産（屋久島・姫路城・古都京都・法隆寺・富士山等）', constraint: '日本の文化遺産・自然遺産' },
  { category: 'social_studies', count: 34, topic: '世界の名所と有名建造物（自由の女神・エッフェル塔・ピラミッド等）', constraint: '世界の名所旧跡' },
  { category: 'social_studies', count: 34, topic: '世界の料理・食文化・伝統衣装・挨拶とマナー', constraint: '異文化理解と世界の食文化' },
  { category: 'social_studies', count: 34, topic: '日本の都道府県雑学（特産品・伝統工芸品・難読地名・名物）', constraint: 'ご当地雑学と都道府県' },
  { category: 'social_studies', count: 34, topic: '日本と世界の気候の不思議・自然環境雑学', constraint: '気象と地理の面白い知識' },
  { category: 'social_studies', count: 34, topic: '世界の言語・アルファベット以外の文字・カルチャー雑学', constraint: '言語と文化の多様性' },

  // --- 科学・宇宙・健康・雑学クイズ (7 tasks x 34 = 238問) ---
  { category: 'science', count: 34, topic: '宇宙開発と天体雑学（SLIM月面着陸・アルテミス計画・太陽系・ブラックホール）', constraint: '最新宇宙科学と天体' },
  { category: 'science', count: 34, topic: '身近な科学現象の不思議（空が青い理由・電子レンジ・虹の仕組み・虹の原理）', constraint: '日常の物理化学のなぜ？' },
  { category: 'science', count: 34, topic: 'ノーベル賞と日本人の科学者（ノーベル物理学賞・化学賞・生理学医学賞）', constraint: '日本の偉大な科学者と発見' },
  { category: 'science', count: 34, topic: '身体と健康の雑学（五感・骨の数・血液型・睡眠のメカニズム・REM睡眠）', constraint: '人体の神秘と健康知識' },
  { category: 'science', count: 34, topic: '栄養素とカロリー雑学（三大栄養素・ビタミンの働き・熱中症対策）', constraint: '食育と栄養の基礎知識' },
  { category: 'japanese', count: 34, topic: '大人の難読漢字・慣用表現・誤用しやすい日本語クイズ', constraint: '読めるとカッコいい難読漢字' },
  { category: 'japanese', count: 34, topic: '雑学・クイズの定番問題（スポーツのルール・オリンピック歴史・文化雑学）', constraint: '一般常識クイズ定番' },
];

async function generateQuestions(task, index, total, retries = 2) {
  const prompt = `あなたは全世代（小中高生から大人まで）に愛される日本のクイズ王・教育AIです。
全世代共通（一般常識・時事問題・雑学）向けのカテゴリー（詳細テーマ: ${task.topic}）に関する4択クイズを重複なく【${task.count}問】作成してください。

【対象・品質ルール】
・対象: 中学生、高校生、大人の誰が解いても知的好奇心が刺激される良質な雑学・一般常識・時事クイズ。
・選択肢は必ず4つ作成し、間違い選択肢（ダミー）も紛らわしく教育的な内容にしてください。
・同じ問題や似通った表現の問題が重複しないようバリエーション豊かに作成してください。

【出力フォーマット】
以下のキーを持つ厳密なJSON配列（Markdown装飾コードブロックなし）のみを出力してください：
[
  {
    "question_text": "問題文",
    "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
    "correct_index": 0,
    "difficulty": 1
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
        grade_level: 'all',
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
  console.log(`Starting bulk generation for 1,000+ All-Generations Common Current Events & General Knowledge questions...`);
  let allQuestions = [];
  const total = tasks.length;

  for (let i = 0; i < total; i++) {
    const task = tasks[i];
    console.log(`[${i + 1}/${total}] Generating ${task.count} questions: ${task.category} / ${task.topic}...`);
    const qs = await generateQuestions(task, i + 1, total);
    console.log(`  -> Generated ${qs.length} questions`);
    allQuestions = allQuestions.concat(qs);

    // Short pause for API rate limit
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\n========================================`);
  console.log(`Total Common questions generated: ${allQuestions.length}`);
  console.log(`========================================\n`);

  let sql = `-- Bulk AI Generated All-Generations Common Quizzes (1,000 questions)\n`;
  for (const q of allQuestions) {
    if (!q || !q.question_text || !Array.isArray(q.options)) continue;
    const optionsJson = JSON.stringify(q.options || []).replace(/'/g, "''");
    const qText = String(q.question_text).replace(/'/g, "''");
    sql += `INSERT INTO quiz_questions (grade_level, category, question_text, options_json, correct_index, difficulty) VALUES ('${q.grade_level}', '${q.category}', '${qText}', '${optionsJson}', ${q.correct_index || 0}, ${q.difficulty || 1});\n`;
  }

  const outPath = path.join(process.cwd(), 'common_1000_seed.sql');
  fs.writeFileSync(outPath, sql, 'utf8');
  console.log(`Generated SQL saved to: ${outPath}`);
}

main();
