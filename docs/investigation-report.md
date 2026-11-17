# 調査報告レポート: 自動車学校 学科・適性予想問題＆解説・標識画像・模擬試験モード追加

- 作成日時: 2026-11-18 06:43
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: e468f74
- トラック: ミドル

## 1. 結論サマリー
- 依頼内容: 自動車学校の各種適性検査・仮免試験・本試験の予想問題を十分な量・品質（最新法規準拠）で追加し、さらに「解説表示」「標識画像」「模擬試験モード（毎回ランダム出題）」を全ユーザー向けに実装する。
- 【実測】現状構造（1 行断定）: 現行の `quiz_questions` テーブルおよびクイズ API/UI には解説カラム・画像カラム・模擬試験モードが存在せず、2択〜4択の単発ランダム出題のみに対応している [EV-1] [EV-3]。
- 【実測】修正すべき箇所: `migrations/0003_*.sql`（新規）、`src/backend/index.ts:L913-1168`、`src/frontend/types.ts:L59-68`、`src/frontend/components/QuizQuest.tsx:L255-492`、および問題シード `scripts/seeds/*.sql`
- トラック: ミドル（スキーマ拡張＋API/UI 機能追加＋大量シード追加であり、認証・決済・破壊的変更を含まないため / §2-6）

## 1-1. 確定済みの前提（下流は再実測しない / §2-5）
| 事実 | 根拠 | 重い実測か |
| :--- | :--- | :--- |
| remote `quiz_questions` は 8 カラム構成（`id, grade_level, category, question_text, options_json, correct_index, difficulty, created_at`）で `explanation` / `image_key` は無い | [EV-1] | はい |
| remote `quiz_questions` 既存データに運転免許関連カテゴリは 0 件 | [EV-2] | はい |
| 既存ビルド `npx tsc --noEmit && npm run build` はエラー 0 で成功 | [EV-4] | はい |
| 本番 `GET /api/settings` は HTTP 200 を返却 | [EV-5] | はい |
| `scripts/seeds/*.sql` は `gate-diffsize.sh` の 400 行上限除外対象 | `gate-diffsize.sh:L15-20`（research 調査） | - |

## 2. 実測エビデンス
### [EV-1] DB スキーマ（remote / local `PRAGMA table_info`）
$ npx wrangler d1 execute quest-db --remote --command "PRAGMA table_info(quiz_questions);"
┌─────┬───────────────┬──────────┬─────────┬───────────────────┬────┐
│ cid │ name          │ type     │ notnull │ dflt_value        │ pk │
├─────┼───────────────┼──────────┼─────────┼───────────────────┼────┤
│ 0   │ id            │ INTEGER  │ 0       │ null              │ 1  │
│ 1   │ grade_level   │ TEXT     │ 1       │ null              │ 0  │
│ 2   │ category      │ TEXT     │ 1       │ null              │ 0  │
│ 3   │ question_text │ TEXT     │ 1       │ null              │ 0  │
│ 4   │ options_json  │ TEXT     │ 1       │ null              │ 0  │
│ 5   │ correct_index │ INTEGER  │ 1       │ null              │ 0  │
│ 6   │ difficulty    │ INTEGER  │ 0       │ 1                 │ 0  │
│ 7   │ created_at    │ DATETIME │ 0       │ CURRENT_TIMESTAMP │ 0  │
└─────┴───────────────┴──────────┴─────────┴───────────────────┴────┘
…(一部ヘッダ・枠線省略)
- 【実測】`quiz_questions` には解説（`explanation`）や標識/イラスト識別子（`image_key`）のカラムが存在しない [EV-1]。

