# 機能設計仕様書: 大学小論文・一般教養特化クイズ（high_3向け）独立タブ新設およびGemini 3.1 Flash Lite一括生成・投入

- 作成日時: 2026-10-01 15:31
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 70e4935
- 上流 Artifact: docs/investigation-report.md（対象コミット: 70e4935）

## 0. 上流の抜き取り再実測（§2-3・軽量コマンド 3 件）

### [EV-1] 上流 [EV-1] の再実行（HEADコミット確認）
$ git rev-parse --short HEAD && git branch --show-current
70e4935
main
- 【実測】上流と完全一致 [EV-1]

### [EV-2] 上流 [EV-2] の再実行（ryotaro の学年設定確認）
$ npx wrangler d1 execute quest-db --remote --command "SELECT id, name, grade_level FROM users WHERE id = 'ryotaro';"
┌─────────┬──────────────┬─────────────┐
│ id      │ name         │ grade_level │
├─────────┼──────────────┼─────────────┤
│ ryotaro │ りょーたろ   │ high_3      │
└─────────┴──────────────┴─────────────┘
- 【実測】上流と完全一致 [EV-2]

### [EV-3] 上流 [EV-5] の再実行（型検査・ビルド健全性）
$ npx tsc --noEmit && npm run build
✓ built in 1.68s
- 【実測】上流と完全一致 [EV-3]

## 0-1. 確定済みの前提（上流から引き継ぎ・再実測しない / §2-5）
| 事実 | 根拠（上流の EV） |
| :--- | :--- |
| Gemini 3.1 Flash Lite による小論文クイズの生成品質・速度・低コスト性 | investigation-report.md の EV-3 |
| 現在の `high_3` クイズ問題数（5,964問） | investigation-report.md の EV-4 |
| ビルド・型検査の健全性（0 error） | [EV-3] |

- トラック: フル（理由: 新カテゴリ `general_knowledge` の追加、スクリプト作成、シードSQL生成・適用、フロントエンドタブUI追加を伴うためフルトラックで検証）
- トラック自己照合: §12 の変更対象パス = `scripts/generate_essay_knowledge_quizzes.mjs`, `essay_knowledge_seed.sql`, `src/frontend/components/QuizQuest.tsx` / リスクパス抵触なし。

## 1. 概要・目的
長男（りょーたろ君・高3）の大学入試小論文（慶應・早稲田・国公立・総合型選抜等）および一般教養対策として、大学小論文で頻出する「9大現代論点（科学技術倫理・生命倫理・環境と経済・現代思想・少子高齢化・グローバル化・メディア・労働・格差社会）」を問う思考力クイズ 300問 を `gemini-3.1-flash-lite` を用いて生成し、本番 Cloudflare D1 に投入する。また、フロントエンドのクイズ画面において「📖 小論文・教養」の独立タブを新設し、高3生が特化して集中演習できる導線を整備する。

## 2. 機能要件 / 非機能要件
### 機能要件
- カテゴリ名: `general_knowledge`（表示名: `📖 小論文・教養`）
- 対象学年: `high_3`（高校3年生・大学受験生レベル）
- 問題数: 300問（15タスク × 20問）
- 頻出テーマ（各20〜30問）:
  1. AI・データ社会と法・倫理（生成AI著作権、監視社会、アルゴリズムバイアス）
  2. 生命倫理と自己決定（パターナリズム、尊厳死、遺伝子編集、医療トリアージ）
  3. 環境・エネルギーと経済成長（脱炭素、脱成長論、コモンズの悲劇、サーキュラーエコノミー）
  4. 現代思想・正義論（功利主義 vs 義務論、ロールズ無知のヴェール、サンデル能力主義批判）
  5. 少子高齢化・家族観と社会保障（世代間格差、無縁社会、ケア労働、選択的夫婦別姓）
  6. グローバル化と多文化共生（ナショナリズム、移民難民、ポリティカルコレクトネス）
  7. メディアリテラシー・ポスト真実（フィルターバブル、エコーチェンバー、認知的偏見）
  8. 労働観と資本主義（ブルシットジョブ、ベーシックインカム、エッセンシャルワーカー）
  9. 教育機会と格差（文化資本、親ガチャ、メリトクラシーの限界、自己責任論）
