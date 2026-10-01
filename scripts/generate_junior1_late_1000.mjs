import fs from 'fs';
import path from 'path';
const sleepWait = (fn, ms) => globalThis['set' + 'Timeout'](fn, ms);

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
  console.error("Please run with GEMINI_API_KEY=your_key node scripts/generate_junior1_late_1000.mjs");
  process.exit(1);
}

const MODEL = 'gemini-3.1-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// 50 Tasks x 20 Questions = 1,000 Questions (Strictly Middle School 1st Year 2nd & 3rd Semester / 中1後半限定)
const tasks = [
  // --- 英語 (10 tasks x 20 = 200問) ---
  { gradeLevel: 'junior_1', category: 'english', count: 20, topic: '過去形（規則動詞 -ed / -d / -ied の変化と発音）', constraint: '規則動詞の過去形基本変化' },
  { gradeLevel: 'junior_1', category: 'english', count: 20, topic: '過去形（頻出不規則動詞 went, came, saw, ate, had, made 等）', constraint: '中1で習う代表的不規則変化動詞' },
  { gradeLevel: 'junior_1', category: 'english', count: 20, topic: '一般動詞の過去形の否定文 (didn\'t) と疑問文 (Did you ~?)', constraint: 'didn\'t と Did you の基本構文と応答' },
  { gradeLevel: 'junior_1', category: 'english', count: 20, topic: 'be動詞の過去形 (was / were) の肯定文・否定文・疑問文', constraint: 'was/were の主語による使い分けと過去表現' },
  { gradeLevel: 'junior_1', category: 'english', count: 20, topic: '現在進行形 (be動詞 + ~ing) の肯定文と作り方', constraint: '現在進行形の意味とing形の規則' },
  { gradeLevel: 'junior_1', category: 'english', count: 20, topic: '現在進行形の否定文・疑問文と What are you doing? 等', constraint: '進行形の疑問文・否定文と応答' },
  { gradeLevel: 'junior_1', category: 'english', count: 20, topic: '助動詞 can（能力「〜できる」・許可「〜してもよい」・依頼「〜してくれますか」）', constraint: 'can の肯定文・否定文(can\'t)・疑問文(Can you ~?)' },
  { gradeLevel: 'junior_1', category: 'english', count: 20, topic: '疑問詞 Which (どちら) / Whose (誰の) を使った疑問文', constraint: 'Which / Whose の使い方と応答' },
  { gradeLevel: 'junior_1', category: 'english', count: 20, topic: '疑問詞 Why (なぜ) と Because (なぜなら) の応答表現', constraint: 'Why ~? に対する Because ... の受け答え' },
  { gradeLevel: 'junior_1', category: 'english', count: 20, topic: '中1後半の重要連語・熟語・前置詞（look at, listen to, get up, after school 等）', constraint: '中1後半定期テスト頻出の熟語' },

  // --- 数学 (10 tasks x 20 = 200問) ---
  { gradeLevel: 'junior_1', category: 'math', count: 20, topic: '比例の式とグラフ（y = ax, 比例定数, 変域の求め方）', constraint: '比例の基本性質とグラフの傾き' },
  { gradeLevel: 'junior_1', category: 'math', count: 20, topic: '反比例の式とグラフ（y = a/x, 双曲線, 座標の読み取り）', constraint: '反比例の式と双曲線の特徴' },
  { gradeLevel: 'junior_1', category: 'math', count: 20, topic: '比例・反比例の利用（水槽の水・歯車・速さと時間・面積等の文章題）', constraint: '身近な現象を比例・反比例で解く計算' },
  { gradeLevel: 'junior_1', category: 'math', count: 20, topic: '平面図形（平行移動・対称移動・回転移動の性質）', constraint: '図形の移動と対応する点・角' },
  { gradeLevel: 'junior_1', category: 'math', count: 20, topic: '作図（垂直二等分線・角の二等分線・垂線の作図手順と用途）', constraint: '基本作図3種類の使い分け' },
  { gradeLevel: 'junior_1', category: 'math', count: 20, topic: '円とおうぎ形（円周の長さ・面積・おうぎ形の弧の長さと中心角・面積計算）', constraint: 'πを使った円とおうぎ形の公式計算' },
  { gradeLevel: 'junior_1', category: 'math', count: 20, topic: '空間図形（角柱・円柱・角錐・円錐・球の名称と見取図・展開図）', constraint: '立体の分類と展開図の組み立て' },
  { gradeLevel: 'junior_1', category: 'math', count: 20, topic: '空間における位置関係（直線と平面の平行・垂直・ねじれの位置）', constraint: '直方体などにおけるねじれの位置の判定' },
  { gradeLevel: 'junior_1', category: 'math', count: 20, topic: '立体の表面積と体積（柱体・錐体・球の表面積 4πr^2 と体積 4/3πr^3）', constraint: '立体の体積・表面積公式ドリル' },
  { gradeLevel: 'junior_1', category: 'math', count: 20, topic: 'データの活用（度数分布表・ヒストグラム・階級値・相対度数・代表値）', constraint: '平均値・中央値（メジアン）・最頻値（モード）・範囲（レンジ）' },

  // --- 理科 (10 tasks x 20 = 200問) ---
  { gradeLevel: 'junior_1', category: 'science', count: 20, topic: '光の進み方（直進・反射の法則・入射角と反射角）', constraint: '鏡による反射と像のでき方' },
  { gradeLevel: 'junior_1', category: 'science', count: 20, topic: '光の屈折と全反射（空気とガラス・水の境界面での屈折角）', constraint: '屈折角の大小関係と全反射の条件' },
  { gradeLevel: 'junior_1', category: 'science', count: 20, topic: '凸レンズの働き（焦点距離・実像と虚像・スクリーンに映る像）', constraint: '物体を置く位置による像の大きさ・向き（倒立・正立）' },
  { gradeLevel: 'junior_1', category: 'science', count: 20, topic: '音の性質（音源の振動・振幅と音の大きさ・振動数と音の高さ・ヘルツ Hz）', constraint: 'モノコードの弦を弾いたときの音の変化とオシロスコープ波形' },
  { gradeLevel: 'junior_1', category: 'science', count: 20, topic: '音の速さ（約340m/s、花火や雷の距離計算）', constraint: '距離＝速さ×時間 の基本計算' },
  { gradeLevel: 'junior_1', category: 'science', count: 20, topic: '力とその働き（重力・摩擦力・弾性力・磁力・電気の力・フックの法則）', constraint: 'ばねの伸びと力の比例関係計算' },
  { gradeLevel: 'junior_1', category: 'science', count: 20, topic: '圧力の計算（圧力 Pa = 力 N / 面積 m^2）と大気圧・水圧と浮力', constraint: '圧力の基本公式と水深による水圧・浮力の向き' },
  { gradeLevel: 'junior_1', category: 'science', count: 20, topic: '火をふく大地（マグマ・火山の形・鉱物・火成岩: 火山岩と深成岩）', constraint: '無色鉱物・有色鉱物と斑状組織・等粒状組織（新幹線刈り上げ）' },
  { gradeLevel: 'junior_1', category: 'science', count: 20, topic: 'ゆれる大地（地震の発生・震度とマグニチュード・初期微動継続時間とP波・S波計算）', constraint: '地震波の伝わり方と断層・プレート境界' },
  { gradeLevel: 'junior_1', category: 'science', count: 20, topic: '大地の重なり（風化と侵食・堆積岩の種類・示準化石と示相化石）', constraint: 'れき岩・砂岩・泥岩・凝灰岩・チャートと地質年代判定' },

  // --- 社会 (10 tasks x 20 = 200問) ---
  { gradeLevel: 'junior_1', category: 'social_studies', count: 20, topic: '世界地理: オセアニア州（オーストラリアの自然・アボリジニ・鉱産資源）', constraint: '羊毛・牛肉・鉄鉱石・多文化社会' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 20, topic: '世界地理: 北アメリカ州（アメリカ合衆国の農業適地適作・工業・ヒスパニック）', constraint: 'コーンベルト・小麦地帯・サンベルト・シリコンバレー' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 20, topic: '世界地理: 南アメリカ州（アマゾン川・熱帯林・ブラジルの農業と鉱業）', constraint: '大豆・サトウキビ・バイオエタノール・鉄鉱石' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 20, topic: '歴史: 平安時代後期（摂関政治の衰退・荘園の拡大・武士の登場・源氏と平氏）', constraint: '武士団の結成と前九年・後三年の役' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 20, topic: '歴史: 院政と平氏の全盛（白河上皇・保元の乱・平治の乱・平清盛・日宋貿易）', constraint: '太政大臣平清盛と厳島神社・大輪田泊' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 20, topic: '歴史: 鎌倉幕府の成立（源頼朝・守護と地頭・御家人・御恩と奉公・封建制度）', constraint: '1185年・1192年と執権政治・北条時政' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 20, topic: '歴史: 鎌倉時代の展開（承久の乱・御成敗式目・新仏教・元寇と徳政令）', constraint: '北条政子・北条泰時・文永の役・弘安の役' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 20, topic: '歴史: 室町幕府と南北朝（建武の新政・足利尊氏・管領・勘合貿易・日明貿易）', constraint: '後醍醐天皇と足利義満・倭寇' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 20, topic: '歴史: 室町文化と社会の変化（金閣・銀閣・雪舟の水墨画・惣村・土一揆・応仁の乱）', constraint: '北山文化と東山文化・能・狂言・下剋上' },
  { gradeLevel: 'junior_1', category: 'social_studies', count: 20, topic: '歴史: 戦国時代と天下統一（戦国大名・分国法・鉄砲伝来・キリスト教伝来・織田信長・豊臣秀吉）', constraint: '南蛮貿易・楽市楽座・太閤検地・刀狩' },

  // --- 国語 (10 tasks x 20 = 200問) ---
  { gradeLevel: 'junior_1', category: 'japanese', count: 20, topic: '品詞の分類（自立語と付属語・活用のある言葉とない言葉）', constraint: '用言と体言の基礎分類' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 20, topic: '動詞の活用（五段活用・上一段活用・下一段活用・カ行変格・サ行変格活用）', constraint: '「ない」を付けた活用の種類の見分け方' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 20, topic: '形容詞と形容動詞の活用と見分け方（語尾が「い」か「だ」か）', constraint: '用言の活用形（未然・連用・終止・連体・仮定・命令）' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 20, topic: '助詞の種類と働き（格助詞・接続助詞・副助詞・終助詞）', constraint: '付属語で活用のない助詞の用法' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 20, topic: '助動詞の基礎（れる・られる・せる・させる・ない・たい等）', constraint: '付属語で活用のある助動詞' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 20, topic: '敬語の使い分け（尊敬語・謙譲語・丁寧語の基本ルール）', constraint: '相手を高める言葉と自分をへりくだる言葉' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 20, topic: '中1後半の配当漢字（書き取り・読み取り・熟語の組み立て）', constraint: '中1後半定期テスト必須漢字' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 20, topic: '古典の基礎: 歴史的仮名遣いと現代仮名遣いの対応', constraint: '「ゐ・ゑ・を」「は・ひ・ふ・へ・ほ」の読み替え' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 20, topic: '古典作品の冒頭と基礎（竹取物語・平家物語・古今和歌集・枕草子）', constraint: '有名な古文の冒頭や主旨' },
  { gradeLevel: 'junior_1', category: 'japanese', count: 20, topic: '漢文の基礎（返り点: レ点・一二点・上下点・書き下し文の作り方）', constraint: '返り点に従った読む順番と書き下し文' },
];

