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
  console.error("Please run with GEMINI_API_KEY=your_key node scripts/generate_high_4200.mjs");
  process.exit(1);
}

const MODEL = 'gemini-3.1-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// 120 Tasks x 35 Questions = 4,200 Questions (High School Overall / 高3復習・共通テストレベル)
const tasks = [
  // --- 英語 (24 tasks x 35 = 840問) ---
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '共通テスト必須英単語①（動詞・変化・動作）', constraint: '高校必須重要動詞の選択' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '共通テスト必須英単語②（名詞・概念・抽象語）', constraint: '高校必須抽象名詞の選択' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '共通テスト必須英単語③（形容詞・副詞・状態）', constraint: '高校必須形容詞副詞の選択' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '英熟語・重要イディオム①（動詞＋前置詞群）', constraint: 'look for, call off, put on 等の動詞句' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '英熟語・重要イディオム②（群前置詞・慣用表現）', constraint: 'in terms of, in order to 等の慣用表現' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '文法：時制（現在完了・過去完了・未来完了・進行形）', constraint: '完了形と時制の一致' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '文法：助動詞（must, should, may, cannot, would rather, used to等）', constraint: '助動詞の意味と完了形(should have done)' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '文法：受動態（態の転換・第4・第5文型の受動態・句動詞の受動態）', constraint: '受動態の複雑な文法判定' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '文法：不定詞（名詞的・形容詞的・副詞的用法・too~to, enough to）', constraint: '不定詞の構文と用法判別' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '文法：動名詞（意味上の主語・完了形動名詞・慣用表現 look forward to -ing等）', constraint: '動名詞と不定詞の使い分け' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '文法：分詞（現在分詞・過去分詞の限定・叙述用法、付帯状況のwith）', constraint: '分詞の形容詞的用法' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '文法：分詞構文（時・理由・条件・譲歩・完了形分詞構文）', constraint: '分詞構文の意味と書き換え' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '文法：関係詞①（関係代名詞 who, which, that, whose, what）', constraint: '関係代名詞の格と制限用法' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '文法：関係詞②（関係副詞 where, when, why, how, 複合関係詞 whoever等）', constraint: '関係副詞と非限定用法' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '文法：仮定法①（仮定法過去・仮定法過去完了・If の省略）', constraint: '仮定法の標準構文' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '文法：仮定法②（I wish, as if, with/without, If it were not for）', constraint: '慣用的な仮定法表現' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '文法：比較（原級・比較級・最上級・no more than, the 比較級, the 比較級）', constraint: '比較の倍数表現と慣用句' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '文法：接続詞と前置詞（because/because of, despite/although 等の識別）', constraint: '品詞の誤りやすい識別' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '文法：特殊構文（倒置・強調構文 It is ~ that・省略・同格）', constraint: '強調構文と否定の倒置' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: 'テーマ語彙：IT・AI・テクノロジー・サイエンス関連英単語', constraint: '最新科学技術ニュース単語' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: 'テーマ語彙：SDGs・環境問題・気候変動・生態系関連英単語', constraint: '環境問題関連単語' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: 'テーマ語彙：経済・ビジネス・金融・グローバリゼーション英単語', constraint: '経済社会関連単語' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: 'テーマ語彙：医療・健康・心理・社会福祉関連英単語', constraint: '医療心理関連単語' },
  { gradeLevel: 'high_3', category: 'english', count: 35, topic: '長文読解短文・文脈穴埋め・パラグラフ展開の判定', constraint: '共通テスト第4・5問形式の短文' },

  // --- 数学 (24 tasks x 35 = 840問) ---
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数I：数と式（展開・因数分解・絶対値・根号計算）', constraint: '高校数学の基礎計算' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数I：集合と論理（集合の包含関係・必要条件と十分条件・命題と対偶）', constraint: '必要条件十分条件の判定' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数I：2次関数①（グラフの頂点・平行移動・最大値と最小値）', constraint: '平方完成と最大最小' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数I：2次関数②（2次方程式の解・判別式・2次不等式の解）', constraint: '判別式Dと不等式の領域' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数I：図形と計量（正弦定理・余弦定理・三角形の面積・空間図形）', constraint: 'sin, cos, tan と三角比' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数I：データの分析（平均値・中央値・分散・標準偏差・箱ひげ図・相関係数）', constraint: '統計とデータの散布' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数A：場合の数（順列 nPr, 組合せ nCr, 重複順列・円順列）', constraint: '場合分けと順列組合せ' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数A：確率（反復試行の確率・条件付き確率・独立な試行）', constraint: '確率の計算' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数A：図形の性質（三角形の心・チェバメネラウスの定理・円に内接する四角形）', constraint: '平面図形の幾何定理' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数A：整数（ユークリッドの互除法・1次不定方程式・約数と倍数）', constraint: '整数の性質と余り' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数II：式と証明・高次方程式（恒等式・等式不等式の証明・複素数・解と係数の関係）', constraint: '複素数と因数定理' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数II：図形と方程式（2点間の距離・内分外分・直線の方程式・円の方程式・軌跡）', constraint: '座標平面上の図形' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数II：三角関数（弧度法・相互関係・加法定理・2倍角・合成公式）', constraint: '三角関数の公式適用' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数II：指数関数と対数関数（指数法則・対数の性質・底の変換公式・対数方程式不等式）', constraint: 'logの計算と方程式' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数II：微分法（導関数の定義・接線の方程式・関数の増減・極値）', constraint: '3次関数の微分と極値' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数II：積分法（不定積分・定積分・面積 S = ∫(f-g)dx 計算）', constraint: '放物線と直線の面積計算' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数B：数列①（等差数列・等比数列の通項と和の公式）', constraint: '基本的な数列の公式' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数B：数列②（Σの計算・階差数列・和 Sn から一般項 an を求める）', constraint: 'シグマ記号の計算' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数B：数列③（漸化式 an+1 = a an + b・数学的帰納法）', constraint: '漸化式のパターン解法' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数B：ベクトル①（平面ベクトルの加減・実数倍・内積・垂直条件・平行条件）', constraint: 'ベクトルの成分と内積' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '数B：ベクトル②（位置ベクトル・分点公式・ベクトルの方程式・空間ベクトル）', constraint: '図形へのベクトル応用' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '共通テスト形式：数学I・A 総合計算問題', constraint: '穴埋め計算形式' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '共通テスト形式：数学II・B 総合計算問題', constraint: '穴埋め計算形式' },
  { gradeLevel: 'high_3', category: 'math', count: 35, topic: '高校数学全般：グラフと公式の理解問題', constraint: '概念と定義の確認' },

  // --- 理科 (24 tasks x 35 = 840問) ---
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '物理基礎：運動の表し方（等加速度直線運動の3公式・v-tグラフ）', constraint: '速度と加速度' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '物理基礎：力と運動（力のつりあい・運動方程式 ma=F・摩擦力・浮力）', constraint: 'ニュートンの運動法則' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '物理基礎：仕事とエネルギー（力学的エネルギー保存の法則・仕事率）', constraint: '位置エネルギーと運動エネルギー' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '物理基礎：熱と波（熱量計算 Q=mcΔT・熱力学第一法則・波の性質 v=fλ）', constraint: '比熱と波動基礎' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '物理基礎：電気と磁気（オームの法則・合成抵抗・ジュールの法則）', constraint: '回路計算と消費電力' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '物理発展：力学（剛体のつりあい・運動量保存の法則・円運動・単振動）', constraint: '高校物理の本格力学' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '物理発展：波動・電磁気（ドップラー効果・レンズの法則・電場と電位・コンデンサー）', constraint: '波と電磁気応用' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '化学基礎：物質の構成（原子の構造・電子配置・周期表・イオン結合・共有結合）', constraint: '原子と化学結合' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '化学基礎：物質量と化学反応式（アボガドロ定数・モル質量・溶液のモル濃度）', constraint: 'molの計算基礎' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '化学基礎：酸と塩基・中和（pH値・中和滴定の計算・指示薬の色変化）', constraint: '酸塩基滴定計算' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '化学基礎：酸化還元反応（酸化数・金属のイオン化傾向・電池と電解）', constraint: '酸化数の決定とイオン化傾向' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '化学発展：無機化学（非金属元素・典型金属元素・遷移元素の性質と反応）', constraint: '無機物質の反応と呈色' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '化学発展：有機化学（脂肪族炭化水素・アルコール・エステル・芳香族化合物）', constraint: '有機化合物の構造と性質' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '生物基礎：生物の特徴と細胞（原核細胞と真核細胞・ミトコンドリア・葉緑体・ATP）', constraint: '細胞小器官とエネルギー代謝' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '生物基礎：遺伝情報とDNA（DNAの転写と翻訳・セントラルドグマ・塩基対）', constraint: 'DNAとRNAの仕組み' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '生物基礎：体内の環境維持（自律神経・ホルモンの内分泌系・血糖値調節）', constraint: 'ホメオスタシスと体液' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '生物基礎：免疫（自然免疫と獲得免疫・体液性免疫・細胞性免疫・ワクチン）', constraint: '免疫系と抗体' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '生物基礎：植生とバイオーム（日本のバイオーム・生態系のバランス）', constraint: '世界のバイオームと植生遷移' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '生物発展：生殖と発生（減数分裂・受精・胚の発生・誘導）', constraint: '減数分裂と発生の仕組み' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '地学基礎：地球の構造とプレート（地震波・モホ面・プレートテクトニクス・火山）', constraint: '地球内部構造と構造運動' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '地学基礎：大気と海洋（気圧配置・温暖前線寒冷前線・海流と気候）', constraint: '気象と海洋の循環' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '地学基礎：宇宙の構成（太陽系・主系列星・銀河系・宇宙の膨張）', constraint: '天文学と宇宙の基礎' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '理科総合：科学技術と環境問題（再生可能エネルギー・温室効果ガス）', constraint: '環境と科学の総合知識' },
  { gradeLevel: 'high_3', category: 'science', count: 35, topic: '共通テスト形式：理科基礎・共通テーマ問題', constraint: '融合的な知識問題' },

  // --- 社会 (24 tasks x 35 = 840問) ---
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '日本史：安土桃山時代（織田信長・豊臣秀吉・太閤検地・刀狩・関ヶ原）', constraint: '織豊政権の政策と戦い' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '日本史：江戸時代初期（徳川家康・幕藩体制・参勤交代・鎖国）', constraint: '江戸幕府の仕組み' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '日本史：江戸時代中後期（三大改革・元禄化・化政文化・商品経済）', constraint: '享保・寛政・天保の改革' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '日本史：幕末（ペリー来航・尊王攘夷・薩長同盟・大政奉還）', constraint: '明治維新直前の動乱' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '日本史：明治時代①（富国強兵・殖産興業・廃藩置県・地租改正）', constraint: '明治新政府の改革' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '日本史：明治時代②（自由民権運動・大日本帝国憲法・日清日露戦争）', constraint: '近代国家の成立と外交' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '日本史：大正時代（大正デモクラシー・政党内閣・普通選挙法・治安維持法）', constraint: '大正期の政治と社会' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '日本史：昭和戦前・戦中（世界恐慌・日中戦争・太平洋戦争・満州事変）', constraint: '昭和の動乱と戦争' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '日本史：戦後復興〜現代（GHQ改革・日本国憲法・高度経済成長・石油ショック）', constraint: '戦後日本の復興と経済成長' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '世界史：西洋近世（ルネサンス・大航海時代・宗教改革・絶対王政）', constraint: '近世ヨーロッパの発展' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '世界史：市民革命（イギリス革命・アメリカ独立戦争・フランス革命・人権宣言）', constraint: '近代民主主義の成立' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '世界史：産業革命と帝国主義（イギリス産業革命・列強のアジア・アフリカ分割）', constraint: '19世紀の世界情勢' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '世界史：二つの世界大戦（第一次世界大戦・ロシア革命・世界恐慌・第二次世界大戦）', constraint: '20世紀前半の国際政治' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '世界史：冷戦時代〜現代（東西冷戦・キューバ危機・EU成立・ソ連崩壊）', constraint: '戦後世界秩序の変遷' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '公共・政経：民主政治と日本国憲法（基本的人権の尊重・三権分立・最高裁判所）', constraint: '憲法の原則と機構' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '公共・政経：国会と内閣（衆議院の優越・内閣不信任案・予算審議・条約承認）', constraint: '統治機構の働き' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '公共・政経：市場メカニズムと経済（需要供給曲線・価格の決定・インフレデフレ）', constraint: 'ミクロ経済とマクロ経済' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '公共・政経：金融と日本銀行（金融政策・公開市場操作・金利・通貨の発行）', constraint: '中央銀行の働き' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '公共・政経：財政と税金（直接税間接税・公債・社会保障制度・少子高齢化）', constraint: '国の財政と福祉' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '公共・政経：国際社会と国連（安全保障理事会・拒否権・PKO・WTO/IMF）', constraint: '国際秩序と組織' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '地理探究：世界の気候区分と生活（熱帯・乾燥帯・温帯・冷帯・寒帯）', constraint: 'ケッペンの気候区分' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '地理探究：世界の産業と資源（石油・石炭・穀物・自動車・ハイテク産業）', constraint: '世界経済と資源貿易' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '地理探究：地形図の読み方と都市問題（等高線・縮尺・人口集中・ドーナツ化現象）', constraint: '地図判読と都市構造' },
  { gradeLevel: 'high_3', category: 'social_studies', count: 35, topic: '共通テスト形式：歴史・政経・地理融合問題', constraint: '共通テストの総合選択題' },

  // --- 国語 (24 tasks x 35 = 840問) ---
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '現代文語彙①：評論重要単語（アイデンティティ・パラダイム・レトリック等）', constraint: 'カタカナ評論用語の意味' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '現代文語彙②：評論重要単語（普遍と特殊・主観と客観・抽象と具体）', constraint: '対比構造の二項対立用語' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '現代文語彙③：小説・文学重要単語（心情・態度を表す和語・語彙）', constraint: '小説の心情表現用語' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '現代文：四字熟語と慣用表現（高校卒業レベルの漢字・熟語意味）', constraint: '難度高めの四字熟語' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '漢字書き取り①：同音異義語・間違いやすい高校漢字', constraint: '漢字の正しい書き分け' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '漢字書き取り②：難読漢字・熟語の読み方（表外読み）', constraint: '高校漢字の正しい読み' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '古文単語①：必須古文単語（あはれなり・をかし・いみじ・ありがたし等）', constraint: '最重要古単語の意味' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '古文単語②：心境・評価を表す古文単語（ゆかし・すさまじ・めざまし等）', constraint: '心情系古文単語' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '古文単語③：動詞・形容動詞の古文単語（失す・おどろく・ののしる等）', constraint: '古文動詞の意味' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '古文文法①：助動詞の活用と意味（き・けり・つ・ぬ・たり・り）', constraint: '過去・完了の助動詞' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '古文文法②：助動詞の活用と意味（む・べし・じ・まじ・らし・めり）', constraint: '推量・意志・否定推量の助動詞' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '古文文法③：助動詞の活用と意味（る・らる・す・さす・しむ）', constraint: '受動・自発・可能・尊敬・使役' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '古文文法④：助詞の識別（「に」「で」「な」「ば」「ぞ・なむ・や・か・こそ」係り結び）', constraint: '助詞の識別と係り結びの法則' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '古文文法⑤：敬語表現（尊敬語・謙譲語・丁寧語の識別と主語の判定）', constraint: '給ふ・奉る・侍る等の敬語補助動詞' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '古文学習：和歌の修辞法（枕詞・掛詞・縁語・序詞・体切れ）', constraint: '和歌の技法と解釈' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '古文学習：文学史（竹取物語・源氏物語・枕草子・徒然草・平家物語の知識）', constraint: '古典文学作品と作者' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '漢文基礎①：返り点とレ点・一二点・上下点・中点の読み順', constraint: '訓読の基本法則' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '漢文句法①：否定形（不・非・無・未・莫）と二重否定', constraint: '否定の漢文句型' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '漢文句法②：疑問形・反語形（何・孰・安・豈・敢）', constraint: '疑問反語の書き下し文と意味' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '漢文句法③：使役形・受身形（使・教・令・被・為）', constraint: '使役受身の漢文句型' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '漢文句法④：仮定形・限定形・比較形・再読文字（未・将・当・宜・須）', constraint: '再読文字と重要句法' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '漢文学習：故事成語の成り立ちと意味（蛇足・矛盾・推敲・塞翁が馬等）', constraint: '有名故事成語' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '共通テスト形式：古文・漢文読解解釈問題', constraint: '共通テスト第3・4問形式' },
  { gradeLevel: 'high_3', category: 'japanese', count: 35, topic: '国語総合：文章表現・推敲・対話文文脈問題', constraint: '共通テスト第1問実用文形式' },
];

