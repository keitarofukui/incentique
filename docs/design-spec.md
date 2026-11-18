# 機能設計仕様書: 中学1年 定期テスト4期間×全9教科（主要5＋副教科4）対応

- 作成日時: 2026-11-18 15:02
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 4c46251
- 上流 Artifact: docs/investigation-report.md（対象コミット: 4c46251）

## 0. 確定済みの前提（上流から引き継ぎ・再実測しない / §2-5）
| 事実 | 根拠 |
| :--- | :--- |
| `quiz_questions` テーブルには既に `explanation`, `image_key` カラムが local/remote 双方に存在 | 確定済みの前提（upstream: investigation-report.md） |
| 既存 `junior_1_*` 問題に副教科（`music`, `art`, `pe`, `tech_home`）は 0 件 | [EV-2]（upstream: investigation-report.md） |
| `scripts/seeds/*.sql` は `gate-diffsize.sh`（400 行上限）の除外対象 | 確定済みの前提（upstream: investigation-report.md） |

- トラック: ミドル（既存スキーマ利用・API/UI 拡張＋シード追加 / §2-6）
- トラック自己照合: §12 の変更対象パス = `src/backend/index.ts`, `src/frontend/types.ts`, `src/frontend/components/QuizQuest.tsx`, `src/frontend/components/MockExamView.tsx`, `scripts/seeds/*`

## 1. 概要・目的
次男（中1・二期制）の定期テスト対策として、**前期中間・前期期末・後期中間・後期期末**の 4 期間 × **全 9 教科**（英語・数学・理科・社会・国語 ＋ 音楽・美術・保健体育・技術家庭）の予想問題（全問解説付き）および 25 問模擬試験モードを追加する。

## 2. 機能要件 / 非機能要件
- **4 期間区分**: `junior_1_early_mid`（中1前期中間）、`junior_1_early_final`（中1前期期末）、`junior_1_late_mid`（中1後期中間）、`junior_1_late_final`（中1後期期末）
- **9 教科カテゴリ**: 既存 5 教科 ＋ 副教科 4 教科（`music`, `art`, `pe`, `tech_home`）
- **通常クイズ連携**: `QuizQuest.tsx` の学年フィルタに 4 期間、教科フィルタに副教科 4 教科を追加。また `grade_level = 'junior_1'` 指定時は `grade_level LIKE 'junior_1%'` にマッチさせる。
- **定期テスト模試**: 期間 × 教科（個別 9 教科 ＋ `major_5` / `minor_4` / `all_9`）から毎回ランダムに **25 問** 抽出（1 問 4 点、100 点満点、20 分、**80 点以上合格**）。全問回答（25/25 問）で完了 `+10 pt` ＋ 合格さらに `+30 pt`（計 `+40 pt`）。

