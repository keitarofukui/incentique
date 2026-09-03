# 設計レビュー結果レポート

- 作成日時: 2026-09-03 09:35
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 3eec0f9
- 上流 Artifact: docs/design-spec.md（対象コミット: 3eec0f9）
- **判定: APPROVED**

## 0. 上流の抜き取り再実測（§2-3）

### [EV-1] 上流 [EV-1] の再実行
$ grep -rn "handleSelectMenu" src/frontend/components/TrainingModal.tsx
src/frontend/components/TrainingModal.tsx:61:  const handleSelectMenu = (menu: TrainingMenu) => {
src/frontend/components/TrainingModal.tsx:102:        handleSelectMenu(created);
src/frontend/components/TrainingModal.tsx:111:        handleSelectMenu(custom);
src/frontend/components/TrainingModal.tsx:121:      handleSelectMenu(custom);
src/frontend/components/TrainingModal.tsx:140:          handleSelectMenu(data.menus[0]);
src/frontend/components/TrainingModal.tsx:314:                  onClick={() => handleSelectMenu(menu)}
- 【実測】上流と完全一致。`handleSelectMenu` はメニュー選択時（314行目）に発火している [EV-1]。

### [EV-2] 上流 [EV-2] の再実行
$ sed -n '61,79p' src/frontend/components/TrainingModal.tsx
  const handleSelectMenu = (menu: TrainingMenu) => {
    setSelectedMenu(menu);
    setEarnedPoints(menu.default_points || 50);
  };

  const getYouTubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    let videoId = '';

    if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/')[1];
      videoId = parts.split('&')[0];
    } else if (url.includes('watch?v=')) {
      const parts = url.split('watch?v=')[1];
      videoId = parts.split('&')[0];
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };
- 【実測】上流と完全一致。現在スクロール処理は未実装 [EV-2]。

### [EV-3] 上流 [EV-3] の再実行
$ sed -n '348,375p' src/frontend/components/TrainingModal.tsx
          {/* Embedded YouTube Player */}
          {selectedMenu && embedUrl ? (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                <span className="flex items-center gap-1.5 text-red-400">
                  <Play className="w-4 h-4 fill-red-500 text-red-500" />
                  <span>動画を見ながらその場でトレーニング！</span>
                </span>
                <a
                  href={selectedMenu.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <span>YouTubeで開く</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-700 bg-black shadow-2xl">
                <iframe
                  src={embedUrl}
                  title={selectedMenu.menu_name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                ></iframe>
              </div>
            </div>
- 【実測】上流と完全一致。動画枠コンテナに `ref` 未設定 [EV-3]。

## 1. 無条件差し戻し条件の判定（全 11 項目・未判定禁止）
| # | 条件 | 判定 | 根拠（設計書の該当箇所を引用） |
| :-- | :--- | :--- | :--- |
| 1 | 🗄️ DB スキーマ変更があるのに DDL 全文が無い | **PASS** | §5 にて DB 変更なし・DDL 不要である旨が明記されている |
| 2 | 🛡️ 新規フィールドがあるのに機密台帳・遮断が無い | **PASS** | §4 機密台帳にて新規フィールドなし・機密漏洩リスクなしと明記 |
| 3 | 🙈 API 呼び出しがあるのにエラー仕様未定義 | **PASS** | §7 エラーハンドリング仕様に 5 状態の UI 挙動・ログ・復帰が網羅定義されている |
| 4 | 🧪 受け入れ基準に検証コマンドが無い | **PASS** | §9 に `npx tsc --noEmit` / `npm run build` / `grep` コマンドが明記されている |
| 5 | 🏛️ 短命な回避策を採用し代替検討が無い | **PASS** | §8 にて `scrollIntoView({ behavior: 'smooth' })` を採用し、却下案3件の理由を明記 |
| 6 | 📐 API 契約と TS 型の具象コードが無い | **PASS** | §3 / §6 にて新規 API なし・既存型利用と明記 |
| 7 | 🔤 API キー名と型のプロパティ名不一致 | **PASS** | 新規 API 追加なし、既存の `TrainingMenu` を一貫して使用 |
| 8 | 📋 未確定の前提がブロッカーとして明示されていない | **PASS** | §10 に前提条件およびブロッカーなしと明記 |
| 9 | 🧩 タスク分解が不適切・完了条件なし | **PASS** | §12 に単一の明確なタスク T1 と検証コマンドが明記されている |
| 10 | 🤖 LLM 利用時に既定モデル指定が無い | **PASS** | 本改修で LLM は利用しない |
| 11 | 🕒 上流実測と設計内容が矛盾 | **PASS** | 上流 `investigation-report.md` の実測値（行番号・コード）と完全に一致 |

## 2. 内容妥当性レビュー
- **要件網羅性**: ユーザーがメニューをクリックした時のみスクロールさせ、初期表示（マウント時）には勝手にスクロールさせないという UX 上の配慮が明確に設計されている。
- **データ構造・保守性**: React 標準の `useRef` と DOM 標準 API（`scrollIntoView`）のみを使用し、外部ライブラリ依存がなく保守性が高い。
- **実装容易性**: 製造担当者が迷う余地のない具象コードスニペット（§11）が提供されている。

## 3. 指摘事項 & 改善提案（引用必須）
指摘事項なし（軽微な改善提案のみ）:
- 画面サイズやヘッダー高さに応じて `scroll-mt-6` を付与することで、固定ヘッダーや周囲の余白との被りを確実に防止できる設計となっており妥当である。

## 4. 実測による前提検証（読み取り専用）

### [EV-4] 型チェックとビルドの事前検証
$ npx tsc --noEmit
(出力なし: 終了コード 0)
- 【実測】現状の TypeScript 型チェックにエラーは存在しない [EV-4]。

## 5. 未確認事項（E-4）
| 未確認項目 | 確認手段 | ブロッカー理由 |
| :--- | :--- | :--- |
| 未確認: なし | 設計仕様書およびコードベースの整合性を確認完了 | なし |

## 6. 品質ゲート実行結果（G-11）
$ /Users/fukuikeitaro/antigravity-agents/scripts/verify.sh design-review
========================================================
 verify.sh  role=design-review  base=HEAD  repo=game
 HEAD=3eec0f9  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