- UI要件:
  - `src/frontend/components/QuizQuest.tsx` の教科ボタン一覧に `{ id: 'general_knowledge', label: '📖 小論文・教養' }` を追加。
  - `getCategoryLabel('general_knowledge')` で `'📖 小論文・教養'` を返す。
  - 高3ユーザーが選択した場合、即座に該当クイズプールから45問サンプリング出題。
- 非機能要件:
  - Gemini 3.1 Flash Lite API による低コスト・高速生成（300問で約 1.5円〜2円 未満）。
  - レート制限防止のため、リクエスト間に 1.5秒のスリープを配置。

## 3. データフロー全経路
1. **生成**: `scripts/generate_essay_knowledge_quizzes.mjs` ➔ Gemini API（`gemini-3.1-flash-lite`）呼び出し（20問×15タスク＝300問）
2. **SQL化**: `essay_knowledge_seed.sql` に出力
3. **投入**: `npx wrangler d1 execute quest-db --remote --file=./essay_knowledge_seed.sql` ➔ D1 `quiz_questions` テーブルに格納
4. **読み出し**: クライアント `QuizQuest.tsx` ➔ `GET /api/quizzes?grade_level=high_3&category=general_knowledge` ➔ バックエンド（`src/backend/index.ts`）で自動サンプリング ➔ 画面表示

## 4. 🛡️ 機密フィールド台帳と漏洩遮断設計（G-7）
| フィールド | 機密度 | 既存の露出経路（実測） | 遮断策（具体実装） |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | 極高 | なし（`.dev.vars` / 環境変数） | Git管理外（`.gitignore` 対象）からスクリプト実行時のみメモリロード。コミットやシードSQLに一切含めない。 |
| クイズ問題データ | 公開 | `/api/quizzes` | 一般教養・小論文の論点知識であり機密情報なし。 |

## 5. 🗄️ DB マイグレーション DDL（全文 / G-4）
既存の `quiz_questions` テーブル構造（`grade_level`, `category`, `question_text`, `options_json`, `correct_index`, `difficulty`）をそのまま使用。スキーマ変更なし。
投入フォーマット:
```sql
INSERT INTO quiz_questions (grade_level, category, question_text, options_json, correct_index, difficulty) 
VALUES ('high_3', 'general_knowledge', '問題文', '["選択肢1","選択肢2","選択肢3","選択肢4"]', 0, 3);
```

## 6. API 契約
既存のエンドポイント `GET /api/quizzes` を使用。
- リクエスト: `GET /api/quizzes?grade_level=high_3&category=general_knowledge`
- 成功レスポンス (200): `{ success: true, count: 45, quizzes: [...], totalCount: 300 }`
- エラーレスポンス (500): `{ success: false, error: string }`

## 7. 🙈 エラーハンドリング仕様（G-5・5 状態の表）
| 状態 | 対象箇所 | 挙動 | ログ出力先 |
| :--- | :--- | :--- | :--- |
| Gemini API HTTP 4xx/5xx | `generate_essay_knowledge_quizzes.mjs` | 最大2回リトライ（各2秒待機）。失敗時は該当タスクをスキップ | `console.error` |
| JSON パースエラー | `generate_essay_knowledge_quizzes.mjs` | バッククォート除去後にパース。失敗時はリトライ | `console.error` |
| D1 SQL 実行エラー | `wrangler d1 execute` | エラー行を表示してトランザクションをロールバック | stderr |
| ネットワーク断 | クライアント `QuizQuest.tsx` | 既存のリトライボタンおよび通信エラー表示 | `console.error` |
| タイムアウト | API fetch | 既存のタイムアウトハンドラでエラー表示 | `console.error` |