## 3. データフロー全経路
### [EV-1] 既存 `MockExamView.tsx` の API 呼び出し確認
$ grep -rn "QUIZZES_MOCK" src/
src/shared/apiRoutes.ts:5:  QUIZZES_MOCK: '/api/quizzes/mock',
src/shared/apiRoutes.ts:6:  QUIZZES_MOCK_SUBMIT: '/api/quizzes/mock-submit',
src/backend/index.ts:1098:app.get(API_ROUTES.QUIZZES_MOCK, async (c) => {
src/backend/index.ts:1167:app.post(API_ROUTES.QUIZZES_MOCK_SUBMIT, async (c) => {
src/frontend/components/MockExamView.tsx:45:      const res = await fetch(`${API_ROUTES.QUIZZES_MOCK}?examType=${type}`, {
src/frontend/components/MockExamView.tsx:86:      const res = await fetch(API_ROUTES.QUIZZES_MOCK_SUBMIT, {

### 変更後経路
1. 通常学習 (`GET /api/quizzes`): `gradeLevel === 'junior_1'` 時は `AND (grade_level LIKE 'junior_1%' OR grade_level = 'all')` とし、期間指定（例: `junior_1_late_mid`）時は完全一致。`getQuizCategoryLabel` / `QuizQuest.tsx` に `music`, `art`, `pe`, `tech_home` を追加。
2. 定期テスト模試 (`GET /api/quizzes/mock?examType=school&gradeLevel=...&subject=...`): 対象 `grade_level`（`junior_1_all` 時は `LIKE 'junior_1%'`）と `subject`（単一教科 / `major_5` / `minor_4` / `all_9`）の ID 一覧から Fisher-Yates で 25 問を毎回抽出（`points: 4`）。
3. 採点 (`POST /api/quizzes/mock-submit`): `examType === 'school'` 時は 1 問 4 点で再計算、`score >= 80` で合格。`answeredCount >= 25` のときのみ完了 `10pt` ＋ 合格ボーナス `30pt` を加算し、`action_logs`（`category = 'quiz'`）記録 ＋ `updateStreaks`。

## 4. 🛡️ 機密フィールド台帳と漏洩遮断設計（G-7）
| フィールド | 機密度 | 既存の露出経路（実測） | 遮断策（具体実装） |
| :--- | :--- | :--- | :--- |
| 新規フィールドなし | - | 既存 `QUIZ_SELECT_COLUMNS` を継続使用 (`src/backend/index.ts:L913`) | `SELECT *` は使用しない |

## 5. 🗄️ DB マイグレーション DDL（G-4）
新規マイグレーションなし（既存の `quiz_questions` テーブルの `grade_level`, `category`, `explanation` カラムをそのまま使用）。

## 6. API 契約（`src/shared/apiRoutes.ts` 継続使用）
| メソッド & パス | リクエスト | 成功レスポンス (200) | エラーレスポンス |
| :--- | :--- | :--- | :--- |
| `GET /api/quizzes/mock` | `?examType=school&gradeLevel=...&subject=...`<br>`gradeLevel`: `junior_1_early_mid\|junior_1_early_final\|junior_1_late_mid\|junior_1_late_final\|junior_1_all`<br>`subject`: `english\|math\|science\|social_studies\|japanese\|music\|art\|pe\|tech_home\|major_5\|minor_4\|all_9` | `MockExamResponse` (`timeLimitMinutes: 20, passScore: 80, totalScore: questions.length * 4, questions: MockExamQuestion[]` [最大25問]) | `400 { success: false, error: 'Invalid gradeLevel or subject' }` / `404 { success: false, error: '該当問題がありません' }`（0件時） / `500` |
| `POST /api/quizzes/mock-submit` | `MockSubmitRequest` (`examType: 'karimen'\|'honmen'\|'school'`, `schoolLabel?: string`, `answers`) | `MockSubmitResponse` (`action_logs`: `【模擬試験】${schoolLabel \|\| '中学定期テスト'} (${score}点・${resultLabel})`) | `400` / `403 { success: false, error: '高校生は中学生定期テスト模試ではポイントを獲得できません' }`（`users.grade_level` が `'high'` 始まりかつ `examType==='school'` 時） / `404` / `500` |

### TypeScript `interface` 変更（`src/frontend/types.ts`）
```ts
export type MockExamType = 'karimen' | 'honmen' | 'school';

export interface QuizQuestion {
  id: number;
  grade_level: string;
  category:
    | 'english' | 'math' | 'science' | 'social_studies' | 'japanese'
    | 'music' | 'art' | 'pe' | 'tech_home'
    | 'driving_karimen' | 'driving_honmen' | 'driving_hazard' | 'driving_aptitude'
    | string;
  question_text: string;
  options: string[];
  correct_index: number;
  difficulty: number;
  explanation?: string | null;
  image_key?: string | null;
  created_at: string;
}

export interface MockSubmitRequest {
  userId: string;
  examType: MockExamType;
  schoolLabel?: string;
  answers: MockExamAnswer[];
}

export interface MockExamResponse {
  success: boolean;
  examType: MockExamType;
  timeLimitMinutes: number;
  passScore: number;
  totalScore: number;
  questions: MockExamQuestion[];
  error?: string;
}
```

## 7. 🙈 エラーハンドリング仕様（G-5・5 状態の表）
| 状態 | `GET /api/quizzes/mock` (`school`) | `POST /api/quizzes/mock-submit` (`school`) |
| :--- | :--- | :--- |
| **成功 (200)** | 25問をセットし20分タイマー開始 | 結果画面に獲得ポイント・解説振り返り表示 |
| **4xx** | `console.error` + エラーメッセージ表示 | `console.error` + エラー表示（成功扱いしない） |
| **5xx** | 同上 | 同上 |
| **ネットワーク断** | `catch` で `console.error` + 通信エラー表示 | 同上（再送信ロック解除） |
| **タイムアウト** | `AbortSignal.timeout(15000)` で中断・再試行表示 | 同上 |

## 8. 🏛️ アーキテクチャ選定と却下案（G-8）
- **4 期間の表現**: 既存 `grade_level` カラムに `junior_1_early_mid` 等を格納。理由: スキーマ変更不要で既存 `QuizQuest` フィルタと統合できる。却下案: 新規 `term` カラム追加（マイグレーション・全既存クエリ修正が必要になるため却下）。
- **問題生成モデル（G-10）**: `gemini-3.1-flash-lite` を使用し、`scripts/seeds/generate_junior1_4terms.mjs` 1 箇所に定義する。

## 9. 🧪 受け入れ基準（検証コマンド付き）
1. `npx wrangler d1 execute quest-db --remote --command "SELECT grade_level, category, COUNT(*) as cnt FROM quiz_questions WHERE grade_level LIKE 'junior_1_%_mid' OR grade_level LIKE 'junior_1_%_final' GROUP BY grade_level, category;"` で 4 期間 × 9 教科（計 1,800 問以上）が存在すること。
2. `curl -i -s "https://quest-habit-app.keitaro-fukui.workers.dev/api/quizzes/mock?examType=school&gradeLevel=junior_1_late_mid&subject=music"` が HTTP 200 で 25 問（総配点 100 点・合格ライン 80 点・解説付き）を返すこと。
3. `npx tsc --noEmit && npm run build` が 0 error で通ること。

## 10. 📋 前提条件・ブロッカー
なし。

## 11. UI / コンポーネント設計
- `QuizQuest.tsx`: 学年フィルタに既存の `junior_1_early` / `junior_1_late` に加えて 4 期間（`junior_1_early_mid` 〜 `junior_1_late_final`）を併存追加し、教科フィルタに `音楽`, `美術`, `保健体育`, `技術・家庭` を追加（既存の高校生アカウントでは `junior_*` を非表示維持）。
- `MockExamView.tsx`: 運転免許模試カードの下に「🏫 中学1年 定期テスト模試（25問・20分・80点合格）」カードを追加（高校生アカウント `grade_level.startsWith('high')` では非表示）。期間（4期間＋通年）と教科（全9教科＋まとめ3種）のセレクトボックスから開始し、`passScore`（80点 / 90点）を動的表示する。再挑戦ボタン押下時は現在の `examType`, `schoolGrade`, `schoolSubject` を引き継いで開始する。

## 12. 実装タスクチェックリスト（依存順・1 タスク 1 コミット・完了条件付き）
- [x] T1: `src/frontend/types.ts`, `src/backend/index.ts`（`junior_1` 前方一致、副教科ラベル、`school` 模試・採点・403反則チェック対応）実装 / 完了条件: `npx tsc --noEmit` 0 error
  → 実装: `src/frontend/types.ts:L59-115`, `src/backend/index.ts:L945-1305` 実装完了。`tsc 0 error`。
- [x] T2: `src/frontend/components/QuizQuest.tsx`, `src/frontend/components/MockExamView.tsx`（4期間×9教科 UI・`passScore` 動的表示・高校生非表示）実装 / 完了条件: `npx tsc --noEmit && npm run build` 0 error
  → 実装: `QuizQuest.tsx:L46-375`, `MockExamView.tsx:L13-270` 実装完了。`tsc 0 error` / `npm run build` 成功。
- [x] T3: `scripts/seeds/generate_junior1_4terms.mjs`（`.dev.vars` / 環境変数 `GEMINI_API_KEY` 参照、`gemini-3.1-flash-lite` で 4期間×9教科×各55〜60問・計約2,000問・全問 `explanation` 必須生成）& `validate_junior1_seed.mjs` で検証し local/remote D1 投入 / 完了条件: remote `COUNT(*)` 1,800問以上
  → 実装: 4期間×全9教科 合計 2,109 問を生成・検証し、`local` / `remote` D1 へ投入完了（Database size 6.91 MB）。

## 13. 未確認事項（E-4）
なし。

## 14. 品質ゲート実行結果（G-11）
$ /Users/fukuikeitaro/antigravity-agents/scripts/verify.sh design
========================================================
 verify.sh  role=design  base=HEAD  repo=game
 HEAD=4c46251  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）

## 15. 改訂履歴（差分改訂 / §2-5）
| 版 | 指摘 # | 変更したセクション | 1 行要約 |
| :--- | :--- | :--- | :--- |
| 1.0 | - | 初版作成 | 初版作成 |
| 1.1 | DR-1〜3 | §6, §11, §12 | 許容値/400/404/403詳細、QuizQuestion.category拡張、passScore動的表示、高校生非表示、T3詳細追記 |
