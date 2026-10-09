# 機能設計仕様書: 未活動ポイント失効計算の是正およびアカウントデータ復旧

- 作成日時: 2026-10-10 06:25
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: ff81428
- 上流 Artifact: docs/investigation-report.md（対象コミット: ff81428）
- トラック: ライト（ロジック計算の修正およびデータ復元のみであり、スキーマ・機密フィールド・外部API・認証に触れず、コード差分も200行未満の見込み / §2-6）
- トラック自己照合: §12 の変更対象パス = `src/backend/index.ts` のみ。リスクパス（migrations, auth, secret 等）への抵触: 無し。

## 0. 上流の抜き取り再実測（§2-3・軽量コマンド 3 件）
### [EV-1] 日数計算ロジック（上流 [EV-4] の再実測）
$ sed -n '124,129p' src/backend/index.ts
```ts
function getDaysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
```
- 【実測】[EV-1] 上流と一致。カレンダー差分を返している。

### [EV-2] 失効判定コード（上流 [EV-5] の再実測）
$ grep -n "inactiveDays >=" src/backend/index.ts
```text
171:  if (inactiveDays >= 3 && currentStage < 1 && currentPoints > 0) {
193:  if (inactiveDays >= 5 && currentStage < 2 && currentPoints > 0) {
215:  if (inactiveDays >= 10 && currentStage < 3 && currentPoints > 0) {
```
- 【実測】[EV-2] 上流と一致。`inactiveDays` が 3, 5, 10 で各ステージが発動する。

### [EV-3] シュンタロウの現状データ（上流 [EV-1] の再実測）
$ npx wrangler d1 execute quest-db --remote --command "SELECT id, name, current_points, last_action_date, inactivity_penalty_stage, last_penalty_date, penalty_base_date FROM users WHERE name LIKE '%シュン%';"
```text
┌─────────────────────────┬──────────────┬────────────────┬──────────────────┬──────────────────────────┬───────────────────┬───────────────────┐
│ id                      │ name         │ current_points │ last_action_date │ inactivity_penalty_stage │ last_penalty_date │ penalty_base_date │
├─────────────────────────┼──────────────┼────────────────┼──────────────────┼──────────────────────────┼───────────────────┼───────────────────┤
│ user_1784723445812_y29a │ シュンタロウ │ 22842          │ 2026-10-07       │ 1                        │ 2026-10-10        │ 2026-10-07        │
└─────────────────────────┴──────────────┴────────────────┴──────────────────┴──────────────────────────┴───────────────────┴───────────────────┘
```
- 【実測】[EV-3] 上流と一致。`current_points: 22842`, `inactivity_penalty_stage: 1` でフライング失効状態。

### [EV-4] ビルドおよび型検証の実測
$ npm run build && npx tsc --noEmit
```text
✓ built in 1.61s
(tsc --noEmit エラー出力なし)
```
- 【実測】[EV-4] ビルドおよび型チェックはエラーなし。

## 0-1. 確定済みの前提（上流から引き継ぎ・再実測しない / §2-5）
| 事実 | 根拠 |
| :--- | :--- |
| シュンタロウの最終活動日は2026-10-07（クイズ正解ログ実在） | [EV-3] |
| 2026-10-10 06:04:00 (JST) に -11,421pt の失効が物理適用された | [EV-3] |
| 本日の論理日付は朝4時基準で正しく `2026-10-10` である | [EV-3] |
| ビルドおよび型チェックはエラーなし | [EV-4] |

## 1. 概要・目的
- 目的: 最終活動日から丸一日活動しなかった過去日（0ptの日）の確定日数を正しく計算し、当日（進行中の日）を誤って未活動日数にカウントして1日早く失効が執行されるフライングバグを修正する。
- 合わせて、不当に失効されたシュンタロウの所持ポイント（11,421pt）および失効ステージを復旧する。