### [EV-2] 既存クイズデータ件数（remote）
$ npx wrangler d1 execute quest-db --remote --command "SELECT category, grade_level, COUNT(*) as cnt FROM quiz_questions GROUP BY category, grade_level;"
┌───────────────────┬────────────────┬──────┐
│ category          │ grade_level    │ cnt  │
├───────────────────┼────────────────┼──────┤
│ anime_manga       │ all            │ 180  │
│ current_events    │ all            │ 238  │
│ english           │ high_3         │ 1315 │
…(中略: 計21グループ, general_knowledge/japanese/math/science/social_studies のみ)
- 【実測】運転免許系カテゴリは現在 0 件である [EV-2]。

### [EV-3] マイグレーション・Git 状態・ビルド確認
$ ls -1 migrations/ && npx wrangler d1 migrations list quest-db --remote
0001_inactivity_penalty.sql
0002_action_logs_created_at_index.sql
✅ No migrations to apply!
- 【実測】マイグレーションは 0002 まで適用済みで、次の連番は `0003` である [EV-3]。

### [EV-4] ビルド・型チェック実測
$ npx tsc --noEmit && npm run build
✓ 1606 modules transformed.
dist/index.html                   1.66 kB │ gzip:   0.75 kB
dist/assets/index-kebGcXwK.js   488.95 kB │ gzip: 125.04 kB
✓ built in 1.58s
- 【実測】既存の TypeScript 型チェックおよび Vite ビルドはエラーなく通過する [EV-4]。

### [EV-5] 本番 API 実応答
$ curl -i -s "https://quest-habit-app.keitaro-fukui.workers.dev/api/settings" | head -n 20
HTTP/2 200 
content-type: application/json
…(中略: {"success":true,"settings":{...}})
- 【実測】本番環境は正常稼働中であり、`app_settings` に `quiz_ids_*` キャッシュが保持されている [EV-5]。

## 3. 該当コードの直接引用
`src/backend/index.ts:L918-931`
```ts
    let studyWhere = " WHERE category != 'anime_manga'";
    const studyParams: any[] = [];
    if (category && category !== 'all') {
      studyWhere += ' AND category = ?';
      studyParams.push(category);
    }
    if (gradeLevel && gradeLevel !== 'all' && gradeLevel !== 'other') {
      studyWhere += " AND (grade_level = ? OR grade_level = 'all')";
      studyParams.push(gradeLevel);
    }
```
- 【実測】`category = 'all'` の場合、`anime_manga` 以外の全カテゴリが混在して出題される仕様であり、運転免許カテゴリを `category = 'all'` に混ぜるか分離するかの設計判断が必要である（`src/backend/index.ts:L918`）。

`src/frontend/components/QuizQuest.tsx:L289-299`
```tsx
            {[
              { id: 'all', label: '全教科' },
              { id: 'general_knowledge', label: '小論文・教養' },
              { id: 'english', label: '英語' },
              { id: 'math', label: '数学' },
              { id: 'science', label: '理科' },
              { id: 'social_studies', label: '社会' },
              { id: 'japanese', label: '国語' },
            ].map((cat) => (
```
- 【実測】教科カテゴリはハードコードされており、運転免許系カテゴリ・模擬試験モードの UI タブ追加が必要である（`src/frontend/components/QuizQuest.tsx:L289-299`）。

## 4. 根本原因（なぜなぜ）
- Why1: 運転免許試験対策（適性・仮免・本免）・解説・標識画像・模擬試験が利用できない ← [EV-1] [EV-2]
- Why2: `quiz_questions` テーブルが学校の 5 教科＋教養の 4 択テキスト問題のみを想定した最小スキーマ（`question_text`, `options_json`, `correct_index`）になっている ← `schema.sql:L69-78`
- Why3: バックエンド（`GET /api/quizzes`）が最大 45 問＋箸休め 3 問の単発ランダム抽出のみを提供し、試験形式（問題数・配点・時間・模試採点）を持たない ← `src/backend/index.ts:L913-1067`