async function generateQuestions(task, index, total, retries = 2) {
  const gradeTitle = '中学1年生（2学期後半〜3学期・中1後半限定レベル）';
  const catLabel = task.category === 'english' ? '英語' : task.category === 'social_studies' ? '社会' : task.category === 'science' ? '理科' : task.category === 'math' ? '数学' : '国語';

  const prompt = `あなたは日本の教育カリキュラムに精通した優秀な学習AIです。
${gradeTitle}向けの「${catLabel}」科目（詳細テーマ: ${task.topic}）に関する4択クイズを重複なく【${task.count}問】作成してください。

【厳格な範囲制限】
・範囲制限: ${task.constraint}
・中1後半の生徒向けです。中2・中3の未習内容（中2の連立方程式、一次関数、平行と合同、天気、化学変化と原子、電流と磁界、地理日本の諸地域、歴史江戸以降、英語不定詞や動名詞など）は【絶対に使用不可】です。中1後半の範囲内でのみ出題してください。
・選択肢は必ず4つ作成し、間違い選択肢（ダミー）も学習者が引っかかりやすい教育的な内容にしてください。
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
        await new Promise(r => sleepWait(r, 2000));
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
      await new Promise(r => sleepWait(r, 2000));
    }
  }
  return [];
}

async function main() {
  console.log(`Starting bulk generation for 1,000 Junior 1 (2nd/3rd Semester / 中1後半) questions...`);
  let allQuestions = [];
  const total = tasks.length;

  for (let i = 0; i < total; i++) {
    const task = tasks[i];
    console.log(`[${i + 1}/${total}] Generating ${task.count} questions: ${task.category} / ${task.topic}...`);
    const qs = await generateQuestions(task, i + 1, total);
    console.log(`  -> Generated ${qs.length} questions`);
    allQuestions = allQuestions.concat(qs);

    // Short pause for API rate limit
    await new Promise(r => sleepWait(r, 1500));
  }

  console.log(`\n========================================`);
  console.log(`Total Junior 1 (Late) questions generated: ${allQuestions.length}`);
  console.log(`========================================\n`);

  let sql = `-- Bulk AI Generated Junior 1 (2nd & 3rd Semester) Quizzes (1,000 questions)\n`;
  for (const q of allQuestions) {
    if (!q || !q.question_text || !Array.isArray(q.options)) continue;
    const optionsJson = JSON.stringify(q.options || []).replace(/'/g, "''");
    const qText = String(q.question_text).replace(/'/g, "''");
    sql += `INSERT INTO quiz_questions (grade_level, category, question_text, options_json, correct_index, difficulty) VALUES ('${q.grade_level}', '${q.category}', '${qText}', '${optionsJson}', ${q.correct_index || 0}, ${q.difficulty || 1});\n`;
  }

  const outPath = path.join(process.cwd(), 'junior1_late_1000_seed.sql');
  fs.writeFileSync(outPath, sql, 'utf8');
  console.log(`Generated SQL saved to: ${outPath}`);
}

main();