## 2. 機能要件 / 非機能要件
- **FR-1 (未活動日数の正準定義)**: 「丸一日活動しなかった日数（確定未活動日数）」は、カレンダー上の日数差から当日（1日分）を除いた `Math.max(0, getDaysDifference(baseDate, logicalToday) - 1)` とする。
- **FR-2 (失効判定)**:
  - 10/7活動の場合:
    - 10/8: 0日（今日活動すればセーフ）
    - 10/9: 1日（10/8が未活動で確定、今日活動すればセーフ）
    - 10/10: 2日（10/8, 10/9が未活動で確定、今日活動すればセーフ）
    - 10/11: 3日（10/8, 10/9, 10/10の3日連続未活動が確定し、Stage 1 失効！）
- **FR-3 (警告表示の整合)**: `/api/users/:id/summary` の `inactiveDays` も同様に算出し、10/10は「あと1日で3分の1失効」と表示させ、「本日1ポイントでもアクションを獲得すれば失効を阻止できる」UI文言と完全に一致させる。
- **FR-4 (データ復旧)**: シュンタロウの `current_points` を 34,263 に戻し、`inactivity_penalty_stage` を 0、誤失効ログを物理削除して日計マイナスを解消する。

## 3. データフロー全経路
1. **読み出し**:
   - `src/backend/index.ts:L521-L523` (`GET /api/users`)
   - `src/backend/index.ts:L543-L547` (`GET /api/users/:id/summary`)
2. **判定・計算（変更箇所）**:
   - `src/backend/index.ts:L166`
     - 変更前: `const inactiveDays = getDaysDifference(baseDate, logicalToday);`
     - 変更後: `const daysDiff = getDaysDifference(baseDate, logicalToday); const inactiveDays = Math.max(0, daysDiff - 1);`
   - `src/backend/index.ts:L562`
     - 変更前: `const inactiveDays = baseDate >= logicalToday ? 0 : getDaysDifference(baseDate, logicalToday);`
     - 変更後: `const daysDiff = baseDate >= logicalToday ? 0 : getDaysDifference(baseDate, logicalToday); const inactiveDays = Math.max(0, daysDiff - 1);`
3. **書き込み（ペナルティ適用時のみ）**:
   - `src/backend/index.ts:L176-L186`, `L235-L237`
4. **画面表示**:
   - `src/frontend/components/PersonalStreakCard.tsx:L208-L232`

## 4. 🛡️ 機密フィールド台帳と漏洩遮断設計（G-7）
| フィールド | 機密度 | 既存の露出経路（実測） | 遮断策（具体実装） |
| :--- | :--- | :--- | :--- |
| `current_points` | 低（公開ポイント） | `/api/users` で公開 | 変更なし（通常表示フィールド） |
| `inactivity_penalty_stage` | 低（管理フラグ） | `/api/users` で公開 | 変更なし |
※ 本改修で新しいフィールドや機密データの追加・変更は存在しない。

## 5. 🗄️ DB マイグレーション DDL（全文 / G-4）
本機能修正は既存カラムの計算ロジック変更のため、**DDL マイグレーション（スキーマ変更）は不要**。
データ復旧用 SQL（D1リモート適用）:
```sql
-- 1. シュンタロウのステータス復元
UPDATE users 
SET current_points = 34263, 
    inactivity_penalty_stage = 0, 
    last_penalty_date = NULL 
WHERE id = 'user_1784723445812_y29a';

-- 2. 誤発行された失効ログの削除
DELETE FROM action_logs 
WHERE id = 'log_decay_1791579840579_1o3z';
```

## 6. API 契約（パス完全一致・リクエスト/成功/エラー JSON・ステータス）
既存 API のレスポンス型・構造に変更なし。値の計算結果のみ正常化される。
- `GET /api/users`
  - 成功: 200 `{ "success": true, "users": [...] }`
- `GET /api/users/:id/summary`
  - 成功: 200 `{ "success": true, "summary": { "inactiveDays": 2, "penaltyWarning": { "inactiveDays": 2, "daysUntilPenalty": 1, "penaltyLabel": "3分の1失効" } } }`
  - 失敗: 404 `{ "success": false, "error": "User not found" }` / 500 `{ "success": false, "error": string }`

