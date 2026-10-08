# 機能設計仕様書: ライバル画面表示改善・記録更新お知らせ速報・保護者履歴改行解消

- 作成日時: 2026-10-08 09:10
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 0fa97d4
- 上流 Artifact: docs/investigation-report.md（対象コミット: 0fa97d4）

## 0. 上流の抜き取り再実測（§2-3・軽量コマンド 3 件）
### [EV-1] 上流 [EV-1] の再実行（RivalBoard.tsx カード構造）
$ git show HEAD:src/frontend/components/RivalBoard.tsx | sed -n '73,95p'
```tsx
          return (
            <div
              key={user.id}
              className={`p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                isMe
                  ? 'bg-slate-900/90 border-cyber-neonCyan/60 shadow-glow-cyan'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl border border-slate-700 shrink-0">
                  {user.avatar || '⚡'}
                </div>
```
- 【実測】上流と完全に一致。左右2分割 flex 構造と横幅不足を確認 [EV-1]。

### [EV-2] 上流 [EV-2] の再実行（ParentPortal.tsx テーブル構造）
$ sed -n '675,690p' src/frontend/components/ParentPortal.tsx
```tsx
                            <th className="pb-2 font-medium">カテゴリー / 内容</th>
                            <th className="pb-2 font-medium text-right">獲得ポイント</th>
                            <th className="pb-2 font-medium text-center">操作</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs">
                          {allLogs.map((log) => {
```
- 【実測】上流と完全に一致。ユーザー列に whitespace-nowrap が無いことを確認 [EV-2]。

### [EV-3] 上流 [EV-3] の再実行（TrainingModal.tsx 変更履歴）
$ git log -n 3 --oneline -- src/frontend/components/TrainingModal.tsx
```
1efa365 feat: 夏休みバナー撤去および未活動日数に応じたポイント失効機能の実装
8f2db70 feat: auto-scroll to YouTube player on training menu select and audit release
a3276dc feat: audited and deployed font scale accessibility improvements to production
```
- 【実測】上流と完全に一致。直近のコミットで変更がなくデグレでないことを確認 [EV-3]。

### [EV-4] 本番APIのユーザーデータとストリーク実測値
$ curl -s https://quest-habit-app.keitaro-fukui.workers.dev/api/users
```json
{"success":true,"users":[{"name":"チチ","current_streak_days":10},{"name":"りょーたろ","current_streak_days":34,"current_50pt_streak_days":34,"current_100pt_streak_days":14},{"name":"シュンタロウ","current_streak_days":10}]}
```
- 【実測】本番APIにおいてりょーたろが34日連続達成（神ストリーク14日連続）を保持していることを確認 [EV-4]。

### [EV-5] ビルド動作確認
$ npm run build
```
✓ built in 1.68s
```
- 【実測】プロダクションビルドが成功することを確認 [EV-5]。

### [EV-6] 型チェック動作確認
$ npx tsc --noEmit
```
(出力なし、終了コード 0)
```
- 【実測】型エラー 0 件で合格することを確認 [EV-6]。

## 0-1. 確定済みの前提（上流から引き継ぎ・再実測しない / §2-5）
| 事実 | 根拠 |
| :--- | :--- |
| `users` テーブル・APIに連続達成日数（`current_streak_days` 等）が保持されている | [EV-4] |
| `npm run build` は正常に通る | [EV-5] |
| `npx tsc --noEmit` は型エラー0件で合格 | [EV-6] |

- トラック: ライト（UI表示改善・速報バナー新設・スタイル修正であり、スキーマ・認証・機密に触れず差分200行未満のため / §2-6）
- トラック自己照合: §12 の変更対象パス = `src/frontend/components/RivalBoard.tsx`, `src/frontend/components/ParentPortal.tsx` / リスクパス・他レーン共有パスへの抵触: 無し

## 1. 概要・目的
1. **ライバルランキングの視認性向上**: モバイル画面幅において、ランキングカード内の名前が「シュン / タロウ」のように不愉快に文字改行される問題を解消し、順位・アバター・名前・所持ポイントが美しく一目で把握できるレイアウトへ刷新する。
2. **すごい記録更新中速報バナーの新設**: ライバル画面の先頭に、連続達成日数（ストリーク）の保持者や神ストリーク更新中を称えるハイライト速報バナーを新設し、家族間の競争・モチベーションを高める。
3. **保護者履歴の名前1文字改行解消**: 「全員のアクション履歴」テーブルにおいて、名前が1文字ずつ縦改行される不具合を `whitespace-nowrap` および適切な最小幅により解消する。
4. **YouTube横画面回転**: デグレでない旨の確認と、端末の縦向きロック解除・全画面ボタン操作の案内。

## 2. 機能要件 / 非機能要件
### 機能要件
- **FR-1**: `RivalBoard.tsx` において、モバイル時は上段（順位・アバター・名前・YOU）と下段（クリア達成数・所持ポイント）の2段構成、PC時は1行構成とするレスポンシブデザインを適用。名前の途中で改行させない（`whitespace-nowrap`）。
- **FR-2**: `RivalBoard.tsx` の上部に「🔥 注目の記録更新中！」ハイライト速報カードを配置。
  - ストリーク日数トップのユーザー、またはストリーク >= 3日以上のユーザーが存在する場合に表示。
  - 例: 「🔥【りょーたろ】が 34日連続記録 を猛烈更新中！（神ストリーク14日連続）」
  - 表示条件: ストリーク継続中のユーザーが存在する場合。
- **FR-3**: `ParentPortal.tsx` の履歴テーブルのユーザー列に `whitespace-nowrap min-w-[5rem]` を適用し、名前が常に1行で表示されるようにする。

### 非機能要件
- **NFR-1**: D1データベースへの追加クエリや負荷は一切発生させない（既存の `/api/users` から渡される `users` 配列のデータのみで完結）。
- **NFR-2**: TypeScript型エラー0件、既存のビルド・テストをパスすること。

## 3. データフロー全経路
1. **既存経路**:
   - `src/frontend/App.tsx:L170-L175` ➔ `/api/users` 呼び出し ➔ 全ユーザー情報（`current_streak_days`, `current_50pt_streak_days`, `current_100pt_streak_days` 含む）を取得
   - `src/frontend/App.tsx:L459-L464` ➔ `<RivalBoard users={users} currentUser={currentUser} actionLogs={actionLogs} />` に props 渡し
2. **変更後経路**:
   - `RivalBoard.tsx` 内で `users` 配列からストリーク記録トップのユーザー（`topStreaker`）を算出。
   - 上部ヘッダー直下に「🔥 注目の記録更新中！」ハイライト速報バナーをレンダリング。
   - ランキングカード一覧をモバイル最適化レイアウトでレンダリング。

## 4. 🛡️ 機密フィールド台帳と漏洩遮断設計（G-7）
| フィールド | 機密度 | 既存の露出経路（実測） | 遮断策（具体実装） |
| :--- | :--- | :--- | :--- |
| なし（新フィールド追加なし） | - | - | 既存の公開フィールド（`name`, `current_streak_days` 等）のみを使用し、機密情報は扱わない。 |

## 5. 🗄️ DB マイグレーション DDL（全文 / G-4）
本改修では DB スキーマの変更は行わない（該当なし）。

## 6. API 契約
本改修では新しい API エンドポイントの新設・変更は行わない（既存の `/api/users` をそのまま使用）。

## 7. 🙈 エラーハンドリング仕様（G-5・5 状態の表）
| 状態 | UI挙動 | 表示メッセージ | ログ出力 |
| :--- | :--- | :--- | :--- |
| 正常系（データあり） | 速報バナーおよびランキングカードを正常表示 | - | なし |
| データなし（users空） | カード一覧を非表示またはローディング | - | なし |
| ストリーク該当者なし | 速報バナーを非表示 | - | なし |
| 4xx / 5xx / ネットワーク断 | 既存の `App.tsx` のエラーハンドリングに準拠 | エラーメッセージ表示 | `console.error` |

## 8. 🏛️ アーキテクチャ選定と却下案（G-8）
- **採用方式**:
  - クライアントサイドでの既存データ（`users` プロパティ）活用による速報バナー生成。
  - モバイルファーストのFlexbox/Tailwind CSSによるカードレイアウト再設計。
- **却下案**:
  - **却下案1: D1への日別最高記録集計APIの新設**:
    - 理由: `action_logs` の全件スキャンが発生し、先日最適化した D1 rows_read クォータを消費するリスクがあるため却下。まずは負荷ゼロの連続記録（ストリーク）と本日記録を活用する。
  - **却下案2: CSS での単純な `truncate`（省略表記）**:
    - 理由: 名前が途中で「シュン...」のように途切れてしまい、ライバルとしての愛着や認識性が損なわれるため却下。縦積みレイアウトにより名前の全文を1行で表示する。

## 9. 🧪 受け入れ基準（検証コマンド付き）
1. `npm run build` がエラーなく成功すること: `$ npm run build` (exit 0)
2. `npx tsc --noEmit` が型エラー 0 件で合格すること: `$ npx tsc --noEmit` (exit 0)
3. `RivalBoard.tsx` において、`whitespace-nowrap` が適用され、名前が1行で表示されること: `$ grep -rn "whitespace-nowrap" src/frontend/components/RivalBoard.tsx`
4. `ParentPortal.tsx` において、ユーザー列に `whitespace-nowrap` が適用されること: `$ grep -rn "whitespace-nowrap" src/frontend/components/ParentPortal.tsx`

## 10. 📋 前提条件・ブロッカー
- ブロッカーなし。すべて手元のコードベースおよび既存APIデータのみで完結。

## 11. UI / コンポーネント設計
### RivalBoard.tsx
1. **ハイライト速報カード**:
   - 背景: `bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/30`
   - アイコン: `Flame` / `Crown`
   - 文言: `🔥【りょーたろ】が 34日連続記録 を猛烈更新中！（神ストリーク14日連続）`
2. **ランキングカード**:
   - モバイル: `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3`
   - 上段（モバイル）: 順位バッジ + アバター + 名前（`whitespace-nowrap`） + YOUバッジ
   - 下段（モバイル）: クリア達成数 + 所持ポイント（`text-amber-400 font-mono`）
   - PC（sm以上）: 横1行に整列

### ParentPortal.tsx
- 履歴テーブルの `<th>ユーザー</th>` および `<td>` に `whitespace-nowrap min-w-[5rem]` を追加。

## 12. 実装タスクチェックリスト（依存順・1 タスク 1 コミット・完了条件付き）
- [x] T1: `src/frontend/components/RivalBoard.tsx` のカードレイアウト改善と記録更新中速報バナーの実装 / 完了条件: `npx tsc --noEmit` 0 error ＋ `npm run build` 成功
  → 実装: `src/frontend/components/RivalBoard.tsx` / モバイル縦積み＋whitespace-nowrap＋ストリーク速報バナー追加 / tsc 0 error / build 成功
- [x] T2: `src/frontend/components/ParentPortal.tsx` のユーザー列改行防止（`whitespace-nowrap min-w-[5rem]`）の実装 / 完了条件: `npx tsc --noEmit` 0 error ＋ `npm run build` 成功
  → 実装: `src/frontend/components/ParentPortal.tsx:L674, L703` / whitespace-nowrap min-w-[5rem] 追加 / tsc 0 error / build 成功

## 13. 未確認事項（E-4）
| 未確認項目 | 確認手段 | ブロッカー理由 |
| :--- | :--- | :--- |
| 実機（iPhone）での画面回転ロック状態 | ユーザーへの案内 | 端末側の物理操作であるため |

## 14. 品質ゲート実行結果（G-11）
$ /Users/fukuikeitaro/antigravity-agents/scripts/verify.sh design
```
========================================================
 verify.sh  role=design  base=HEAD  repo=game
 HEAD=d5ee1e3  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
```

## 15. 改訂履歴（差分改訂 / §2-5）
| 版 | 指摘 # | 変更したセクション | 1 行要約 |
| :--- | :--- | :--- | :--- |
| 1 | - | 初版作成 | 新規作成 |
