# 機能設計仕様書: 中学1年後半クイズ約1,000問のGemini 3.1 Flash Lite一括生成・投入およびUI調整

- 作成日時: 2026-10-01 14:52
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 5f0a612
- 上流 Artifact: docs/investigation-report.md（対象コミット: 5f0a612）

## 0. 上流の抜き取り再実測（§2-3・軽量コマンド 3 件）

### [EV-1] 上流 [EV-1] の再実行（HEADコミット確認）
$ git rev-parse --short HEAD && git branch --show-current
5f0a612
main
- 【実測】上流と完全一致 [EV-1]

### [EV-2] 上流 [EV-8] の再実行（QuizQuest.tsx のjunior_1ラベル）
$ sed -n '243,246p' src/frontend/components/QuizQuest.tsx
              { id: 'all', label: '全学年' },
              { id: 'junior_1', label: '🎒 中1レベル(前半)' },
              { id: 'high_3', label: '🎓 高校レベル(高1〜2)' },
            ]
- 【実測】上流と完全一致 `src/frontend/components/QuizQuest.tsx:L243-L246` [EV-2]

### [EV-3] 上流 [EV-5] の再実行（既存生成スクリプト）
$ ls -1 scripts/generate_junior1_2100.mjs
scripts/generate_junior1_2100.mjs
- 【実測】上流と完全一致 [EV-3]

### [EV-4] 上流 [EV-4] の再確認（型検査とビルド健全性）
$ npx tsc --noEmit
- 【実測】型エラー 0 件で正常通過 [EV-4]

## 0-1. 確定済みの前提（上流から引き継ぎ・再実測しない / §2-5）
| 事実 | 根拠（上流の EV） |
| :--- | :--- |
| 本番 D1 (`quest-db`) の `quiz_questions` テーブル構造および既存 3,594問の junior_1 問題 | investigation-report.md の EV-2 |
| Gemini 3.1 Flash Lite (`gemini-3.1-flash-lite`) の API 疎通と料金・速度 | investigation-report.md の EV-3 |
| 20問生成時の消費トークン（Input 162 / Output 1,086 tokens） | investigation-report.md の EV-4 |
| ビルド・型検査の健全性（0 error） | [EV-4] |

- トラック: フル（理由: 生成スクリプト追加・シードSQL適用・UI文言調整を伴うため厳格にフルトラックで検証）
- トラック自己照合: §12 の変更対象パス = `scripts/generate_junior1_late_1000.mjs`, `junior1_late_1000_seed.sql`, `src/frontend/components/QuizQuest.tsx` / リスクパス抵触なし。

## 1. 概要・目的
ユーザー要望「中学1年の後半のクイズを1000問ほど追加してほしい。Gemini3.1FLASHliteで安く作ってね」に基づき、文部科学省指導要領に準拠した中学1年生後半（2学期後半〜3学期）のクイズ問題1,000問（英語・数学・理科・社会・国語 各200問）を最新高コスパモデル `gemini-3.1-flash-lite` を用いて一括生成し、Cloudflare D1 にシード投入する。また、フロントエンドの学年セレクター文言を実態に合わせて更新する。

## 2. 機能要件 / 非機能要件
### 機能要件
- 中1後半カリキュラム（英語: 過去形・進行形・can・疑問詞、数学: 比例反比例・平面空間図形・データ活用、理科: 光・音・力・地層地震、社会: 世界地理・平安鎌倉室町戦国、国語: 文法品詞・古典入門・敬語漢字）に準拠した4択クイズ1,000問を生成すること。
- 生成結果を D1 互換の INSERT 文 SQL ファイル（`junior1_late_1000_seed.sql`）として出力すること。
- 本番 D1 データベース（`quest-db`）に適用し、クイズ出題 API `/api/quizzes?grade_level=junior_1` から出題されること。
- `src/frontend/components/QuizQuest.tsx` のタブ表示を「🎒 中1レベル(前半)」から「🎒 中1レベル」に変更すること。

### 非機能要件
- APIコストは 10円未満（約0.017ドル）に抑えること（Gemini 3.1 Flash Lite 活用）。
- Gemini API のレートリミットを回避するため、リクエスト間に 1.5秒のスリープを設けること。
- 既存の高校生ユーザー（りょーたろ）に対する反則防止ロジック（0pt遮断）に悪影響を与えないこと。

## 3. データフロー全経路
1. **生成**: `scripts/generate_junior1_late_1000.mjs` ➔ Gemini API（`gemini-3.1-flash-lite`）呼び出し（20問×50タスク＝1,000問）
2. **SQL化**: 整形された JSON を `junior1_late_1000_seed.sql` に書き出し
3. **投入**: `npx wrangler d1 execute quest-db --remote --file=./junior1_late_1000_seed.sql` ➔ D1 テーブル `quiz_questions` に永続化
4. **読み出し**: クライアント `QuizQuest.tsx` ➔ `GET /api/quizzes?grade_level=junior_1` ➔ `src/backend/index.ts:L910-L1060`（Fisher-Yates サンプリング）➔ 45問を返却 ➔ 画面に表示

## 4. 🛡️ 機密フィールド台帳と漏洩遮断設計（G-7）
| フィールド | 機密度 | 既存の露出経路（実測） | 遮断策（具体実装） |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | 極高 | なし（`.dev.vars` / 環境変数） | Git管理外（`.gitignore` 対象）からスクリプト実行時のみメモリロード。SQLファイルやコミットログに一切出力しない。 |
| クイズ問題データ | 公開 | `/api/quizzes` | 機密情報・個人情報・トークンは含まれない一般的な学習問題のため露出リスクなし。 |

