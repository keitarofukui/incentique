# Game Project Rules for Claude Code

## 🤖 マルチエージェント運用ルール

ユーザーの入力冒頭に以下のキーワードが含まれる場合、対応するプロンプトファイル（`~/antigravity-agents/prompts/*.md`）を読み込み、成果物を作成して即時停止してください。

| 日本語エイリアス | 読み込むプロンプトファイル | 成果物（出力・参照） | 役割・内容 |
| :--- | :--- | :--- | :--- |
| `調査:` / `調査` | `~/antigravity-agents/prompts/00_investigator.md` | `docs/investigation-report.md` を作成 | 現状のコード解析、バグ原因特定、影響範囲調査（コード変更不可） |
| `設計:` / `設計` | `~/antigravity-agents/prompts/01_architect.md` | `docs/design-spec.md` を作成 | 要件定義、データ構造、API設計、タスク分解チェックリスト作成（コード実装不可） |
| `設計レビュー:` | `~/antigravity-agents/prompts/02_design_reviewer.md` | `docs/design-review.md` を作成 | 設計書の網羅性・構造・タスク分解の妥当性レビュー |
| `製造:` / `実装` | `~/antigravity-agents/prompts/03_developer.md` | `docs/design-spec.md` を読み実装 | 設計書に厳格に従った最小単位のコード実装およびチェックボックス更新 |
| `コードレビュー:` | `~/antigravity-agents/prompts/04_code_reviewer.md` | `docs/code-review.md` を作成 | コードの可読性・共通化・保守性・リファクタリング提案 |
| `テスト:` / `検証` | `~/antigravity-agents/prompts/05_tester.md` | `docs/test-report.md` を作成 | ユニット/E2Eテスト、実画面・DevTools表示確認、テスト結果出力 |
| `監査:` / `レビュー` | `~/antigravity-agents/prompts/06_auditor.md` | `docs/audit-report.md` を作成 | セキュリティ・パフォーマンス・設計差分監査、PASS / REJECT 判定 |

---

## 🚨 ガードレール & 停止原則

1. **コード編集の制限**: `調査 Agent`、`設計 Agent`、`各種レビュー Agent` はソースコードを一切編集せず、指定の `docs/*.md` の作成・更新のみを行ってください。
2. **即時停止**: 成果物の出力が完了したら、自発的に実装など次のフェーズへ進まず、直ちに処理を完了・停止してください。
