import fs from 'fs';
import path from 'path';

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

const CURRICULUM = [
  // 英語
  { grade: 'junior_1_early_mid', cat: 'english', topic: '中1英語 前期中間：アルファベット、be動詞(am/are/is)、一般動詞(I/you)、複数形、基本挨拶・英単語' },
  { grade: 'junior_1_early_final', cat: 'english', topic: '中1英語 前期期末：疑問詞(what/who/where/how)、命令文、人称代名詞(he/she/it/所有格)、三人称単数現在(s/es)' },
  { grade: 'junior_1_late_mid', cat: 'english', topic: '中1英語 後期中間：助動詞can、現在進行形(be+ing)、規則動詞の過去形、時刻/日付/曜日、前置詞(in/on/at)' },
  { grade: 'junior_1_late_final', cat: 'english', topic: '中1英語 後期期末：不規則動詞の過去形、過去進行形、There is/are構文、中1文法・会話表現総まとめ' },
  // 数学
  { grade: 'junior_1_early_mid', cat: 'math', topic: '中1数学 前期中間：正の数・負の数、絶対値、数直線、正負の数の加法・減法・乗法・除法、四則混合計算' },
  { grade: 'junior_1_early_final', cat: 'math', topic: '中1数学 前期期末：文字と式、文字式の表し方、一次式の計算、等式・不等式、一次方程式の解き方と文章題' },
  { grade: 'junior_1_late_mid', cat: 'math', topic: '中1数学 後期中間：関数、比例と反比例の式(y=ax, y=a/x)、座標とグラフの特徴、比例・反比例の利用文章題' },
  { grade: 'junior_1_late_final', cat: 'math', topic: '中1数学 後期期末：平面図形(対称・移動・作図・おうぎ形の弧と面積)、空間図形(体積・表面積)、データの活用(度数分布・代表値)' },
  // 理科
  { grade: 'junior_1_early_mid', cat: 'science', topic: '中1理科 前期中間：ルーペ・顕微鏡の操作手順、花のつくり(被子植物と裸子植物)、葉のつくり・光合成・蒸散、植物の分類' },
  { grade: 'junior_1_early_final', cat: 'science', topic: '中1理科 前期期末：物質の性質(密度・金属と非金属)、気体の性質(酸素・二酸化炭素・水素・アンモニア)、水溶液と濃度、状態変化(融点・沸点)' },
  { grade: 'junior_1_late_mid', cat: 'science', topic: '中1理科 後期中間：光の性質(反射・屈折・全反射・凸レンズの焦点と像)、音の性質(振幅と大きさ・振動数と高さ)、力のはたらき(フックの法則・圧力)' },
  { grade: 'junior_1_late_final', cat: 'science', topic: '中1理科 後期期末：火山と火成岩(深成岩/火山岩)、地震(P波/S波・初期微動継続時間・震度とマグニチュード)、地層と堆積岩・化石' },
  // 社会
  { grade: 'junior_1_early_mid', cat: 'social_studies', topic: '中1社会 前期中間：地球の姿(緯度経度・六大陸三大洋・時差計算)、世界の気候帯(熱帯・乾燥・温帯・冷帯・寒帯)と人々の生活' },
  { grade: 'junior_1_early_final', cat: 'social_studies', topic: '中1社会 前期期末：アジア州・ヨーロッパ州・アフリカ州の地理、日本の位置と領域(領海・排他的経済水域)、都道府県と地方区分' },
  { grade: 'junior_1_late_mid', cat: 'social_studies', topic: '中1社会 後期中間：四大文明、旧石器・縄文・弥生・古墳時代、飛鳥時代(聖徳太子・大化の改新)、奈良時代(律令国家・天平文化)' },
  { grade: 'junior_1_late_final', cat: 'social_studies', topic: '中1社会 後期期末：平安時代(摂関政治・国風文化)、鎌倉時代(武士・御恩と奉公・元寇)、室町時代(日明貿易・応仁の乱・東山文化)' },
  // 国語
  { grade: 'junior_1_early_mid', cat: 'japanese', topic: '中1国語 前期中間：中1重要漢字の読み書き、品詞の分類(自立語・付属語、名詞・動詞・形容詞・形容動詞)、文節と文の成分(主語・述語・修飾語)' },
  { grade: 'junior_1_early_final', cat: 'japanese', topic: '中1国語 前期期末：詩の表現技法(比喩・擬人法・倒置・体言止め・反復)、説明文の要旨と段落構成、敬語の基本、慣用句・ことわざ' },
  { grade: 'junior_1_late_mid', cat: 'japanese', topic: '中1国語 後期中間：古文の基礎(歴史的仮名遣い、竹取物語・蓬莱の玉の枝)、漢文の基礎(返り点・レ点・一二点)、故事成語(矛盾・推敲等)' },
  { grade: 'junior_1_late_final', cat: 'japanese', topic: '中1国語 後期期末：熟語の構成、類義語・対義語・多義語、和語・漢語・外来語、品詞・活用の基礎総まとめ' },
  // 音楽
  { grade: 'junior_1_early_mid', cat: 'music', topic: '中1音楽 前期中間：音符と休符の長さ、拍子(4/4, 3/4, 2/4, 6/8)、ト音記号・ヘ音記号の読譜、合唱の発声法とパート' },
  { grade: 'junior_1_early_final', cat: 'music', topic: '中1音楽 前期期末：強弱記号(p, f, cresc., dim.)、速度記号(Allegro, Andante等)、反復記号(D.C., D.S., Fine)、シューベルト「魔王」鑑賞' },
  { grade: 'junior_1_late_mid', cat: 'music', topic: '中1音楽 後期中間：音階と和音(長調・短調、三和音)、オーケストラの楽器分類(木管・金管・弦・打楽器)、日本の伝統音楽(箏・尺八・雅楽)' },
  { grade: 'junior_1_late_final', cat: 'music', topic: '中1音楽 後期期末：リコーダーの奏法(サミング・タンギング)、日本の民謡(ソーラン節・五木の子守唄等)、ヴィヴァルディ「四季」鑑賞・音楽用語まとめ' },
  // 美術
  { grade: 'junior_1_early_mid', cat: 'art', topic: '中1美術 前期中間：色の三原色と光の三原色、色相環と補色、明度と彩度、暖色・寒色・中性色、レタリング(明朝体・ゴシック体)' },
  { grade: 'junior_1_early_final', cat: 'art', topic: '中1美術 前期期末：透視図法(一点透視図法・二点透視図法・消失点・アイレベル)、遠近法(重なり・空気遠近法)、デッサンと明暗(陰と影)' },
  { grade: 'junior_1_late_mid', cat: 'art', topic: '中1美術 後期中間：絵画材料と技法(水彩・アクリル・スパッタリング・デカルコマニー・ドリッピング・コラージュ)、ピクトグラムのデザイン' },
  { grade: 'junior_1_late_final', cat: 'art', topic: '中1美術 後期期末：立体表現(塑造・心棒・木彫の彫刻刀)、日本の伝統美術(水墨画・浮世絵・風神雷神図)、西洋美術鑑賞の基礎' },
  // 保健体育
  { grade: 'junior_1_early_mid', cat: 'pe', topic: '中1保健体育 前期中間：短距離走(クラウチングスタート)、リレー(バトンパス・テークオーバーゾーン)、走り幅跳び、体つくり運動とストレッチ' },
  { grade: 'junior_1_early_final', cat: 'pe', topic: '中1保健体育 前期期末：水泳(クロール・平泳ぎの泳法と安全ルール)、器械運動(マットの前転/後転/倒立、跳び箱、鉄棒)、スポーツのマナー' },
  { grade: 'junior_1_late_mid', cat: 'pe', topic: '中1保健体育 後期中間：球技(バスケットボール・バレーボール・サッカー・卓球・バドミントンのルールと反則)、武道(柔道・剣道の礼法と基本技)' },
  { grade: 'junior_1_late_final', cat: 'pe', topic: '中1保健体育 後期期末：思春期の心と体の発達(二次性徴・生殖機能)、呼吸器と循環器の働き、運動と健康・けがの応急手当(RICE処置)' },
  // 技術・家庭
  { grade: 'junior_1_early_mid', cat: 'tech_home', topic: '中1技術・家庭 前期中間：木材加工(針葉樹・広葉樹、木取り、さしがね・のこぎり・かんな、接合方法)／家庭＝五大栄養素と六つの基礎食品群' },
  { grade: 'junior_1_early_final', cat: 'tech_home', topic: '中1技術・家庭 前期期末：金属・プラスチックの性質と加工、製図法(キャビネット図・等角図・第三角法)／家庭＝調理の基礎(包丁・計量・加熱調理・食中毒予防)' },
  { grade: 'junior_1_late_mid', cat: 'tech_home', topic: '中1技術・家庭 後期中間：生物育成(植物の栽培条件・肥料・病害虫)、エネルギー変換／家庭＝被服(天然繊維と化学繊維、洗濯表示記号、縫い方の基礎)' },
  { grade: 'junior_1_late_final', cat: 'tech_home', topic: '中1技術・家庭 後期期末：情報技術(2進数・情報モラル・著作権・ネットワーク・計測と制御のフローチャート)／家庭＝住居(換気・採光)と消費生活(クーリングオフ)' },
];