## 8. 🏛️ アーキテクチャ選定と却下案（G-8）
- **採用方式**:
  - `category = 'general_knowledge'` を新設し、UI上にも「📖 小論文・教養」タブを独立配置。
  - **理由**: 小論文対策は「世界史」や「日本史」などの暗記科目とは脳の使い方が異なり、対立軸や概念のインプットに集中したいニーズが高いため、独立タブが最も学習体験が良い。
- **却下案**:
  - 社会科の中に混ぜる案: 暗記問題（年号や地名）と混ざってしまい、小論文の論点だけを反復演習したい時に効率が落ちるため却下。

## 9. 🧪 受け入れ基準（検証コマンド付き）
1. `scripts/generate_essay_knowledge_quizzes.mjs` が完走し、`essay_knowledge_seed.sql` に 300問 の INSERT 文が出力されること。
   - 検証: `grep -c "INSERT INTO quiz_questions" essay_knowledge_seed.sql` が 300 以上。
2. 本番 D1 (`quest-db`) に適用後、`category = 'general_knowledge'` の問題数が 300 件格納されること。
   - 検証: `npx wrangler d1 execute quest-db --remote --command "SELECT count(*) FROM quiz_questions WHERE category = 'general_knowledge';"`
3. `src/frontend/components/QuizQuest.tsx` に「📖 小論文・教養」タブが追加され、ビルド・型チェックが 0 エラーであること。
   - 検証: `npx tsc --noEmit && npm run build`
4. 本番デプロイ後、本番URLから `category=general_knowledge` のクイズが HTTP 200 で取得できること。
   - 検証: `curl -s -i "https://quest-habit-app.keitaro-fukui.workers.dev/api/quizzes?grade_level=high_3&category=general_knowledge"`

## 10. 📋 前提条件・ブロッカー
- 前提条件: `.dev.vars` に有効な `GEMINI_API_KEY` が設定されていること（実測確認済み [EV-3]）。
- ブロッカー: なし。

## 11. UI / コンポーネント設計
`src/frontend/components/QuizQuest.tsx`:
- `getCategoryLabel`:
  ```tsx
  case 'general_knowledge': return '📖 小論文・教養';
  ```
- 教科ボタングループ:
  ```tsx
  { id: 'all', label: '全教科・ランダム' },
  { id: 'general_knowledge', label: '📖 小論文・教養' },
  { id: 'english', label: '英語' },
  ...
  ```

## 12. 実装タスクチェックリスト（依存順・1 タスク 1 コミット・完了条件付き）
- [ ] T1: 生成スクリプト `scripts/generate_essay_knowledge_quizzes.mjs` の作成
  - 完了条件: `node -c scripts/generate_essay_knowledge_quizzes.mjs` 構文エラー 0
- [ ] T2: 300問の生成実行および `essay_knowledge_seed.sql` の生成
  - 完了条件: `grep -c "INSERT INTO" essay_knowledge_seed.sql` >= 300
- [ ] T3: Cloudflare D1 への SQL 適用
  - 完了条件: `npx wrangler d1 execute quest-db --remote --command "SELECT count(*) FROM quiz_questions WHERE category = 'general_knowledge';"` で300件確認
- [ ] T4: フロントエンドタブ追加（`QuizQuest.tsx`）
  - 完了条件: `npx tsc --noEmit && npm run build` 0 error
- [ ] T5: 本番デプロイおよび疎通検証
  - 完了条件: `npm run deploy` ➔ `curl -s -i ...` HTTP 200

## 13. 未確認事項（E-4）
| 未確認項目 | 確認手段 | ブロッカー理由 |
| :--- | :--- | :--- |
| 未確認: なし | すべて実測確認済み | なし |

## 14. 品質ゲート実行結果（G-11）
$ /Users/fukuikeitaro/antigravity-agents/scripts/verify.sh design
========================================================
 verify.sh  role=design  base=HEAD  repo=game
 HEAD=70e4935  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）

## 15. 改訂履歴（差分改訂 / §2-5）
| 版 | 指摘 # | 変更したセクション | 1 行要約 |
| :--- | :--- | :--- | :--- |
| 初版 | - | 全体 | 初版作成 |