async function generateQuestions(task, index, total, retries = 2) {
  const gradeTitle = '高校生（高1〜高3・共通テスト・総復習レベル）';
  const catLabel = task.category === 'english' ? '英語' : task.category === 'social_studies' ? '社会' : task.category === 'science' ? '理科' : task.category === 'math' ? '数学' : '国語';

  const prompt = `あなたは日本の大学受験・高校教育に精通した最高峰の学習AIです。
${gradeTitle}向けの「${catLabel}」科目（詳細テーマ: ${task.topic}）に関する4択クイズを重複なく【${task.count}問】作成してください。

【厳格な範囲・難易度指定】
・範囲制限: ${task.constraint}
・高校生（高3生の総復習および共通テスト基礎）に適した質の高い教育問題を作成してください。
・選択肢は必ず4つ作成し、間違い選択肢（ダミー）も紛らわしく教育的な内容にしてください。
・同じ問題や似通った表現の問題が絶対に重複しないよう、様々な角度から出題してください。

【出力フォーマット】
以下のキーを持つ厳密なJSON配列（Markdown装飾コードブロックなし）のみを出力してください：
[
  {
    "question_text": "問題文",
    "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
    "correct_index": 0,
    "difficulty": 2
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
        grade_level: 'high_3',
        category: task.category,
        question_text: q.question_text,
        options: q.options,
        correct_index: q.correct_index ?? 0,
        difficulty: q.difficulty ?? 2
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
  console.log(`Starting bulk generation for 4,200 High School Overall questions...`);
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
  console.log(`Total High School questions generated: ${allQuestions.length}`);
  console.log(`========================================\n`);

  let sql = `-- Bulk AI Generated High School Overall Quizzes (4,200 questions)\n`;
  for (const q of allQuestions) {
    if (!q || !q.question_text || !Array.isArray(q.options)) continue;
    const optionsJson = JSON.stringify(q.options || []).replace(/'/g, "''");
    const qText = String(q.question_text).replace(/'/g, "''");
    sql += `INSERT INTO quiz_questions (grade_level, category, question_text, options_json, correct_index, difficulty) VALUES ('${q.grade_level}', '${q.category}', '${qText}', '${optionsJson}', ${q.correct_index || 0}, ${q.difficulty || 1});\n`;
  }

  const outPath = path.join(process.cwd(), 'high_4200_seed.sql');
  fs.writeFileSync(outPath, sql, 'utf8');
  console.log(`Generated SQL saved to: ${outPath}`);
}

main();