async function generateBatch(item) {
  const prompt = `あなたは日本の中学校（二期制）の定期テスト作成に精通したベテラン教師です。
以下の条件で、中学1年生の定期テスト対策4択問題を正確に 60 問、JSON 配列のみで出力してください（コードブロック記法や余計な説明は不要）。

対象期間: ${item.grade}
教科カテゴリ: ${item.cat}
出題範囲: ${item.topic}

【作成ルール】
1. 学習指導要領に準拠し、定期テストで頻出の知識・計算・用語・鑑賞ポイント・ひっかけ問題を漏れなく網羅すること。
2. 選択肢（options）は必ず4つの明確に異なる文字列配列にし、correct_index は 0〜3 の整数にすること。
3. すべての問題に、なぜその答えになるかを中学生が読んで理解できる解説（explanation：30〜100文字）を必ず付けること。
4. 同じ問題の言い換え重複を避け、多様な角度から出題すること。

出力 JSON 形式:
[
  {
    "grade_level": "${item.grade}",
    "category": "${item.cat}",
    "question_text": "...",
    "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
    "correct_index": 0,
    "difficulty": 1,
    "explanation": "..."
  }
]`;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.45,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error('Not JSON array');
  return parsed;
}

async function main() {
  const results = [];
  const CONCURRENCY = 4;
  for (let i = 0; i < CURRICULUM.length; i += CONCURRENCY) {
    const chunk = CURRICULUM.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(
      chunk.map(async (item, offset) => {
        const idx = i + offset + 1;
        try {
          const qs = await generateBatch(item);
          console.log(`[${idx}/${CURRICULUM.length}] ${item.grade} / ${item.cat} -> ${qs.length}問`);
          return qs;
        } catch (err) {
          console.error(`[${idx}/${CURRICULUM.length}] ${item.grade} / ${item.cat} FAILED:`, err.message);
          return [];
        }
      })
    );
    for (const arr of settled) results.push(...arr);
  }
  const outPath = path.resolve(process.cwd(), 'scripts/seeds/junior1_4terms_raw.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`合計 ${results.length} 問を ${outPath} に保存しました。`);
}

main();
