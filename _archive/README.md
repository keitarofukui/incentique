# _archive

設計変更で使われなくなったコンポーネントの退避先です。**ビルド対象外**（`tsconfig.json` の `include` は `src` のみ、Vite も import されていないファイルはバンドルしません）。

このプロジェクトは Git 管理下にないため、削除ではなく移動しています。不要と判断できたらフォルダごと削除してください。

| ファイル | 使われなくなった理由 |
| --- | --- |
| `ActionLogModal.tsx` | 記録入力がモーダルからタブ画面（`InputReviewModal` / `TrainingModal` / `EatRiceModal`）に移行したため |
| `PinAuthModal.tsx` | 子どもごとの4桁PINログインが「ワンクリックでプロフィール選択」に変更されたため |
| `AiQuizGenerator.tsx` | Gemini でのクイズ生成が `scripts/` のオフライン生成 + seed SQL に移行し、画面からの入口が無くなったため。バックエンドの `POST /api/quizzes/generate` は残してあるので、再度UIを付ける場合はここから復帰できます |
