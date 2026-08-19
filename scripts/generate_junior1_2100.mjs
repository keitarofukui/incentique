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
  console.error("Please run with GEMINI_API_KEY=your_key node scripts/generate_junior1_2100.mjs");
  process.exit(1);
}

const MODEL = 'gemini-3.1-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// 60 Tasks x 35 Questions = 2,100 Questions (Strictly Middle School 1st Year 1st Semester / 中1前半限定)
const tasks = [
  // --- 英語 (12 tasks x 35 = 420問) ---
  { gradeLevel: 'junior_1', category: 'english', count: 35, topic: 'アルファベット・ヘボン式ローマ字・基本ルール', constraint: '中1前半のローマ字書きとアルファベット順・大文字小文字' },
  { gradeLevel: 'junior_1', category: 'english', count: 35, topic: 'be動詞(am/is/are)の肯定文と主語による使い分け', constraint: 'I/You/He/She/It/Theyに対するbe動詞' },
  { gradeLevel: 'junior_1', category: 'english', count: 35, topic: 'be動詞の否定文(not)と疑問文(Am/Is/Are)・短縮形', constraint: 'be動詞の否定文・疑問文・応答(Yes, I am. / No, he is not.)' },
  { gradeLevel: 'junior_1', category: 'english', count: 35, topic: '一般動詞(like/play/study/have/speak/live等)の肯定文', constraint: '主語I, youにおける一般動詞の基本文' },
  { gradeLevel: 'junior_1', category: 'english', count: 35, topic: '一般動詞の否定文(don\'t)と疑問文(Do you~?)・応答', constraint: 'don\'tを使った否定文とDo you~?の疑問文応答' },
  { gradeLevel: 'junior_1', category: 'english', count: 35, topic: '人称代名詞の主格(I, you, he, she, it, we, they)', constraint: '主語として使う代名詞の選定' },
  { gradeLevel: 'junior_1', category: 'english', count: 35, topic: '人称代名詞の所有格(my, your, his, her, its, our, their)', constraint: '「〜の」を表す所有格代名詞' },
  { gradeLevel: 'junior_1', category: 'english', count: 35, topic: '人称代名詞の目的格(me, him, her, us, them)・所有代名詞(mine, yours)', constraint: '目的格と所有代名詞の基本使い分け' },
  { gradeLevel: 'junior_1', category: 'english', count: 35, topic: '疑問詞 What (何) / Who (誰) を使った疑問文と応答', constraint: 'What is this? / Who is he? 等の疑問文' },
  { gradeLevel: 'junior_1', category: 'english', count: 35, topic: '疑問詞 Where (どこ) / How (どのように・調子) を使った疑問文と応答', constraint: 'Where do you live? / How are you? 等の疑問文' },
  { gradeLevel: 'junior_1', category: 'english', count: 35, topic: '名詞の複数形(-s, -es, -ies)と冠詞(a, an, the)', constraint: '単数形・複数形と冠詞の使い分け' },
  { gradeLevel: 'junior_1', category: 'english', count: 35, topic: '中1前半必須単語（数字・曜日・月・教科・スポーツ・家族・食べ物）', constraint: '中1最初の定期テストで出る基本語彙' },

  // --- 数学 (12 tasks x 35 = 420問) ---
  { gradeLevel: 'junior_1', category: 'math', count: 35, topic: '正の数・負の数（絶対値・反対の性質・数直線・大小比較）', constraint: '符号と絶対値の基本概念' },
  { gradeLevel: 'junior_1', category: 'math', count: 35, topic: '正の数・負の数の加法・減法（符号の決定・基本計算）', constraint: '同符号・異符号の加減計算' },
  { gradeLevel: 'junior_1', category: 'math', count: 35, topic: '正の数・負の数の乗法・除法（符号のルール・積と商）', constraint: '符号決定ルールと乗除計算' },
  { gradeLevel: 'junior_1', category: 'math', count: 35, topic: '正の数・負の数の累乗計算（(-3)^2 と -3^2 の違い）', constraint: 'カッコのある累乗とない累乗の計算違い' },
  { gradeLevel: 'junior_1', category: 'math', count: 35, topic: '正の数・負の数の四則混合計算・カッコと分配法則', constraint: '加減乗除が混ざった計算ドリル' },
  { gradeLevel: 'junior_1', category: 'math', count: 35, topic: '文字と式（×・÷の記号の省略ルール・積と商の表し方）', constraint: '文字式の表し方の約束ごと' },
  { gradeLevel: 'junior_1', category: 'math', count: 35, topic: '文字と式（代金・個数・割合・図形に関する数量の表し方）', constraint: '文章から文字式を作る立式練習' },
  { gradeLevel: 'junior_1', category: 'math', count: 35, topic: '文字と式（式の値・正の数および負の数の代入）', constraint: '文字に数値を代入して値を求めるドリル' },
  { gradeLevel: 'junior_1', category: 'math', count: 35, topic: '文字と式（1次式の加減・同類項のまとめ方）', constraint: '文字が同じ項をまとめる加減計算' },
  { gradeLevel: 'junior_1', category: 'math', count: 35, topic: '文字と式（1次式と数の乗除・分配法則）', constraint: 'カッコをはずす乗除計算' },
  { gradeLevel: 'junior_1', category: 'math', count: 35, topic: '一次方程式（等式の性質・移項の基本ルール）', constraint: '移項して符号が変わるルールの理解' },
  { gradeLevel: 'junior_1', category: 'math', count: 35, topic: '一次方程式（方程式の解き方・整数・カッコ・小数・分数含む計算）', constraint: '一次方程式の計算ドリル' },

  // --- 理科 (12 tasks x 35 = 420問) ---
  { gradeLevel: 'junior_1', category: 'science', count: 35, topic: '花のつくりと働き（めしべ・おしべ・子房・胚珠・受粉）', constraint: '花弁・萼・果実・種子のでき方' },
  { gradeLevel: 'junior_1', category: 'science', count: 35, topic: '被子植物と裸子植物（アブラナ・サクラ・マツ・スギの比較）', constraint: '胚珠が子房に包まれているかどうかの比較' },
  { gradeLevel: 'junior_1', category: 'science', count: 35, topic: '葉・茎・根の構造（気孔・蒸散・維管束・道管・師管）', constraint: '植物の体の構造と水の通り道' },
  { gradeLevel: 'junior_1', category: 'science', count: 35, topic: '単子葉類と双子葉類の比較（網状脈・平行脈・主根側根・ひげ根）', constraint: '葉脈・根・維管束の並び方の比較' },
  { gradeLevel: 'junior_1', category: 'science', count: 35, topic: '光合成と呼吸（実験手順・対照実験・BTB溶液・ヨウ素液変化）', constraint: '二酸化炭素・酸素の出入りと溶液の色変化' },
  { gradeLevel: 'junior_1', category: 'science', count: 35, topic: '観察器具の操作（顕微鏡の使い方・倍率・ルーペ・プレパラート）', constraint: '顕微鏡のピント合わせや倍率・プレパラートの作り方' },
  { gradeLevel: 'junior_1', category: 'science', count: 35, topic: '身近な物質（有機物と無機物・金属の性質・プラスチックの種類）', constraint: '加熱した時の変化・通電性・延展性' },
  { gradeLevel: 'junior_1', category: 'science', count: 35, topic: '密度の計算とメスシリンダー・電子天秤の読み方', constraint: '密度＝質量÷体積 の基本計算と読み取り' },
  { gradeLevel: 'junior_1', category: 'science', count: 35, topic: '気体の発生と性質①（酸素・二酸化炭素の発生法と確認法）', constraint: '過酸化水素水・二酸化マンガン・石灰石・塩酸の反応' },
  { gradeLevel: 'junior_1', category: 'science', count: 35, topic: '気体の発生と性質②（水素・アンモニア・気体の置換法）', constraint: '水上置換・上方置換・下方置換の使い分け' },
  { gradeLevel: 'junior_1', category: 'science', count: 35, topic: '水溶液の性質（溶質・溶媒・水溶液の透明性と均一性）', constraint: '水溶液の定義と溶解の仕組み' },
  { gradeLevel: 'junior_1', category: 'science', count: 35, topic: '質量パーセント濃度計算とリトマス紙・指示薬の変化', constraint: '濃度計算基礎と酸性・アルカリ性判定' },

  // --- 社会 (12 tasks x 35 = 420問) ---
  { gradeLevel: 'junior_1', category: 'social_studies', count: 35, topic: '世界の姿（6大陸と3大洋・緯度と経度・赤道・本初子午線）', constraint: '地球の陸地と海洋の基礎知識' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 35, topic: '世界の国々（州区分・人口・国旗・主な国の位置）', constraint: 'アジア・ヨーロッパ・アフリカ・アメリカなどの基本国' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 35, topic: '日本の姿（位置・領域・領海・排他的経済水域EEZ・領土問題）', constraint: '日本の端の島々や領空・領海' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 35, topic: '標準時と時差の計算（兵庫県明石市・東経135度・経度差計算）', constraint: '東京と世界各地の時差計算基礎' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 35, topic: '日本の地域区分（47都道府県・県庁所在地・8地方区分）', constraint: '都道府県名と位置・県庁所在地' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 35, topic: '日本の地形と気候（山脈・平野・川・日本海側と太平洋側の気候）', constraint: '日本の自然環境と気候帯' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 35, topic: '歴史の始まりと旧石器時代（人類の出現・打製石器・岩宿遺跡）', constraint: '打製石器と旧石器時代の暮らし' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 35, topic: '縄文時代（縄文土器・竪穴住居・貝塚・磨製石器・土偶）', constraint: '縄文時代の暮らしと道具' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 35, topic: '弥生時代（稲作の伝来・弥生土器・金属器・高床倉庫・卑弥呼）', constraint: '稲作開始と邪馬台国・卑弥呼' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 35, topic: '古墳時代（前方後円墳・埴輪・渡来人・大和政権）', constraint: '巨大古墳と大和政権の成立' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 35, topic: '飛鳥時代（聖徳太子・冠位十二階・十七条の憲法・法隆寺・遣隋使）', constraint: '推古天皇と聖徳太子の政治' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 35, topic: '大化の改新〜奈良時代（中大兄皇子・律令国家・平城京・聖武天皇・大仏）', constraint: '公地公民・公地公民制・平城京と仏教政治' },

  // --- 国語 (12 tasks x 35 = 420問) ---
  { gradeLevel: 'junior_1', category: 'japanese', count: 35, topic: '中1必須漢字の読み方・音読みと訓読みの判別', constraint: '中1前半で習う漢字の読みと音訓' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 35, topic: '中1必須漢字の部首（偏・旁・冠・脚など）の名称と意味', constraint: '漢字の成り立ちと部首' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 35, topic: '同音異義語・同訓異字の使い分け（例：「関心」と「感心」）', constraint: '正しい漢字の選定' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 35, topic: '類義語と対義語の組み合わせ判定', constraint: '語彙力を高める類語・対義語' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 35, topic: '三字熟語・四字熟語の成り立ちと正しい意味', constraint: '中学生必須の熟語意味問題' },
  { gradeLevel: 'japanese', category: 'japanese', count: 35, topic: '言葉の単位（文章・段落・文・文節・単語）の概念', constraint: '文法における言葉の単位' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 35, topic: '文節の区切り（「ネ」を入れて切る基礎ドリル）', constraint: '文章を正しい文節に区切る選択' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 35, topic: '主語と述語の関係と文中の判定', constraint: '「誰が」「どうする」の主語述語判定' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 35, topic: '修飾語（連体修飾語・連用修飾語）と被修飾語', constraint: 'どの言葉を詳しく説明しているかの判別' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 35, topic: '独立語・接続語の働きと適語選択', constraint: '文と文をつなぐ接続語の役割' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 35, topic: '身体を使った慣用句（手・足・目・口・耳など）の意味', constraint: '日常で使う身近な慣用句' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 35, topic: 'ことわざ・故事成語の意味と正しい使い方', constraint: '有名なことわざの空欄補充と意味' },
];

