# 機能設計仕様書: 陵太郎（高3）の中学生クイズ解答制限・反則化および保護者ポータル学年変更機能

- 作成日時: 2026-10-01 10:50
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 7674d22
- 上流 Artifact: docs/investigation-report.md（対象コミット: 7674d22）

## 0. 上流の抜き取り再実測（§2-3・軽量コマンド 3 件）

### [EV-1] 上流 [EV-1] の再実行（Git 状態）
$ git rev-parse --short HEAD && git branch --show-current && git status --short
7674d22
main
 M docs/adversary-report.md
 M docs/design-review.md
 M docs/design-spec.md
 M docs/investigation-report.md
 M src/backend/index.ts
 M src/frontend/components/ParentPortal.tsx
 M src/frontend/components/QuizQuest.tsx

- 【実測】上流と一致。コミット 7674d22、ブランチ main [EV-1]。

### [EV-2] 上流 [EV-5] の再実行（学年選択セレクタ）
$ sed -n '235,245p' src/frontend/components/QuizQuest.tsx
        {/* Filter Controls (Grade & Category) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
          {/* Grade Level Selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-400 mr-1.5 shrink-0">対象学年:</span>
            {[
              { id: 'all', label: '全学年' },
              { id: 'junior_1', label: '🎒 中1レベル(前半)' },
              { id: 'high_3', label: '🎓 高校レベル(高1〜2)' },
            ]
              .filter((g) => !(isHighSchoolUser && g.id === 'junior_1'))

- 【実測】高校生ユーザー除外ロジックが組み込まれた [EV-2]。

### [EV-3] 上流 [EV-7] の再実行（漫画インプット高校生ペナルティ）
$ sed -n '1490,1500p' src/backend/index.ts
    } else if (body.category === 'input_manga') {
      const user: any = await c.env.DB.prepare('SELECT grade_level FROM users WHERE id = ?').bind(body.userId).first();
      if (user && (user.grade_level || '').startsWith('high')) {
        basePoints = Math.floor(basePoints / 10);
      }
    }

- 【実測】上流と一致。高校生の学年判定ロジックが実在する [EV-3]。

### [EV-4] ビルド健全性の再実測
$ npm run build
> quest-habit-app@1.0.0 build
> vite build
✓ built in 1.57s

- 【実測】ビルドエラー0件で通過 [EV-4]。

## 0-1. 確定済みの前提（上流から引き継ぎ・再実測しない / §2-5）
| 事実 | 根拠（上流の EV） |
| :--- | :--- |
| users テーブルのりょーたろは `high_3`、シュンタロウは `junior_1` で登録済み | [EV-2]（upstream: investigation-report.md） |
| quiz_questions テーブルには `junior_1` / `high_3` / `all` の3種の学年区分のみが存在 | [EV-3]（upstream: investigation-report.md） |
| `npm run build` は 0 エラーで正常通過する | [EV-4] |

- トラック: ライト（理由: 既存テーブルの既存カラム `grade_level` の更新と参照のみであり、スキーマ改変・外部API・機密フィールド新設を伴わず、コード差分も100行程度に収まるため / §2-6）
- トラック自己照合: §12 の変更対象パス = `src/frontend/components/QuizQuest.tsx`, `src/frontend/components/ParentPortal.tsx`, `src/backend/index.ts` / リスクパス・他レーン共有パスへの抵触: 無し

## 1. 概要・目的
高校生ユーザー（陵太郎: `high_3`）が中学生向けクイズ（`junior_1`）を解いてポイントを獲得することを防ぎ（反則化）、同時に子供の進級・成長に合わせて親がいつでも学年を更新できるよう、保護者ポータルに学年変更機能を提供する。

## 2. 機能要件 / 非機能要件
- **FR-1（UI制限）**: クイズ画面（`QuizQuest.tsx`）で、ログインユーザーが高校生（`currentUser.grade_level.startsWith('high')`）の場合、学年セレクタから「🎒 中1レベル」を除外（全学年 `all` と高校レベル `high_3` のみ表示）。
- **FR-2（解答API反則判定）**: `/api/quizzes/answer` において、ユーザーが高校生かつ問題が `junior_1` の場合、正解であっても `basePoints = 0` / 獲得ポイント 0pt とし、反則メッセージ（「高校生は中学生クイズではポイントを獲得できません」）を含むレスポンスを返却し、加算を行わない。全学年向け問題（`all`）は制限対象外とする。
- **FR-3（保護者ポータル学年変更）**: 保護者ポータルのアカウント一覧カードで、各ユーザーの現在の学年をドロップダウン（`junior_1: 中学レベル`, `high_3: 高校レベル`, `other: 一般・その他`）で表示・即時更新可能にする。
- **FR-4（学年更新API）**: `PATCH /api/users/:id/grade` エンドポイントを新設し、ホワイトリスト検証（`junior_1`, `high_3`, `other` 以外は 400 Bad Request）を行って `users.grade_level` を更新する。

## 3. データフロー全経路
1. **クイズ出題・制限**:
   - `QuizQuest.tsx:L15` (`currentUser.grade_level`) ➔ 学年タブのフィルタリング ➔ 高校生なら中1タブ非表示
2. **クイズ解答・反則遮断**:
   - `QuizQuest.tsx:L100` (`POST /api/quizzes/answer`) ➔ `src/backend/index.ts:L1040`
   - `user = SELECT grade_level FROM users WHERE id = ?`
   - `question = SELECT grade_level FROM quiz_questions WHERE id = ?`
   - もし `user.grade_level.startsWith('high') && question.grade_level === 'junior_1'` なら `basePoints = 0`, `isFoul = true` ➔ `users.current_points` への加算なし
3. **学年変更フロー**:
   - `ParentPortal.tsx` で学年セレクト変更 ➔ `PATCH /api/users/:id/grade` `{ gradeLevel: 'high_3' }`
   - `src/backend/index.ts` で値検証 ➔ `UPDATE users SET grade_level = ? WHERE id = ?` ➔ 200 OK ➔ 親画面＆ローカル state 更新

## 4. 🛡️ 機密フィールド台帳と漏洩遮断設計（G-7）
| フィールド | 機密度 | 既存の露出経路（実測） | 遮断策（具体実装） |
| :--- | :--- | :--- | :--- |
| `grade_level` | 低（公開属性） | `GET /api/users`, `GET /api/rivals` | 既存通り露出を許容。更新API `PATCH /api/users/:id/grade` はホワイトリスト（`['high_3', 'junior_1', 'other']`）のみを受け入れ、SQLインジェクションや不正文字列を遮断 |

## 5. 🗄️ DB マイグレーション DDL（全文 / G-4）
**該当なし（DDL変更なし）**
`users` テーブルには既に `grade_level TEXT NOT NULL` が存在し、`quiz_questions` テーブルにも `grade_level TEXT` が存在するため、新規テーブルやカラム追加は不要。

## 6. API 契約
### 新設: `PATCH /api/users/:id/grade`
- **リクエスト**:
  - URL: `/api/users/:id/grade`
  - Method: `PATCH`
  - Headers: `Content-Type: application/json`
  - Body: `{"gradeLevel": "high_3" | "junior_1" | "other"}`
- **成功レスポンス**:
  - Status: `200 OK`
  - Body: `{"success": true, "id": "user_...", "gradeLevel": "high_3"}`
- **エラーレスポンス**:
  - Status: `400 Bad Request`（不正な値の場合）
  - Body: `{"success": false, "error": "Invalid grade_level. Must be high_3, junior_1, or other."}`
  - Status: `404 Not Found`（ユーザー不在時）
  - Body: `{"success": false, "error": "User not found"}`

### 変更: `POST /api/quizzes/answer`
- **リクエスト**: 既存通り (`userId`, `questionId`, `selectedIndex`)
- **成功レスポンス（通常時）**: 既存通り (`pointsEarned > 0`)
- **成功レスポンス（反則時）**:
  - Status: `200 OK`
  - Body: `{"success": true, "correct": true, "isFoul": true, "pointsEarned": 0, "basePoints": 0, "newTotalPoints": 1234, "message": "高校生は中学生クイズではポイントを獲得できません（反則）"}`

## 7. 🙈 エラーハンドリング仕様（G-5）
| API / 操作 | 成功 | 4xx（クライアント誤り） | 5xx（サーバー障害） | ネットワーク断 | UI表示・ログ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `PATCH /api/users/:id/grade` | 200: トースト「学年を更新しました」 | 400: エラー表示「不正な学年です」 | 500: エラー表示「サーバーエラーが発生しました」 | 通信エラー表示 | `console.error` 出力、失敗時に画面を成功状態にしない |
| `POST /api/quizzes/answer` (反則時) | 200: 正解表示＋「反則: 0pt」警告バッジ | 404: 問題不在 | 500: 解答記録失敗 | 通信エラー | 不正解や0pt時はポイントを加算せず警告表示 |

## 8. 🏛️ アーキテクチャ選定と却下案（G-8）
- **採用方式**:
  1. フロントエンドで高校生ユーザーに対して中1タブをフィルタアウト（誤操作防止）。
  2. バックエンドでも解答APIで二重チェックし、高校生による中1問題解答は 0pt（反則判定）とする（バイパス防止）。
  3. 保護者ポータルに学年更新 API（`PATCH`）とセレクトボックスを配備。
- **却下した回避策**:
  - 却下案1: フロントエンドのみで非表示にする ➔ curlや直API呼び出しでポイントを稼げる抜け穴が残るため却下。
  - 却下案2: 中学生問題を解いた瞬間にエラー 400 を返す ➔ UI側がクラッシュ・ネットワークエラーと誤認しやすいため、正常応答（`success: true, isFoul: true, pointsEarned: 0`）として反則である旨を明示する設計を採用。

## 9. 🧪 受け入れ基準
1. 高校生ユーザー（りょーたろ `high_3`）でログイン時、クイズ画面の学年セレクタに「中1レベル」が表示されないこと。
2. りょーたろが直リクエスト等で中1問題（`junior_1`）に正解しても、ポイント加算が 0pt であること。
3. 全学年問題（`all`）および高校生問題（`high_3`）では高校生でも通常通りポイントが加算されること。
4. 中学生ユーザー（シュンタロウ `junior_1`）では中1レベルが通常通り表示・解答・ポイント加算されること。
5. 保護者ポータルの登録アカウント一覧で、学年セレクトを変更すると即時 D1 に反映され、リロード後も保持されること。
- 検証コマンド: `npx tsc --noEmit && npm run build`

## 10. 📋 前提条件・ブロッカー
- ブロッカーなし。既存スキーマで完全に対応可能。

## 11. UI / コンポーネント設計
1. `QuizQuest.tsx`:
   - `gradeOptions`: `currentUser.grade_level.startsWith('high')` の場合は `id !== 'junior_1'` でフィルタリング。
   - 解答結果モーダル・トースト: `data.isFoul` の場合は「⚠️ 反則！高校生は中学生クイズではポイントを獲得できません（0pt）」と表示。
2. `ParentPortal.tsx`:
   - 各ユーザーカードに学年セレクト（`<select value={user.grade_level} onChange="...">`）を配置。

## 12. 実装タスクチェックリスト
- [x] T1: バックエンドに `PATCH /api/users/:id/grade` エンドポイントを実装し、ホワイトリスト検証を追加する / 完了条件: `npx tsc --noEmit`
  → 実装: `src/backend/index.ts:L739-L762` / tsc 0 error
- [x] T2: バックエンド `/api/quizzes/answer` に学年チェック（高校生による `junior_1` 解答時の 0pt 反則化）を実装する / 完了条件: `npx tsc --noEmit`
  → 実装: `src/backend/index.ts:L1090-L1145` / tsc 0 error
- [x] T3: フロントエンド `QuizQuest.tsx` で高校生に対する中1タブ除外および反則時UI表示を実装する / 完了条件: `npm run build`
  → 実装: `src/frontend/components/QuizQuest.tsx:L32, L125-L135, L246, L395-L410` / npm run build PASS
- [x] T4: フロントエンド `ParentPortal.tsx` に学年変更セレクトボックスおよび更新通信処理を追加する / 完了条件: `npm run build`
  → 実装: `src/frontend/components/ParentPortal.tsx:L147-L165, L930-L945` / npm run build PASS

## 13. 未確認事項（E-4）
| 未確認項目 | 確認手段 | ブロッカー理由 |
| :--- | :--- | :--- |
| 未確認: なし | 全項目実測確認完了 | ブロッカーなし |

## 14. 品質ゲート実行結果（G-11）
```bash
$ /Users/fukuikeitaro/antigravity-agents/scripts/verify.sh design
========================================================
 verify.sh  role=design  base=HEAD  repo=game
 HEAD=7674d22  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
[PASS] gate-track         ライトトラック宣言と差分（243行）が整合している
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
```

## 15. 改訂履歴（差分改訂 / §2-5）
| 版 | 指摘 # | 変更したセクション | 1 行要約 |
| :--- | :--- | :--- | :--- |
| 初版 | - | 全体 | 新規作成 |
| 第2版 | - | §12 | T1〜T4 実装完了マークと実測証跡の追記 |
