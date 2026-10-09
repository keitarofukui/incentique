# 設計レビュー結果レポート: 未活動ポイント失効計算の是正およびアカウントデータ復旧

- 作成日時: 2026-10-10 06:27
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: ff81428
- 上流 Artifact: docs/design-spec.md（対象コミット: ff81428）
- **判定: APPROVED**

## 0. 上流の抜き取り再実測（§2-3）
### [EV-1] 上流 [EV-1] の再実測（日数計算ロジック）
$ sed -n '124,129p' src/backend/index.ts
```ts
function getDaysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
```
- 【実測】[EV-1] 上流と完全に一致。

### [EV-2] 上流 [EV-2] の再実測（失効判定条件コード）
$ grep -n "inactiveDays >=" src/backend/index.ts
```text
171:  if (inactiveDays >= 3 && currentStage < 1 && currentPoints > 0) {
193:  if (inactiveDays >= 5 && currentStage < 2 && currentPoints > 0) {
215:  if (inactiveDays >= 10 && currentStage < 3 && currentPoints > 0) {
```
- 【実測】[EV-2] 上流と完全に一致。

### [EV-3] 上流 [EV-3] の再実測（シュンタロウの現状データ）
$ npx wrangler d1 execute quest-db --remote --command "SELECT id, name, current_points, last_action_date, inactivity_penalty_stage, last_penalty_date, penalty_base_date FROM users WHERE name LIKE '%シュン%';"
```text
┌─────────────────────────┬──────────────┬────────────────┬──────────────────┬──────────────────────────┬───────────────────┬───────────────────┐
│ id                      │ name         │ current_points │ last_action_date │ inactivity_penalty_stage │ last_penalty_date │ penalty_base_date │
├─────────────────────────┼──────────────┼────────────────┼──────────────────┼──────────────────────────┼───────────────────┼───────────────────┤
│ user_1784723445812_y29a │ シュンタロウ │ 22842          │ 2026-10-07       │ 1                        │ 2026-10-10        │ 2026-10-07        │
└─────────────────────────┴──────────────┴────────────────┴──────────────────┴──────────────────────────┴───────────────────┴───────────────────┘
```
- 【実測】[EV-3] 上流と完全に一致。

## 1. 無条件差し戻し条件の判定（全 11 項目）
| # | 条件 | 判定 | 根拠（設計書の該当箇所を引用） |
| :-- | :--- | :--- | :--- |
| 1 | DB スキーマ変更 DDL | PASS | スキーマ変更なし。データ復旧 SQL（UPDATE, DELETE）が §5 に記載されている [EV-3] |
| 2 | 機密フィールド台帳と漏洩遮断 | PASS | 新規機密フィールド追加なし。§4 に棚卸し記載あり |
| 3 | エラーハンドリング仕様 | PASS | §7 に 5 状態（200/404/500/ネットワーク断/タイムアウト）の挙動表あり |
| 4 | 受け入れ基準と検証コマンド | PASS | §9 に 4 項目の具体的検証コマンド（ビルド、D1照会、本番curl）記載あり |
| 5 | アーキテクチャ選定と却下案 | PASS | §8 に `Math.max(0, diff - 1)` 採用理由と条件式のみ変更案の却下理由が明記されている |
| 6 | API 契約と TypeScript 型 | PASS | §6 に既存契約維持が明記され、破壊的変更なし |
| 7 | キー名とプロパティ名の一致 | PASS | 不一致なし |
| 8 | 未確定前提・ブロッカー | PASS | §10 にブロッカーなしと明記 |
| 9 | タスク分解と完了条件 | PASS | §12 に 3 つの依存順タスク（コード修正 ➔ データ復元 ➔ デプロイ疎通）と完了条件あり |
| 10 | LLM モデル指定 | PASS | LLM 使用なし |
| 11 | 上流調査報告との整合 | PASS | 上流 `investigation-report.md` のフライング失効分析と完全に整合 |

無条件差し戻し項目は全て確認し、該当なし。

## 2. 内容妥当性レビュー
- **要件網羅性**: 10/7活動の場合、10/8（0日）、10/9（1日）、10/10（2日、本日アクションでセーフ）、10/11（3日、Stage 1失効）と遷移し、ユーザーの直感およびフロントエンドの警告表示文言と完全に一致する。
- **データ復旧**: シュンタロウの誤失効額（-11,421pt）の加算、ステージの0リセット、失効ログの削除による本日の日計マイナス解消まで網羅されている。
- **実装容易性**: 修正対象行が明確で、バックエンドのみの軽微な修正で安全にデプロイ可能。

## 3. 指摘事項 & 改善提案
- 指摘事項なし（軽微な改善提案等も不要）。

## 4. 未確認事項（E-4）
- 特になし。

## 5. 品質ゲート実行結果（G-11）
```text
$ /Users/fukuikeitaro/antigravity-agents/scripts/verify.sh design-review
========================================================
 verify.sh  role=design-review  base=HEAD  repo=game
 HEAD=ff81428  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
```