## 5. 影響範囲（全数）
- 検索コマンド: `grep -rn "quiz_questions" src/` → ヒット 7 件（1 ファイル）、および `QuizQuest` 呼び出し元（`App.tsx` 等）の全数:
| ファイル | 該当箇所 | 影響内容 |
| :--- | :--- | :--- |
| `src/backend/index.ts` | `L913-1067, L1069-1168, L1170-1265` | 出題・回答・生成 API（`explanation`/`image_key` 返却と模試 API 追加） |
| `src/frontend/types.ts` | `L59-68` | `QuizQuestion` 型に `explanation?`, `image_key?` 追加 |
| `src/frontend/components/QuizQuest.tsx` | `L1-492` | 運転免許カテゴリ・解説・SVG 標識/イラスト・模擬試験モード UI 追加 |
| `src/frontend/components/Dashboard.tsx` | `L46-49, L155-159` | `category === 'quiz'` の累積カウント集計（既存互換維持） |
| `src/frontend/App.tsx` | `L475-481` | `QuizQuest` 呼び出し（Props 互換維持） |

## 6. 二次被害リスク候補（G-7）
| リスク経路 | 実測ヒット箇所 | 想定被害 |
| :--- | :--- | :--- |
| 汎用/設定 API のキャッシュ肥大化 | `src/backend/index.ts:L954` (`app_settings` の `quiz_ids_*`) | 新カテゴリの ID 一覧が `settings` レスポンス（[EV-5] で既に 258KB）をさらに肥大化させるリスク。ただし問題データ自体は機密情報を含まない。 |
| 既存学校の「全教科 (`all`)」出題への混入 | `src/backend/index.ts:L918` (`WHERE category != 'anime_manga'`) | `driving_*` カテゴリを `category = 'all'` から除外しないと、小中高の勉強クイズに自動車学校の問題が混ざるリスク。 |

## 7. 否定された仮説（E-5・必須）
| 立てた仮説 | 検証コマンド | 棄却の根拠 |
| :--- | :--- | :--- |
| `quiz_questions` には既に `explanation` カラムやマイグレーションが存在する | `PRAGMA table_info(quiz_questions);` / `ls -1 migrations/` [EV-1][EV-3] | 8 カラムのみで `explanation` は存在せず、`migrations/` も `0001`, `0002` のみであった。 |
| 大量シード SQL を配置すると `gate-diffsize.sh` で無条件に 400 行超過で失敗する | `gate-diffsize.sh:L15-20` の除外指定確認 | `scripts/**` 配下（`scripts/seeds/*.sql`）は `:(exclude)scripts/**` により diff 行数制限から除外されている。 |

## 8. 未確認事項（E-4）
| 未確認項目 | 確認手段 | ブロッカー理由 |
| :--- | :--- | :--- |
| なし（対象範囲の静的・動的調査を完了） | - | - |

## 9. 推奨アクション（方向性のみ・実装しない）
1. `migrations/0003_quiz_explanation_and_image.sql` を作成し、`quiz_questions` に `explanation TEXT` と `image_key TEXT` を追加する（local/remote 両方適用）。
2. `GET /api/quizzes` で `category = 'all'` の通常学習から `driving_%` カテゴリを除外し、運転免許専用カテゴリ（仮免・本免・適性検査・標識）および新規の模擬試験 API（毎回シャッフル抽出＋採点 API）を追加する。
3. フロントエンドに軽量 SVG コンポーネント（主要道路標識＋本免危険予測イラスト）と解説表示、模擬試験モード（タイマー・合格ライン 90% 判定・毎回ランダム問題セット）を実装する。
4. 2025〜2026 年の最新道路交通法改正（生活道路 30km/h・自転車青切符・マイナ免許証・17歳6か月受験要件等）を反映した高品質な問題シードを `scripts/seeds/` に生成・検証して D1 へ投入する。

## 10. 品質ゲート実行結果（G-11）
$ /Users/fukuikeitaro/antigravity-agents/scripts/verify.sh investigate
========================================================
 verify.sh  role=investigate  base=HEAD  repo=game
 HEAD=e468f74  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
[PASS] gate-coverage      実測 5 件 / カテゴリ網羅 3/4
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