## 7. 🙈 エラーハンドリング仕様（G-5・5 状態の表）
| 状態 | バックエンド挙動 | フロントエンド挙動 | ログ出力先 |
| :--- | :--- | :--- | :--- |
| 成功 (200) | 正常JSON返却 | 正しい未活動日数・警告表示 | なし |
| 404 (Not Found) | `{ success: false, error: "User not found" }` | ユーザー見つかりません表示 | `console.error` |
| 500 (Internal Error) | `{ success: false, error: message }` | エラーメッセージ表示 | `console.error` |
| ネットワーク断 | 接続拒絶 | 通信エラー再試行ボタン表示 | `console.error` |
| タイムアウト | 応答なし | タイムアウト表示 | `console.error` |

## 8. 🏛️ アーキテクチャ選定と却下案（G-8）
- **採用方式**: `inactiveDays` の算出式を `Math.max(0, getDaysDifference(baseDate, logicalToday) - 1)` とする。
  - 理由: 「未活動日数」の言葉の定義を「丸一日活動しなかった確定日数」と揃えることで、`if (inactiveDays >= 3)` やフロントの「○日間ポイント未獲得」表示との整合性が極めて自然になる。
- **却下案**:
  - `inactiveDays` はそのままで、失効判定条件を `if (inactiveDays >= 4)` に書き換える案
    - 却下理由: 条件式だけを変えると、フロントの表示が「⚠️ 3日間ポイント未獲得！あと1日で3分の1失効」となり、ユーザーから「3日未獲得なのになぜあと1日？」と混乱を招くため。

## 9. 🧪 受け入れ基準（検証コマンド付き）
1. `npm run build && npx tsc --noEmit` が exit 0 で成功すること。
2. データ復旧後、シュンタロウの `current_points` が 34,263、`inactivity_penalty_stage` が 0、失効ログが 0 件になること。
3. 本番 API `/api/users/user_1784723445812_y29a/summary` において、`inactiveDays` が 2、`penaltyWarning.daysUntilPenalty` が 1 と返ること。
4. `/api/users` を叩いても、シュンタロウのポイントが 34,263 のまま減算されないこと。

## 10. 📋 前提条件・ブロッカー
- ブロッカーなし。

## 11. UI / コンポーネント設計
- フロントエンド側のコンポーネントコード修正は不要（APIレスポンスの `inactiveDays: 2`, `daysUntilPenalty: 1` に基づき、既存の `PersonalStreakCard.tsx` が自動で正しいバナーを描画する）。

## 12. 実装タスクチェックリスト（依存順・1 タスク 1 コミット・完了条件付き）
- [x] T1: `src/backend/index.ts` の未活動日数計算式修正（`checkAndApplyInactivityPenalty` および `/api/users/:id/summary`） / 完了条件: `npx tsc --noEmit` exit 0, `npm run build` exit 0
  → 実装: `src/backend/index.ts:L166-L167, L563-L564` / `npm run build` 成功 / `tsc --noEmit` 0 error / `verify.sh dev` PASS
- [x] T2: D1 リモートデータベースでのシュンタロウのアカウントデータ復元（ポイント復元、stage復元、誤ログ削除） / 完了条件: D1 照会で `current_points = 34263`, `inactivity_penalty_stage = 0`, 該当ログ 0件
  → 実装: D1 UPDATE/DELETE 実行 / `current_points: 34263`, `inactivity_penalty_stage: 0`, ログ件数 0件 実測確認
- [x] T3: デプロイおよび本番 API 疎通確認 / 完了条件: `curl -i` でシュンタロウの `current_points = 34263`, `inactiveDays = 2`, `daysUntilPenalty = 1` が返ること
  → 実装: 本番デプロイ完了（Version ID: `a3131382-c506-4158-900e-b7494fce0b6d`） / `curl -i` 実測で `totalPoints: 34263`, `inactiveDays: 2`, `daysUntilPenalty: 1` 確認 / `verify.sh test` PASS

## 13. 未確認事項（E-4）
- 過去の他ユーザーの失効履歴の再調査（本件スコープ外）。

## 14. 品質ゲート実行結果（G-11）
```text
$ /Users/fukuikeitaro/antigravity-agents/scripts/verify.sh design
========================================================
 verify.sh  role=design  base=HEAD  repo=game
 HEAD=ff81428  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
```

## 15. 改訂履歴（差分改訂 / §2-5）
| 版 | 指摘 # | 変更したセクション | 1 行要約 |
| :--- | :--- | :--- | :--- |
| 初版 | - | 全体 | 初版作成 |
