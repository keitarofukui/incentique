# 機能設計仕様書: 自動車学校 学科・適性予想問題＆解説・標識画像・模擬試験モード追加

- 作成日時: 2026-11-18 06:45
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: e468f74
- 上流 Artifact: docs/investigation-report.md（対象コミット: e468f74）

## 0. 確定済みの前提（上流から引き継ぎ・再実測しない / §2-5）
| 事実 | 根拠 |
| :--- | :--- |
| remote `quiz_questions` は 8 カラム構成で `explanation` / `image_key` は無い | [EV-1]（upstream: investigation-report.md） |
| remote `quiz_questions` 既存データに運転免許カテゴリは 0 件 | [EV-2]（upstream: investigation-report.md） |
| 既存マイグレーションは `0002` まで適用済み | [EV-3]（upstream: investigation-report.md） |
| 既存ビルド `npx tsc --noEmit && npm run build` はエラー 0 | [EV-4]（upstream: investigation-report.md） |
| `scripts/seeds/*.sql` は `gate-diffsize.sh`（400 行上限）の除外対象 | 確定済みの前提（upstream: investigation-report.md） |

- トラック: ミドル（スキーマ拡張＋API/UI 機能追加＋シード追加であり、認証・決済・破壊的変更なし / §2-6）
- トラック自己照合: §12 の変更対象パス = `migrations/0003_quiz_explanation_and_image.sql`, `src/shared/apiRoutes.ts`, `src/backend/index.ts`, `src/frontend/types.ts`, `src/frontend/components/TrafficSignSvg.tsx`, `src/frontend/components/MockExamView.tsx`, `src/frontend/components/QuizQuest.tsx`, `scripts/seeds/*.sql`

## 1. 概要・目的
自動車学校の適性検査・仮免学科・本免学科（危険予測含む）に完全対応した予想問題集を追加し、**「解説表示」「標識・危険予測 SVG 画像」「毎回ランダム抽出の模擬試験モード」**を実装する。2025〜2026 年の最新道路交通法改正（生活道路 30km/h、自転車青切符・側方間隔、マイナ免許証、17 歳 6 か月受験要件等）を反映する。

## 2. 機能要件 / 非機能要件
- **カテゴリ追加（対象ユーザー制限なし / `grade_level = 'all'`）**:
  - `driving_karimen`（仮免学科 ○×）
  - `driving_honmen`（本免学科 ○×）
  - `driving_hazard`（本免 危険予測イラスト 4択）
  - `driving_aptitude`（運転適性検査対策 4択/○×）
- **解説表示**: `explanation` がある問題は回答後（正誤問わず）に解説を表示する。
- **標識・危険予測画像**: `image_key` がある問題は軽量 SVG コンポーネントで鮮明に描画する（外部 URL 依存なし）。
- **模擬試験モード**:
  - 仮免模試: 50 問（`driving_karimen` から毎回ランダム抽出）、30 分、1 問 2 点、90 点以上合格。
  - 本免模試: 95 問（`driving_karimen` + `driving_honmen` から 90 問〔各 1 点〕＋ `driving_hazard` から 5 問〔各 2 点〕を毎回ランダム抽出）、50 分、90 点以上合格。
  - 試験終了後、合否・得点・誤答一覧（解説付き）を表示し、完了/合格ポイントを付与する。
- **既存互換**: 既存の「全教科 (`all`)」出題に `driving_%` を混入させない。

