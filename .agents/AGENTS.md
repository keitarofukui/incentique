# 全プロジェクト共通 マルチエージェント運用ルール (Global Rule)

この環境（Antigravity IDE）で開発を行う際は、原則として以下の「Artifacts（成果物ファイル）リレー方式」による 7 スラッシュコマンド対応マルチエージェント開発フローをサポート・推奨します。

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
| `プロンプト監査:` / `プロンプト整理:` | `/prompt-audit` | `~/antigravity-agents/prompts/09_prompt_auditor.md` | エージェント群の過学習・重複・矛盾を監査・リファクタリング |

---

## 🔄 成果物バトンタッチ（Artifactsリレー）原則

会話履歴の肥大化による前提忘失・品質低下を防ぐため、役割（Agent）ごとのやり取りは口頭のみで行わないでください。必ず以下の標準成果物（Artifacts）を読み書きしてバトンタッチを行います。

### 🚨 フェーズ境界と即時停止ルール（ガードレール）
1. **担当外のファイル操作禁止**:
   - `調査Agent`、`設計Agent` や `各種レビューAgent` は、指定された Artifacts (`docs/*.md`) の編集・作成のみが許可されます。**ソースコードの作成・修正は絶対に行ってはなりません**。
2. **自動進行の厳禁（フェーズごとの即時停止）**:
   - 各エージェントは指定された Artifacts を作成・更新完了後、**勝手に次のフェーズ（特に実装・コード修正）へ進行せず、直ちに応答を終了**してください。
   - 次のロールへのリレー（バトンタッチ）は、ユーザーの明示的な指示またはスラッシュコマンド呼び出し（`/dev` や `製造:` など）によってのみ行われます。
3. **プロジェクトスコープの識別（他プロジェクト記憶の混同防止）**:
   - **デフォルトの操作・解析対象**: 明示的な指示がない限り、操作・解析・レビュー・実装の対象は「**現在開いているワークスペース（カレントディレクトリ）内のファイル**」のみとします。過去のやり取りやグローバル記憶に残っている他プロジェクトのファイル（例: 別アプリのソースコード等）を、ユーザーの指定なく勝手に現在の作業対象として読み込んではなりません。
   - **例外（参照が許可されるケース）**: ユーザーから明示的に「〇〇のプロジェクト/ファイルを参考にして」と指定された場合、またはエージェント自体の定義ファイル（`~/antigravity-agents/` 配下等）を読み込む場合は参照が許可されます。
4. **【機械的絶対禁止事項】DBマイグレーション漏れ & エラー握りつぶしの厳禁**:
   - 🗄️ **DBスキーマ変更のマイグレーション必須チェック**: コード上で D1 / SQLite / Postgres 等の新しいテーブル・カラムを参照・更新する場合、**必ず対応する `migrations/*.sql` ファイルを新規作成し、マイグレーション実行を行わなければコミット・デプロイしてはならない**。
   - 🙈 **エラーの握りつぶし（Error Swallowing）の完全禁止**: `fetch` や非同期 API 呼び出しにおいて `if (res.ok)` のみ書いて `else` 節や `catch` でエラーを無視・隠蔽するコードの作成を**絶対禁止**とする。失敗時は必ずユーザーへのエラー通知およびログ出力を行わなければならない。
5. **【調査・設計のプロフェッショナル原則】実測エビデンス取得 & 二次被害の予見**:
   - 🔍 **推測による調査の禁止**: 調査時は画面の見た目や推測のみで原因判断せず、必ず本番 API レスポンス、エラーログ、DB スキーマ構造（`PRAGMA table_info` 等）の実測エビデンスを直接抽出すること。
   - 🛡️ **二次被害（セキュリティ情報漏洩等）の事前予見**: スキーマ変更や API 追加時、既存の共通 API（`GET /api/settings` 等）を経由してアクセストークン等の機密データが外部漏洩しないよう事前に予見し、防護策（敏感キー除外等）を設計すること。

### 標準成果物ファイルパス

| ロール（エージェント） | 出力・参照ファイル | 役割・内容 |
| :--- | :--- | :--- |
| **0. 調査Agent (Investigator)** | `docs/investigation-report.md` | コード構造分析、バグ原因特定、影響範囲調査（※コード変更不可） |
| **1. 設計Agent (Architect)** | `docs/design-spec.md` | 要件定義、データ構造、API設計、タスク分解チェックリストの作成（※コード実装は不可） |
| **2. 設計レビューAgent (Design Reviewer)** | `docs/design-review.md` | 設計書の網羅性・構造・タスク分解の妥当性レビューと評価 |
| **3. 製造Agent (Developer)** | `docs/design-spec.md` を参照 | 設計書に厳格に従った最小単位のコード実装およびチェックボックス更新 |
| **4. コードレビューAgent (Code Reviewer)** | `docs/code-review.md` | コードの可読性・共通化・保守性・リファクタリング提案 |
| **5. テストAgent (Tester/QA)** | `docs/test-report.md` | ユニット/E2Eテスト、Browser(DevTools)表示確認、テスト結果ログ出力 |
| **6. 監査Agent (Auditor)** | `docs/audit-report.md` | セキュリティ・パフォーマンス・設計差分監査、PASS判定時は本番デプロイ&Git Pushを自動実行 |
| **7. 全自動Agent (Full Pipeline)** | 全 `docs/*.md` & コード実装 | 調査〜設計〜製造〜テスト〜監査・本番デプロイまでを手動介在なしで一括自律完了 |
| **8. 育成Agent (Learner)** | `docs/agent-learning-report.md` | 不具合のなぜなぜ分析を実行し、各エージェントのプロンプトを自動改定・進化 |
| **9. プロンプト監査Agent (Prompt Auditor)** | `docs/prompt-audit-report.md` | 全プロンプトの過学習・重複・矛盾を第三者視点で監査・リファクタリング |

---

## ☁️ GAS (Google Apps Script) デプロイ・最新バージョン公開の徹底ルール

GAS アプリケーション（`/Users/fukuikeitaro/Documents/GAS App/` 配下等）を変更・デプロイする際は、旧バージョンによる反映失敗や反映漏れを防ぐため、以下の手順を**必ず順番に実行**してください：

1. **事前同期**:
   - 作業前に `git pull` （必要に応じて `clasp pull`）を行い、最新状態を確認する。
2. **コード同期 (`clasp push`)**:
   - コード変更後、`clasp push` を実行して GAS クラウド環境へ最新コードを転送する。
3. **最新バージョンの発行・既存デプロイの更新 (`clasp deploy`) 【最重要】**:
   - 単なる `clasp deploy` のみでは新しい Deployment ID が新規作成されてしまい、ユーザーが開く既存の本番 Web アプリ URL（固定ID）が更新されません。
   - 必ず `clasp deployments` で既存の本番 Deployment ID を確認した上で、**`clasp deploy -i <DeploymentID> -d "Update description"`** を実行し、既存デプロイメントのバージョンを更新・公開すること。
4. **Git の同期**:
   - デプロイ完了後、`git add .` ➔ `git commit -m "..."` ➔ `git push` を実行してソースコードとデプロイ状態の履歴を保存する。

---

## 🤖 Gemini API モデル選択ルール（プライベート開発）

プライベート開発において LLM / Gemini API を使用する機能や問題自動生成スクリプト（Node.js / Python / GAS等）の設計・実装を行う際は、**最高コスパモデルである `gemini-3.1-flash-lite` をデフォルトモデルとして設計・指定・ハードコード**してください。勝手に `gemini-2.5-flash` や `gemini-1.5-flash` 等の他モデル・旧モデルを指定することを厳禁とします。
