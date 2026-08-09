# プロンプト＆エージェント監査レポート (Prompt Audit Report)

## 1. 監査対象
- 中央エージェントリポジトリ `~/antigravity-agents/prompts/` 配下の全プロンプトファイル (`00` 〜 `08`)

---

## 2. 実施したリファクタリング・抽象化

### 🧹 ① 過学習（特定アプリ依存記述）の抽象化
- **[01_architect.md](file:///Users/fukuikeitaro/antigravity-agents/prompts/01_architect.md)**:
  - ❌ **変更前**: `「クイズ=Cyan, インプット=Purple, 運動=Emerald, 食事=Amber」` や `「Header.tsx等」` という特定アプリの個別名称が含まれていた。
  - ⭕️ **改定後**: `「アプリケーション既存のナビゲーションメニューやカラーパレット定義と1:1で完全に同期・調和させる」` という汎用的なデザインシステム準拠原則へ抽象化。
- **[03_developer.md](file:///Users/fukuikeitaro/antigravity-agents/prompts/03_developer.md)**:
  - ❌ **変更前**: `「獲得ポイントの大きい bonus ログを other（その他）等の別カテゴリ（meal等）へ無造作に合算しない」` や `「📊 ダッシュボード」` という個別の具体例が含まれていた。
  - ⭕️ **改定後**: `「性質や影響度の異なるデータ（ボーナス値や特殊データ等）を他の汎用カテゴリへ無造作に合算・丸め込まず、データ定義に基いて適切に独立・分類すること」` および `「機能と役割を直感的に表す洗練された簡潔な名称・ラベルとすること」` へ抽象化。

### ✂️ ② 重複・長文の削減と可読性向上
- ガードレール表記の重複を統合整理し、プロンプトの文字数をスリムに保ちつつ指示追従性（Instruction Following）を高めました。

### 🛡️ ③ ガードレール整合性チェック
- 担当外のコード変更禁止
- フェーズ完了後の即時停止
- 実環境・DevToolsでの実検証義務付け
- プロジェクトスコープの隔離原則
上記すべてのコアガードレールが正常に維持されていることを確認しました。

---

## 3. Git同期ステータス
- **Commit & Push**: 完了 (`refactor(prompt-audit): abstract app-specific rules into general architecture principles`)
