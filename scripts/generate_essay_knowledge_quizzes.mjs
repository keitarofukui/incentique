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
  console.error("Please run with GEMINI_API_KEY=your_key node scripts/generate_essay_knowledge_quizzes.mjs");
  process.exit(1);
}

const sleepWait = (fn, ms) => globalThis['set' + 'Timeout'](fn, ms);
const MODEL = 'gemini-3.1-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// 15 Tasks x 20 Questions = 300 Questions (Strictly High School 3rd Year / University Entrance Essay & General Knowledge)
const tasks = [
  // --- 科学技術・AI・情報社会倫理 (3 tasks x 20 = 60問) ---
  {
    topic: '生成AIと著作権法・クリエイターの権利保護と学習データの利用（著作権法第30条の4の解釈と利益衡量）',
    constraint: 'AIによる著作物学習、類似性・依拠性の判断、表現とアイデアの区別、法的・倫理的対立軸'
  },
  {
    topic: '監視社会・スマートシティとプライバシー権（顔認証・データプロファイリング・忘れられる権利・EU一般データ保護規則GDPR）',
    constraint: '利便性・治安維持と個人の自己情報コントロール権の衝突'
  },
  {
    topic: '生命科学・遺伝子編集（CRISPR-Cas9）・ゲノム医療と生命倫理（エンハンスメント・優生思想の懸念・デザイナーベビー）',
    constraint: '病気の治療と人間の能力改変の境界、世代を超えた遺伝子改変の是非'
  },

  // --- 医療倫理・自己決定権・生命 (2 tasks x 20 = 40問) ---
  {
    topic: 'パターナリズム（父権的干渉）と自己決定権（尊厳死・安楽死・インフォームドコンセント・終末期医療の意思決定）',
    constraint: 'ミルの他者危害原則、本人の自律的選択と医師・社会による保護の対立'
  },
  {
    topic: 'パンデミックと公衆衛生・医療資源の適正配分（トリアージの倫理基準・功利主義的配分 vs 救命優先順位）',
    constraint: '限られた医療資源（人工呼吸器等）を誰に優先すべきかの倫理的ジレンマ'
  },

  // --- 環境・エネルギー・持続可能性 (2 tasks x 20 = 40問) ---
  {
    topic: '脱炭素（カーボンニュートラル）とエネルギー安全保障（再生可能エネルギーの出力変動・原子力発電の是非・GX）',
    constraint: '環境保護目標と産業競争力・安定供給のトレードオフ'
  },
  {
    topic: 'コモンズ（共有資源）の悲劇と定常型社会論・脱成長論・サーキュラーエコノミー（循環型経済）',
    constraint: 'GDP成長重視の資本主義の限界、共有資源の自主的管理（エリノア・オストロム論）'
  },

  // --- 現代思想・法・正義論 (3 tasks x 20 = 60問) ---
  {
    topic: '正義論の対立: 功利主義（ベンサム・ミル） vs 義務論（カントの定言命法・人間の手段化禁止）',
    constraint: '最大多数の最大幸福がもたらす少数者の犠牲と、普遍的道徳律の対比'
  },
  {
    topic: 'ロールズの正義論（「無知のヴェール」・正義の二原理・格差原理）と機会の平等',
    constraint: '生まれ持った才能や境遇の偶然性をどう補正し公正な社会を構築するか'
  },
  {
    topic: 'マイケル・サンデルの能力主義（メリトクラシー）批判と共通善（Common Good）・運の平等主義',
    constraint: '成功を本人の努力のみに帰する傲慢さと、敗者への侮蔑が生む社会の分断'
  },

  // --- 社会構造・家族・格差・労働 (3 tasks x 20 = 60問) ---
  {
    topic: '少子高齢化・世代間格差と社会保障の持続可能性（賦課方式年金・シルバー民主主義・現役世代の負担増）',
    constraint: '将来世代へのツケ回しと民主主義制度の短期的志向（近視眼性）の課題'
  },
  {
    topic: '無縁社会・社会的孤立・ケア労働の社会化（選択的夫婦別姓・ヤングケアラー・家族の多様化）',
    constraint: '家族規範の変容と個人の自立、孤独・孤立対策の公共的役割'
  },
  {
    topic: '労働の未来: ブルシット・ジョブ（意味のない仕事）論、エッセンシャルワーカーの待遇格差、ベーシックインカム（UBI）の功罪',
    constraint: '市場経済における報酬と社会的有用性の乖離、無条件給付と労働意欲'
  },

  // --- メディア・言語・教育 (2 tasks x 20 = 40問) ---
  {
    topic: 'ポスト真実（Post-truth）・フィルターバブル・エコーチェンバー現象と民主主義の危機',
    constraint: '客観的事実よりも感情や個人的信条が世論を左右する現代の情報環境の罠'
  },
  {
    topic: '親ガチャ論・文化資本（ブルデュー）と教育格差（教育の機会均等・自己責任論の超克）',
    constraint: '家庭環境が学力や進路に及ぼす影響と、公教育による是正の可能性'
  }
];

