import fs from 'fs';
import path from 'path';

// .dev.vars から GEMINI_API_KEY を読み込む
const devVarsPath = path.resolve(process.cwd(), '.dev.vars');
let apiKey = process.env.GEMINI_API_KEY || '';
if (!apiKey && fs.existsSync(devVarsPath)) {
  const lines = fs.readFileSync(devVarsPath, 'utf-8').split('\n');
  for (const line of lines) {
    const m = line.match(/^GEMINI_API_KEY=(.+)$/);
    if (m) apiKey = m[1].trim().replace(/^["']|["']$/g, '');
  }
}
if (!apiKey) {
  console.error('GEMINI_API_KEY が見つかりません');
  process.exit(1);
}

const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

const SIGN_KEYS = [
  'sign_stop', 'sign_slow', 'sign_no_entry', 'sign_no_thoroughfare', 'sign_no_cars',
  'sign_no_parking', 'sign_no_park_only', 'sign_speed_30', 'sign_speed_40', 'sign_speed_50',
  'sign_one_way', 'sign_designated_dir', 'sign_crosswalk', 'sign_priority',
  'sign_warn_cross', 'sign_warn_t', 'sign_warn_rail', 'sign_warn_school', 'sign_warn_slippery'
];
const HAZARD_KEYS = [
  'hazard_residential_ball', 'hazard_intersection_bike', 'hazard_night_rain',
  'hazard_highway_merge', 'hazard_school_bus', 'hazard_bicycle_overtake'
];

const BATCHES = [
  // 仮免学科 (driving_karimen) 10単元
  { category: 'driving_karimen', count: 30, format: 'ox', topic: '運転者の心得・信号機の意味（青・黄・赤・矢印信号・点滅信号・手信号）' },
  { category: 'driving_karimen', count: 30, format: 'ox', topic: '道路標識（規制標識・指示標識・警戒標識・補助標識）と道路標示の意味' },
  { category: 'driving_karimen', count: 30, format: 'ox', topic: '車両の通行場所・車両通行帯・バス専用/優先レーン・軌道敷内の通行' },
  { category: 'driving_karimen', count: 30, format: 'ox', topic: '交差点の通行方法・右折左折・優先関係・見通しの悪い交差点の徐行' },
  { category: 'driving_karimen', count: 30, format: 'ox', topic: '踏切の通過・横断歩道と自転車横断帯・歩行者保護・安全地帯' },
  { category: 'driving_karimen', count: 30, format: 'ox', topic: '最高速度（生活道路の法定速度30km/h・中央線あり60km/h・原付30km/h）・車間距離・停止距離' },
  { category: 'driving_karimen', count: 30, format: 'ox', topic: '追い越しと追い抜き（追越し禁止場所・二重追越し・自転車追越し時の側方間隔）' },
  { category: 'driving_karimen', count: 30, format: 'ox', topic: '駐停車禁止場所・駐車禁止場所・駐車方法・停車と駐車の定義・時間制限駐車区間' },
  { category: 'driving_karimen', count: 30, format: 'ox', topic: '合図の方法と時期・警音器（クラクション）の使用制限・乗車定員と積載制限' },
  { category: 'driving_karimen', count: 30, format: 'ox', topic: '緊急自動車への進路譲り・初心運転者標識・仮免許の運転条件・最新2026年4月仮免17歳6か月要件' },
  // 本免学科 (driving_honmen) 10単元
  { category: 'driving_honmen', count: 30, format: 'ox', topic: '高速道路の通行ルール（最低速度・最高速度・合流・故障時の停止表示器材・追越車線）' },
  { category: 'driving_honmen', count: 30, format: 'ox', topic: '夜間・悪天候（雨・霧・雪・凍結路面）の運転と灯火（ハイビーム・ロービーム・蒸発現象）' },
  { category: 'driving_honmen', count: 30, format: 'ox', topic: '自然現象と運転（遠心力・カーブ・ハイドロプレーニング現象・フェード現象・ベーパーロック現象）' },
  { category: 'driving_honmen', count: 30, format: 'ox', topic: '自動車の点検・日常点検・タイヤ溝（1.6mm）・免許制度（マイナ免許証・更新・点数制度）' },
  { category: 'driving_honmen', count: 30, format: 'ox', topic: '交通事故発生時の措置・負傷者救護・応急救護処置（AED・胸骨圧迫・気道確保）' },
  { category: 'driving_honmen', count: 30, format: 'ox', topic: '二輪車・原動機付自転車・特定小型原動機付自転車（電動キックボード等）の特性と通行ルール' },
  { category: 'driving_honmen', count: 30, format: 'ox', topic: '自転車の通行ルール・2026年4月導入の自転車青切符（16歳以上）・ながらスマホ・酒気帯び運転罰則' },
  { category: 'driving_honmen', count: 30, format: 'ox', topic: '駐車・保管場所・けん引・故障車のけん引方法・自動車の登録と車検・自賠責保険' },
  { category: 'driving_honmen', count: 30, format: 'ox', topic: '生活道路（法定速度30km/h）の安全運転・ゾーン30・チャイルドシート（6歳未満）・シートベルト' },
  { category: 'driving_honmen', count: 30, format: 'ox', topic: '本免学科試験で特に引っかかりやすい難問・例外規定（「〜しなければならない」「〜でよい」のひっかけ）' },
  // 危険予測イラスト (driving_hazard) 2バッチ
  { category: 'driving_hazard', count: 20, format: '4choice', topic: '危険予測イラスト問題（住宅街・交差点右直・夜間雨天・高速合流・通学バス・自転車追越し）' },
  { category: 'driving_hazard', count: 20, format: '4choice', topic: '危険予測イラスト問題（下り坂カーブ・踏切前後・夕暮れ時・駐車場出入口・死角）' },
  // 適性検査対策 (driving_aptitude) 2バッチ
  { category: 'driving_aptitude', count: 25, format: '4choice', topic: '運転適性検査（OD式・K式）の目的・性格検査への向き合い方・安全態度の考え方' },
  { category: 'driving_aptitude', count: 25, format: '4choice', topic: '運転適性検査（図形抹消・反応速度・注意配分・衝動性チェック）の攻略ポイントと安全運転への活かし方' },
];

async function generateBatch(batch) {
  const isOx = batch.format === 'ox';
  const formatInstruction = isOx
    ? `出題形式は日本の運転免許学科試験の「○×問題」です。options は必ず ["○（正しい）", "×（誤り）"] の2要素にし、correct_index は 0（○）または 1（×）にしてください。`
    : `出題形式は「4択問題」です。options は必ず4つの明確に異なる選択肢配列にし、correct_index は 0〜3 の整数にしてください。`;

  const imageInstruction =
    batch.category === 'driving_hazard'
      ? `image_key には必ず次のいずれかを状況に合わせて設定してください: ${HAZARD_KEYS.join(', ')}`
      : batch.topic.includes('道路標識')
      ? `標識を問う問題には image_key として次の中から該当するものを選んでください（該当なしは null）: ${SIGN_KEYS.join(', ')}`
      : `image_key は null にしてください。`;

  const prompt = `あなたは日本の自動車教習所・運転免許試験のベテラン指導員です。
以下の条件で、日本の運転免許試験の予想問題を正確に ${batch.count} 問、JSON 配列のみで出力してください（Markdown のコードブロックや余計な説明文は一切不要）。

対象カテゴリ: ${batch.category}
テーマ: ${batch.topic}
${formatInstruction}
${imageInstruction}

【重要・最新2026年11月時点の日本の道路交通法に厳密準拠すること】
- 2026年9月施行: 中央線や車両通行帯のない一般道路（生活道路）の法定最高速度は「時速30km」（中央線等がある一般道路は原則60km/h）。
- 2026年4月施行: 自転車の交通違反に青切符制度導入（16歳以上対象）。自動車が自転車を追い越す際は十分な側方間隔または安全な速度で進行。
- 2026年4月施行: 普通免許等の仮免・本試験の受験資格は17歳6か月以上（免許証交付は18歳から）。
- 2025年3月運用開始: マイナ免許証（従来免許証のみ/マイナ免許証のみ/両方持ちの3択）。
- 問題文は曖昧さをなくし、本番の「ひっかけ」も含めつつ法令上100%正誤が確定できる文章にすること。
- 各問題に必ず「なぜ○/×なのか」「法令の根拠やひっかけポイント」を解説する explanation（30〜100文字程度）を付けること。

出力 JSON スキーマ（配列）:
[
  {
    "category": "${batch.category}",
    "question_text": "...",
    "options": ${isOx ? '["○（正しい）", "×（誤り）"]' : '["選択肢1", "選択肢2", "選択肢3", "選択肢4"]'},
    "correct_index": 0,
    "difficulty": 1,
    "image_key": null,
    "explanation": "..."
  }
]`;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error('Response is not JSON array');
  return parsed;
}

async function main() {
  const all = [];
  for (let i = 0; i < BATCHES.length; i++) {
    const b = BATCHES[i];
    process.stdout.write(`[${i + 1}/${BATCHES.length}] ${b.category} (${b.topic.slice(0, 20)}...) `);
    try {
      const items = await generateBatch(b);
      console.log(`-> ${items.length}問`);
      all.push(...items);
    } catch (err) {
      console.error(`FAILED:`, err.message);
    }
  }
  const outPath = path.resolve(process.cwd(), 'scripts/seeds/driving_generated_raw.json');
  fs.writeFileSync(outPath, JSON.stringify(all, null, 2), 'utf-8');
  console.log(`合計 ${all.length} 問を ${outPath} に保存しました。`);
}

main();
