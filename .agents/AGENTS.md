# Project Rules & Guidelines

## Git Workflow Rule (SAFETY & QUALITY FIRST)

Do NOT commit or push code automatically on every minor file edit or unverified change.

### Mandatory Workflow:
1. **Develop & Test Locally**: Make changes and verify using `npm run build` and tests.
2. **Commit & Push Criteria**:
   - Only commit and push when a specific task, bug fix, or feature is **fully completed and verified**.
   - Before pushing to Git / deploying, confirm that there are zero TypeScript / build errors and that the solution is validated.
3. **Execution Steps** (when ready to deliver a completed, tested milestone):
   - `npm run build` (Must pass with 0 errors)
   - `git add .`
   - `git commit -m "<concise descriptive summary of verified changes>"`
   - `git push`

---

# 全プロジェクト共通 マルチエージェント運用ルール

この環境（Antigravity IDE）で開発を行う際は、原則として以下の「Artifacts（成果物ファイル）リレー方式」による 6 スラッシュコマンド対応マルチエージェント開発フローをサポート・推奨します。

---

## ⚡️ エイリアス・ショートカット呼び出し規約

IDEの仕様上、チャット入力欄の `/` はシステム内蔵コマンドと衝突する場合があります。
そのため、テキストの冒頭に以下のキーワード（`/` 付き、または `日本語エイリアス`）が入力された場合、AIは自動的に対応する定型プロンプトファイルを読み込み、そのロール（役割）として振る舞ってください。

| 日本語エイリアス（推奨） | スラッシュ形式 | 読み込むプロンプトファイル | 成果物（出力・参照） |
| :--- | :--- | :--- | :--- |
| `調査:` / `調査` | `/research` / `/investigate` | `~/antigravity-agents/prompts/00_investigator.md` | `docs/investigation-report.md` を作成 |
| `設計:` / `設計` | `/architect` | `~/antigravity-agents/prompts/01_architect.md` | `docs/design-spec.md` を作成 |
| `設計レビュー:` / `設計レビュー` | `/design-review` | `~/antigravity-agents/prompts/02_design_reviewer.md` | `docs/design-review.md` を作成 |
| `製造:` / `製造` / `実装` | `/dev` | `~/antigravity-agents/prompts/03_developer.md` | `docs/design-spec.md` を読み実装 |
| `コードレビュー:` / `コードレビュー` | `/code-review` | `~/antigravity-agents/prompts/04_code_reviewer.md` | `docs/code-review.md` を作成 |
| `テスト:` / `テスト` / `検証` | `/test` | `~/antigravity-agents/prompts/05_tester.md` | `docs/test-report.md` を作成 |
| `監査:` / `監査` / `レビュー` | `/audit` | `~/antigravity-agents/prompts/06_auditor.md` | `docs/audit-report.md` を作成 |
| `全自動:` / `お任せ` / `全お任せ:` | `/auto` / `/full` | `~/antigravity-agents/prompts/07_full_pipeline.md` | 調査〜設計〜製造〜テスト〜監査・本番適用を一気に自動完遂 |
| `学習:` / `育成:` / `学習` | `/learn` / `/train` | `~/antigravity-agents/prompts/08_learner.md` | 不具合からなぜなぜ分析を実行し、各プロンプトを自律更新・成長 |

---

## 🔄 成果物バトンタッチ（Artifactsリレー）原則

会話履歴の肥大化による前提忘失・品質低下を防ぐため、役割（Agent）ごとのやり取りは口頭のみで行わないでください。必ず以下の標準成果物（Artifacts）を読み書きしてバトンタッチを行います。

### 🚨 フェーズ境界と即時停止ルール（ガードレール）
1. **担当外のファイル操作禁止**:
   - `設計Agent` や `各種レビューAgent` は、指定された Artifacts (`docs/*.md`) の編集・作成のみが許可されます。**ソースコードの作成・修正は絶対に行ってはなりません**。
2. **自動進行の厳禁（フェーズごとの即時停止）**:
   - 各エージェントは指定された Artifacts を作成・更新完了後、**勝手に次のフェーズ（特に実装・コード修正）へ進行せず、直ちに応答を終了**してください。
   - 次のロールへのリレー（バトンタッチ）は、ユーザーの明示的な指示またはスラッシュコマンド呼び出し（`/dev` や `製造:` など）によってのみ行われます。
3. **プロジェクトスコープの識別（他プロジェクト記憶の混同防止）**:
   - **デフォルトの操作・解析対象**: 明示的な指示がない限り、操作・解析・レビュー・実装の対象は「**現在開いているワークスペース（カレントディレクトリ）内のファイル**」のみとします。過去のやり取りやグローバル記憶に残っている他プロジェクトのファイル（例: 別アプリのソースコード等）を、ユーザーの指定なく勝手に現在の作業対象として読み込んではなりません。
   - **例外（参照が許可されるケース）**: ユーザーから明示的に「〇〇のプロジェクト/ファイルを参考にして」と指定された場合、またはエージェント自体の定義ファイル（`~/antigravity-agents/` 配下等）を読み込む場合は参照が許可されます。

### 標準成果物ファイルパス

| ロール（エージェント） | 出力・参照ファイル | 役割・内容 |
| :--- | :--- | :--- |
| **1. 設計Agent (Architect)** | `docs/design-spec.md` | 要件定義、データ構造、API設計、タスク分解チェックリストの作成（※コード実装は不可） |
| **2. 設計レビューAgent (Design Reviewer)** | `docs/design-review.md` | 設計書の網羅性・構造・タスク分解の妥当性レビューと評価 |
| **3. 製造Agent (Developer)** | `docs/design-spec.md` を参照 | 設計書に厳格に従った最小単位のコード実装およびチェックボックス更新 |
| **4. コードレビューAgent (Code Reviewer)** | `docs/code-review.md` | コードの可読性・共通化・保守性・リファクタリング提案 |
| **5. テストAgent (Tester/QA)** | `docs/test-report.md` | ユニット/E2Eテスト、Browser(DevTools)表示確認、テスト結果ログ出力 |
| **6. 監査Agent (Auditor)** | `docs/audit-report.md` | セキュリティ・パフォーマンス・設計差分監査、PASS判定時は本番デプロイ&Git Pushを自動実行 |