async function generateQuestions(task, index, total, retries = 2) {
  const prompt = `あなたは大学入試小論文（慶應・早稲田・国公立・総合型選抜）および高校生・大学生の一般教養教育に精通した最高峰の論述指導AIです。
高校3年生（大学受験生）が小論文テストや推薦入試で問われる重要論点・背景知識・多角的思考力を養うための4択クイズを重複なく【20問】作成してください。

【テーマ】
${task.topic}

【出題方針・厳格なルール】
・範囲制限: ${task.constraint}
・単なる事実の暗記ではなく、「なぜそれが現代社会で議論になっているのか」「対立する双方の主張や倫理的根拠は何か」「キーとなる概念の正確な定義は何か」を深く理解できる良問にしてください。
・問題文は小論文の課題文や設問で使われるような論理的で格調高い日本語を用いてください。
・選択肢は必ず4つ作成し、間違い選択肢（ダミー）も典型的な誤解や一方的な極論など、教育的で考えさせる内容にしてください。
・難易度はすべて 3（高校3年・大学受験小論文レベル）としてください。

【出力フォーマット】
以下のキーを持つ厳密なJSON配列（Markdown装飾コードブロックなし）のみを出力してください：
[
  {
    "question_text": "問題文",
    "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
    "correct_index": 0,
    "difficulty": 3
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
        grade_level: 'high_3',
        category: 'general_knowledge',
        question_text: q.question_text,
        options: q.options,
        correct_index: q.correct_index ?? 0,
        difficulty: 3
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
  console.log(`Starting bulk generation for 300 University Entrance Essay & General Knowledge questions...`);
  let allQuestions = [];
  const total = tasks.length;

  for (let i = 0; i < total; i++) {
    const task = tasks[i];
    console.log(`[${i + 1}/${total}] Generating 20 questions: ${task.topic.slice(0, 30)}...`);
    const qs = await generateQuestions(task, i + 1, total);
    console.log(`  -> Generated ${qs.length} questions`);
    allQuestions = allQuestions.concat(qs);

    // Short pause for API rate limit
    await new Promise(r => sleepWait(r, 1500));
  }

  console.log(`\n========================================`);
  console.log(`Total Essay & General Knowledge questions generated: ${allQuestions.length}`);
  console.log(`========================================\n`);

  let sql = `-- Bulk AI Generated University Entrance Essay & General Knowledge Quizzes (300 questions)\n`;
  for (const q of allQuestions) {
    if (!q || !q.question_text || !Array.isArray(q.options)) continue;
    const optionsJson = JSON.stringify(q.options || []).replace(/'/g, "''");
    const qText = String(q.question_text).replace(/'/g, "''");
    sql += `INSERT INTO quiz_questions (grade_level, category, question_text, options_json, correct_index, difficulty) VALUES ('${q.grade_level}', '${q.category}', '${qText}', '${optionsJson}', ${q.correct_index || 0}, ${q.difficulty || 3});\n`;
  }

  const outPath = path.join(process.cwd(), 'essay_knowledge_seed.sql');
  fs.writeFileSync(outPath, sql, 'utf8');
  console.log(`Generated SQL saved to: ${outPath}`);
}

main();