async function generateQuestions(task, index, total, retries = 2) {
  const gradeTitle = '中学1年生（1学期〜2学期前半・中1前半限定レベル）';
  const catLabel = task.category === 'english' ? '英語' : task.category === 'social_studies' ? '社会' : task.category === 'science' ? '理科' : task.category === 'math' ? '数学' : '国語';

  const prompt = `あなたは日本の教育に精通した優秀な学習AIです。
${gradeTitle}向けの「${catLabel}」科目（詳細テーマ: ${task.topic}）に関する4択クイズを重複なく【${task.count}問】作成してください。

【厳格な範囲制限】
・範囲制限: ${task.constraint}
・まだ中1前半の生徒向けのため、中1後半や中2・中3の未習内容（過去形、受動態、連立方程式、一次関数、光の屈折や電流の計算等）は【絶対に使用不可】です。中1前半の範囲内でのみ出題してください。
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
        grade_level: 'junior_1',
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
  console.log(`Starting bulk generation for 2,100 Junior 1 (1st Semester Only) questions...`);
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
  console.log(`Total Junior 1 questions generated: ${allQuestions.length}`);
  console.log(`========================================\n`);

  let sql = `-- Bulk AI Generated Junior 1 (1st Semester Only) Quizzes (2,100 questions)\n`;
  for (const q of allQuestions) {
    if (!q || !q.question_text || !Array.isArray(q.options)) continue;
    const optionsJson = JSON.stringify(q.options || []).replace(/'/g, "''");
    const qText = String(q.question_text).replace(/'/g, "''");
    sql += `INSERT INTO quiz_questions (grade_level, category, question_text, options_json, correct_index, difficulty) VALUES ('${q.grade_level}', '${q.category}', '${qText}', '${optionsJson}', ${q.correct_index || 0}, ${q.difficulty || 1});\n`;
  }

  const outPath = path.join(process.cwd(), 'junior1_2100_seed.sql');
  fs.writeFileSync(outPath, sql, 'utf8');
  console.log(`Generated SQL saved to: ${outPath}`);
}

main();