## 3. データフロー全経路
### [EV-1] 既存 `/api/quizzes` 呼び出し箇所の全数確認
$ grep -rn "/api/quizzes" src/
src/frontend/types.ts:95:  // 'quiz' is written by POST /api/quizzes/answer, 'bonus' by the streak /
src/frontend/components/QuizQuest.tsx:67:      let url = `/api/quizzes?grade_level=${gradeLevelFilter}`;
src/frontend/components/QuizQuest.tsx:96:      let url = `/api/quizzes?grade_level=${gradeLevelFilter}`;
src/frontend/components/QuizQuest.tsx:131:        const res = await fetch('/api/quizzes/answer', {
src/backend/index.ts:913:app.get('/api/quizzes', async (c) => {
src/backend/index.ts:1069:app.post('/api/quizzes/answer', async (c) => {
src/backend/index.ts:1170:app.post('/api/quizzes/generate', async (c) => {

### 既存経路（実測: `src/backend/index.ts:L913-1168`, `QuizQuest.tsx:L67-184` [EV-1]）
1. `QuizQuest.tsx:L67` ➔ `GET /api/quizzes?grade_level=...&category=...` (`index.ts:L913`)
2. `index.ts:L918-931` で `studyWhere` 組み立て ➔ `L974` で ID 一覧キャッシュ取得 ➔ `L997` で `SELECT * FROM quiz_questions WHERE id IN (...)` ➔ `L1054` で `options_json` を `options` にパースし返却
3. 回答時 `QuizQuest.tsx:L131` ➔ `POST /api/quizzes/answer` (`index.ts:L1069`) ➔ `L1114` ポイント加算 ➔ `L1129` `action_logs` 挿入

### 変更後経路
1. `migrations/0003_quiz_explanation_and_image.sql` により `quiz_questions` に `explanation TEXT`, `image_key TEXT` を追加。
2. 通常学習: `GET /api/quizzes`（`category='all'` 時は `AND category NOT LIKE 'driving_%'` を付与、`category='driving_all'` 時は `AND category LIKE 'driving_%'` を付与。`category` が `driving_*` の場合は集中学習のため `anime_manga` 箸休めを混入しない）➔ `L997`, `L1041`, `L1077` の全 `SELECT * FROM quiz_questions` をカラム列挙 `SELECT id, grade_level, category, question_text, options_json, correct_index, difficulty, explanation, image_key, created_at FROM quiz_questions` へ置換 ➔ フロント `QuizQuestion` 型へ返却 ➔ `QuizQuest.tsx`（`getCategoryLabel` に運転免許 4 カテゴリ追加）で `TrafficSignSvg` と回答後 `explanation` を描画。`POST /api/quizzes/answer`（`L1119-1125` の `catLabel` に運転免許 4 カテゴリ追加）は既存通り 1 問ごとにポイント付与。
3. 模擬試験: `MockExamView.tsx` ➔ `GET /api/quizzes/mock?examType=karimen|honmen` ➔ サーバで毎回 Fisher-Yates ランダム抽出（キャッシュせず毎回異なるセットを返却）➔ クライアントで解答・即時フィードバック用プレビュー計算 ➔ `POST /api/quizzes/mock-submit`（`{ userId, examType, answers }`）➔ サーバ側で対象 ID の正答・配点を DB 照合して再計算し、`users.current_points` 加算 ＋ `action_logs`（`category='quiz'`）記録 ＋ `updateStreaks` を実行。

## 4. 🛡️ 機密フィールド台帳と漏洩遮断設計（G-7）
| フィールド | 機密度 | 既存の露出経路（実測） | 遮断策（具体実装） |
| :--- | :--- | :--- | :--- |
| `explanation`, `image_key` | 低（公開学習データ） | なし（新規カラム） | `src/backend/index.ts:L997, L1041, L1077` の全 `SELECT * FROM quiz_questions` を廃止し必要カラムを明示列挙する |
| `app_settings` (`quiz_ids_*`) | 低 | `GET /api/settings` (`src/backend/index.ts:L1784`) | 模擬試験 API では `app_settings` へキャッシュを書き込まず、レスポンス肥大化を防ぐ |

## 5. 🗄️ DB マイグレーション DDL（全文 / G-4）
ファイル: `migrations/0003_quiz_explanation_and_image.sql`
```sql
ALTER TABLE quiz_questions ADD COLUMN explanation TEXT;
ALTER TABLE quiz_questions ADD COLUMN image_key TEXT;
```
適用手順（local / remote 両方）:
```bash
npx wrangler d1 migrations apply quest-db --local
npx wrangler d1 migrations apply quest-db --remote
```

## 6. API 契約（パス定数は `src/shared/apiRoutes.ts` に一元化）
```ts
// src/shared/apiRoutes.ts
export const API_ROUTES = {
  QUIZZES: '/api/quizzes',
  QUIZZES_ANSWER: '/api/quizzes/answer',
  QUIZZES_MOCK: '/api/quizzes/mock',
  QUIZZES_MOCK_SUBMIT: '/api/quizzes/mock-submit',
} as const;
```

| メソッド & パス | リクエスト | 成功レスポンス (200) | エラーレスポンス |
| :--- | :--- | :--- | :--- |
| `GET /api/quizzes` | `?grade_level=...&category=...` (`driving_all` / `driving_karimen` 等対応) | `{ success: true, quizzes: QuizQuestion[], totalCount: number }` | `500 { success: false, error: string }` |
| `GET /api/quizzes/mock` | `?examType=karimen \| honmen` | `{ success: true, examType, timeLimitMinutes: 30\|50, passScore: 90, totalScore: 100, questions: MockExamQuestion[] }` | `400 { success: false, error: 'Invalid examType' }` / `500` |
| `POST /api/quizzes/mock-submit` | `MockSubmitRequest` (`{ userId, examType, answers: { questionId, selectedIndex }[] }`) | `MockSubmitResponse` (`{ success: true, score, correctCount, totalCount, passed, pointsEarned, newTotalPoints }`) | `400 { success: false, error: string }` / `404 User not found` / `500` |

### 模擬試験のポイント付与・ログ記録仕様
- サーバ側で `answers` の全 `questionId` を DB 照合し、`correct_index === selectedIndex` の場合に配点（`karimen` は 2 点、`honmen` は `driving_hazard` が 2 点・それ以外が 1 点）を加算して `score`（0〜100）を算出する（`score >= 90` で `passed = true`）。
- 回答数 0 件時は `pointsEarned = 0`。1 件以上回答時: `karimen` は完了 `10pt` ＋ 合格ボーナス `30pt`、`honmen` は完了 `20pt` ＋ 合格ボーナス `50pt` を `users.current_points` に加算し、`action_logs`（`category = 'quiz'`, `title_or_menu = '【模擬試験】仮免学科 (94点・合格)'` 等, `base_points = pointsEarned`, `earned_points = pointsEarned`, `status = 'approved'`）を記録＋`updateStreaks` を実行する。二重送信防止はクライアントの送信中ロック＋送信済みフラグで行う。

### TypeScript `interface` 全文（`src/frontend/types.ts`）
```ts
export interface QuizQuestion {
  id: number;
  grade_level: string;
  category: 'english' | 'social_studies' | 'science' | 'driving_karimen' | 'driving_honmen' | 'driving_hazard' | 'driving_aptitude' | string;
  question_text: string;
  options: string[];
  correct_index: number;
  difficulty: number;
  explanation?: string | null;
  image_key?: string | null;
  created_at: string;
}

export interface MockExamQuestion extends QuizQuestion {
  points: number; // 仮免=2, 本免文章=1, 本免危険予測=2
}

export interface MockExamAnswer {
  questionId: number;
  selectedIndex: number | null;
}

export interface MockSubmitRequest {
  userId: string;
  examType: 'karimen' | 'honmen';
  answers: MockExamAnswer[];
}

export interface MockSubmitResponse {
  success: boolean;
  score: number;
  correctCount: number;
  totalCount: number;
  passed: boolean;
  pointsEarned: number;
  newTotalPoints: number;
  error?: string;
}
```

## 7. 🙈 エラーハンドリング仕様（G-5・5 状態の表）
| 状態 | `GET /api/quizzes/mock` | `POST /api/quizzes/mock-submit` |
| :--- | :--- | :--- |
| **成功 (200)** | 問題セットをセットしタイマー開始 | 結果画面に獲得ポイント表示・`onPointsUpdate` 反映 |
| **4xx** | `console.error` + エラーメッセージ表示・開始ボタン復帰 | `console.error` + `setSubmitError` 表示（成功扱いしない） |
| **5xx** | 同上（問題画面へ遷移させない） | `console.error` + サーバー原文エラー表示（再送信可能） |
| **ネットワーク断** | `catch` で `console.error` + 「通信エラー」表示 | `catch` で `console.error` + 「通信に失敗しました。再試行してください」表示 |
| **タイムアウト** | `AbortController` (15秒) で中断し再試行 UI 表示 | 同上（二重送信防止のためボタンロック解除） |

## 8. 🏛️ アーキテクチャ選定と却下案（G-8）
- **標識・危険予測画像の方式**: フロントエンドの **データ駆動 SVG コンポーネント（`TrafficSignSvg.tsx`）** を採用。理由: 外部画像 URL のリンク切れ・CORS・Workers 容量圧迫がなく、高精細かつ軽量。却下案: 外部 URL 直リンク（リンク切れリスク）、Base64 の DB 格納（D1 転送量増大）。
- **模擬試験のランダム出題方式**: `GET /api/quizzes/mock` で対象カテゴリの ID 配列から毎回 Fisher-Yates サンプリング。理由: `app_settings` キャッシュ固定を避け、毎回異なる模擬試験を提供できる。却下案: 固定問題セットのハードコード（暗記で終わるため却下）。
- **危険予測イラスト問題形式**: 既存の `options_json` + `correct_index` を活用し、3 つの判断の組み合わせを問う 4 択形式（本免模試では 1 問 2 点）を採用。理由: スキーマ互換性を保ちつつ「3 つすべて正しく判断しないと得点にならない」本番仕様を再現できる。
- **LLM モデル（G-10）**: 既存 `POST /api/quizzes/generate` は `gemini-3.1-flash-lite` を継続（変更なし）。

## 9. 🧪 受け入れ基準（検証コマンド付き）
1. `npx wrangler d1 execute quest-db --local --command "PRAGMA table_info(quiz_questions);"` および `--remote` の両方で `explanation`, `image_key` カラムが存在すること。
2. `npx wrangler d1 execute quest-db --remote --command "SELECT category, COUNT(*) FROM quiz_questions WHERE category LIKE 'driving_%' GROUP BY category;"` で仮免・本免・危険予測・適性検査が充実した件数（計 600 問以上）登録されていること。
3. `curl -i -s "https://quest-habit-app.keitaro-fukui.workers.dev/api/quizzes/mock?examType=karimen"` が 200 で 50 問返却し、2 回目の呼び出しと問題 ID 順/構成が異なること。
4. `curl -i -s "https://quest-habit-app.keitaro-fukui.workers.dev/api/quizzes/mock?examType=honmen"` が 200 で 95 問（総配点 100 点）返却すること。
5. 実ブラウザ（`browser` サブエージェント）で運転免許カテゴリ・解説表示・標識 SVG 表示・模擬試験モードの開始〜採点までエラーなく動作すること（G-13）。

## 10. 📋 前提条件・ブロッカー
なし（既存の D1 / Workers 環境およびシード投入手段で完結可能）。

## 11. UI / コンポーネント設計
- **重複点検**: `QuizQuest.tsx` 内にのみクイズ UI が存在するため、同ファイル上部でモード切替（`📚 教科学習` / `🚗 自動車学校` / `📝 模擬試験`）を提供する。
- **配色**: 既存の `slate-900` / `slate-950` / `cyber-neonCyan` / `emerald` / `amber` / `rose` トーンを踏襲する。
- **`TrafficSignSvg.tsx`**: `image_key`（例: `sign_stop`, `sign_no_entry`, `sign_one_way`, `sign_speed_30`, `sign_crosswalk`, `hazard_intersection`, `hazard_night_pedestrian` 等）を受け取り、日本の道路標識規格（青・赤・黄・白）または危険予測イラストを SVG で描画。
- **`MockExamView.tsx`**: 試験選択（仮免 50 問 30 分 / 本免 95 問 50 分）➔ 試験実行（残り時間タイマー、進捗バー、問題ジャンプグリッド、`TrafficSignSvg`、○×/4択ボタン）➔ 結果画面（合否バッジ、スコア、誤答の解説振り返り、ポイント獲得結果）。

## 12. 実装タスクチェックリスト（依存順・1 タスク 1 コミット・完了条件付き）
- [x] T1: `migrations/0003_quiz_explanation_and_image.sql` 作成および local/remote 適用 / 完了条件: `PRAGMA table_info(quiz_questions);` で両環境確認
  → 実装: `migrations/0003_quiz_explanation_and_image.sql` を作成し `--local` / `--remote` 双方へ適用完了。`PRAGMA table_info(quiz_questions)` で `explanation` (cid=8), `image_key` (cid=9) の実在を確認。
- [x] T2: `src/shared/apiRoutes.ts`, `src/frontend/types.ts`, `src/backend/index.ts`（通常出題の除外＆新カラム返却＋`/api/quizzes/mock`＋`/api/quizzes/mock-submit`）実装 / 完了条件: `npx tsc --noEmit` 0 error
  → 実装: `src/shared/apiRoutes.ts`, `src/frontend/types.ts:L59-105`, `src/backend/index.ts:L914-1290` 実装完了。`tsc 0 error` / `npm run build` 成功 / `verify.sh dev` PASS。
- [ ] T3: `src/frontend/components/TrafficSignSvg.tsx`, `MockExamView.tsx`, `QuizQuest.tsx`（モード切替・解説表示・SVG・模試統合）実装 / 完了条件: `npx tsc --noEmit && npm run build` 0 error
- [ ] T4: `scripts/seeds/driving_school_seed.sql` 生成・品質検証スクリプト（`scripts/seeds/validate_driving_seed.mjs`）実行・local/remote D1 投入 / 完了条件: 検証スクリプト 0 error ＋ remote `COUNT(*)` 600 問以上

## 13. 未確認事項（E-4）
なし。

## 14. 品質ゲート実行結果（G-11）
$ /Users/fukuikeitaro/antigravity-agents/scripts/verify.sh design
========================================================
 verify.sh  role=design  base=HEAD  repo=game
 HEAD=e468f74  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）

## 15. 改訂履歴（差分改訂 / §2-5）
| 版 | 指摘 # | 変更したセクション | 1 行要約 |
| :--- | :--- | :--- | :--- |
| 1.0 | - | 初版作成 | 初版作成 |
| 1.1 | DR-1〜5 | §3, §4, §5, §6, §9, §12 | 模試採点リクエストの解答配列化とサーバ再検証・ポイント計算仕様追加、SELECT * 全廃、local/remote 適用手順・検証スクリプトパス明記 |