## 5. 🗄️ DB マイグレーション DDL（全文 / G-4）
既存の `quiz_questions` テーブル定義をそのまま使用するため、スキーマ変更（`ALTER TABLE` / `CREATE TABLE`）は不要。
投入されるレコードの SQL フォーマット:
```sql
INSERT INTO quiz_questions (grade_level, category, question_text, options_json, correct_index, difficulty) 
VALUES ('junior_1', 'english', '問題文', '["選択肢1","選択肢2","選択肢3","選択肢4"]', 0, 1);
```

## 6. API 契約
既存 API の仕様に変更なし。
- `GET /api/quizzes?grade_level=junior_1&category=all`
  - 成功レスポンス: `{ success: true, count: 45, quizzes: [...], totalCount: 12288 }`
  - エラーレスポンス: `{ success: false, error: string }` (HTTP 500)

## 7. 🙈 エラーハンドリング仕様（G-5・5 状態の表）
| 状態 | 対象箇所 | 挙動 | ログ出力先 |
| :--- | :--- | :--- | :--- |
| Gemini API HTTP 4xx/5xx | `generate_junior1_late_1000.mjs` | 最大2回リトライ（各2秒待機）。失敗時は該当タスクをスキップし処理継続 | `console.error` |
| JSON パースエラー | `generate_junior1_late_1000.mjs` | Markdownバッククォート除去後にパース。パース失敗時はリトライ | `console.error` |
| D1 SQL 実行エラー | `wrangler d1 execute` | エラー行を表示して即座にトランザクションロールバック | stderr |
| ネットワーク断 | クライアント `QuizQuest.tsx` | 既存の retry ボタンおよびエラーメッセージを表示 | `console.error` |
| タイムアウト | API fetch | 既存のタイムアウトハンドラでエラー表示 | `console.error` |

## 8. 🏛️ アーキテクチャ選定と却下案（G-8）
- **採用方式**: スタンドアロンな Node.js スクリプトによる一括バッチ生成（50リクエスト×20問）＋ SQLファイル出力 ＋ Wrangler CLI による本番適用。
  - **理由**: Workers ランタイム上で 1,000問を生成すると CPU 時間制限・サブフェッチ回数制限（最大50回）に抵触しタイムアウトする。ローカルCLIスクリプトでのバッチ生成が最も安全確実。
- **却下案**:
  - Workers API `/api/quizzes/generate` のブラウザ呼び出し: Workers のタイムアウトおよび無料枠サブフェッチ制限に抵触するため却下。
  - `gemini-1.5-flash` / `gemini-2.5-flash` の利用: ユーザー指定の最高コスパ最新モデル `gemini-3.1-flash-lite`（G-10準拠）を採用するため旧モデルは却下。

## 9. 🧪 受け入れ基準（検証コマンド付き）
1. `scripts/generate_junior1_late_1000.mjs` が完走し、`junior1_late_1000_seed.sql` に 1,000問以上の INSERT 文が出力されること。
   - 検証: `grep -c "INSERT INTO quiz_questions" junior1_late_1000_seed.sql` が 1000 以上。
2. 本番 D1 (`quest-db`) に適用後、`junior_1` の問題数が既存 3,594問 から 4,594問 以上に増加すること。
   - 検証: `npx wrangler d1 execute quest-db --remote --command "SELECT count(*) FROM quiz_questions WHERE grade_level = 'junior_1';"`
3. `src/frontend/components/QuizQuest.tsx` の表示が「🎒 中1レベル」となり、ビルドおよび型チェックが 0 エラーであること。
   - 検証: `npx tsc --noEmit && npm run build`
4. 本番デプロイ後、本番URLから HTTP 200 で中1クイズが取得できること。
   - 検証: `curl -s -i "https://quest-habit-app.keitaro-fukui.workers.dev/api/quizzes?grade_level=junior_1"`

## 10. 📋 前提条件・ブロッカー
- 前提条件: `.dev.vars` に有効な `GEMINI_API_KEY` が設定されていること（実測確認済み [EV-3]）。
- ブロッカー: なし。

## 11. UI / コンポーネント設計
- `src/frontend/components/QuizQuest.tsx:L244`:
  - 変更前: `{ id: 'junior_1', label: '🎒 中1レベル(前半)' },`
  - 変更後: `{ id: 'junior_1', label: '🎒 中1レベル' },`

## 12. 実装タスクチェックリスト（依存順・1 タスク 1 コミット・完了条件付き）
- [ ] T1: 生成スクリプト `scripts/generate_junior1_late_1000.mjs` の作成
  - 完了条件: `node -c scripts/generate_junior1_late_1000.mjs` 構文エラー 0
- [ ] T2: 1,000問の生成実行および `junior1_late_1000_seed.sql` の生成
  - 完了条件: `grep -c "INSERT INTO" junior1_late_1000_seed.sql` >= 1000
- [ ] T3: Cloudflare D1 への SQL 適用
  - 完了条件: `npx wrangler d1 execute quest-db --remote --command "SELECT count(*) FROM quiz_questions WHERE grade_level = 'junior_1';"` で件数増加確認
- [ ] T4: フロントエンド文言更新（`QuizQuest.tsx`）
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
 HEAD=5f0a612  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）

## 15. 改訂履歴（差分改訂 / §2-5）
| 版 | 指摘 # | 変更したセクション | 1 行要約 |
| :--- | :--- | :--- | :--- |
| 初版 | - | 全体 | 初版作成 |
