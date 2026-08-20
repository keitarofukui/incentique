# エージェント自己学習・成長レポート (`docs/agent-learning-report.md`)

## 1. 対象の不具合・課題
- **不具合現象**: 新機能「家事で稼ぐ」のフォーム送信時、フロントエンドから `/api/actions` へリクエストが送信され HTTP 404 エラーが発生して報告に失敗した。
- **ユーザー指摘**: 「なぜ、一回試せばわかることで不具合を出しちゃう？言い訳でなく、再発防止を検討ください。」

---

## 2. なぜなぜ分析（5 Whys Analysis）

- **Why 1（直接原因）**: なぜ家事報告時にエラーが発生したのか？
  - `HouseworkModal.tsx`（フロントエンド）が呼び出す API のパスが `/api/action-logs` ではなく、存在しない `/api/actions` になっていたため（404 Not Found）。
- **Why 2（実装時の思い込み）**: なぜ間違ったエンドポイントパス `/api/actions` を記述してしまったのか？
  - `HouseworkModal.tsx` を新規作成する際、既存の `TrainingModal.tsx` や `EatRiceModal.tsx` の実コード（`fetch('/api/action-logs', ...)`）を `grep` 参照せず、設計書の概念名 `/api/actions` を思い込みでそのまま URL に指定したため。
- **Why 3（コードレビューの未検知）**: なぜコードレビュー（Step 4）で検出できなかったのか？
  - Reviewer Agent が `src/backend/index.ts` の実際のルーティング定義（`app.post('/api/action-logs', ...)`）とフロントエンドの `fetch` URL との「文字列完全一致クロスチェック」を義務化していなかったため。
- **Why 4（テストフェーズの形式化）**: なぜ一回試せばわかることなのに、テストフェーズ（Step 5）で検出できず本番デプロイしてしまったのか？
  - Tester Agent が `npm run build`（型/構文チェック）と D1 SQL 実行確認（テーブル作成・シード投入）のみを行い、**「`curl` 等で実際の HTTP POST/GET リクエストを送信し、ステータス 200 と JSON レスポンスを確認する結合疎通テスト」を実施しないまま PASS 判定**を下したため。
- **Why 5（根本原因・ガードレールの不足）**: なぜテスト・検証で「実API疎通テスト」が必須化されていなかったのか？
  - テストプロンプト `05_tester.md` およびレビュープロンプト `04_code_reviewer.md` に、「API通信を伴う機能を追加・変更した際は、必ず実際の HTTP リクエストを送信してレスポンスを確認する」という具体的で強制力のあるルールが明記されていなかったため。

---

## 3. 追加・改定したエージェントルール（再発防止策）

今回の教訓に基づき、マルチエージェント基盤 (`~/antigravity-agents/prompts/`) のプロンプトを直接改定・強化しました。

1. 🧪 **テストAgent (`05_tester.md`)**:
   - **`HTTP API 結合テストの実効検証義務` の追加**:
     フロントエンドからバックエンド API への通信を伴う機能を追加・変更した際、ビルド成功のみで PASS 判定することを禁止。必ず `curl` やテストスクリプト等で**実際の HTTP POST/GET リクエストを送信し、ステータスコード 200 OK およびレスポンス JSON の正常性を実検証することを強制**。
2. 🔍 **コードレビューAgent (`04_code_reviewer.md`)**:
   - **`フロント fetch URL vs バックエンド API ルート一致チェック` の追加**:
     フロントエンドの `fetch('/api/...', ...)` のパスが、バックエンド (`src/backend/index.ts`) のルーティング URL と文字単位で 100% 完全一致しているかをコードレビュー時にクロスチェックする項目を追加。
3. 🔨 **製造Agent (`03_developer.md`)**:
   - 既存類似機能（`TrainingModal` や `EatRiceModal` 等）のコードを必ず `grep` 参照し、エンドポイント URL や通信フォーマットの流用を厳格化。

---

## 4. Git同期ステータス
- **エージェント定義リポジトリ (`antigravity-agents`)**: コミット＆Push完了 ([commit c78842a](https://github.com/keitarofukui/antigravity-agents/commit/c78842a))
- **本プロジェクト**: 今後のパイプライン全自動実行において改定されたガードレールが自動適用されます。
