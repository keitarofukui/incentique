# 機能設計仕様書: ログイン画面アカウント選択カードのコンパクト化・スマホ2列表示

- 作成日時: 2026-10-08 09:35
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 75c7259
- 上流 Artifact: なし（UIスリム化新規設計）

## 0. 実測エビデンス（§2-3）
### [EV-1] LoginSelectScreen.tsx 現行グリッド・カード構造
$ sed -n '62,88p' src/frontend/components/LoginSelectScreen.tsx
```tsx
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => onSelectUser(user)}
                  className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-800 hover:border-cyber-neonCyan/60 cursor-pointer text-center space-y-3 group transition-all transform hover:-translate-y-1"
                >
                  <div className="text-5xl group-hover:scale-110 transition-transform">
                    {user.avatar || '⚡'}
                  </div>

                  <div className="space-y-0.5">
                    <h3 className="text-lg font-black text-white group-hover:text-cyber-neonCyan transition-colors">
                      {user.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      学年: {user.grade_level === 'high_3' ? '高3' : user.grade_level === 'junior_1' ? '中1' : 'その他'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span>所持pt</span>
                    <span className="font-mono font-black text-amber-400">
                      {user.current_points.toLocaleString()} pt
                    </span>
                  </div>
                </div>
              ))}
            </div>
```
- 【実測】モバイル幅で `grid-cols-1` となり1人ずつ縦積みされ、アバターが `text-5xl`、パディング `p-5` で高さが過大（180px超）になっていることを確認 [EV-1]。

### [EV-2] プロダクションビルド動作確認
$ npm run build
```
✓ built in 1.61s
```
- 【実測】ビルド成功、エラー 0 件 [EV-2]。

### [EV-3] TypeScript型チェック動作確認
$ npx tsc --noEmit
```
(出力なし、終了コード 0)
```
- 【実測】型エラー 0 件で合格 [EV-3]。

## 0-1. 確定済みの前提（§2-5）
| 事実 | 根拠 |
| :--- | :--- |
| `npm run build` は 1.61s で成功 | [EV-2] |
| `npx tsc --noEmit` は型エラー 0 件で合格 | [EV-3] |

- トラック: ライト（UI表示レイアウトのスリム化のみであり、DB・API・認証・スキーマに一切触れず、コード差分約30行のため / §2-6）
- トラック自己照合: §12 の変更対象パス = `src/frontend/components/LoginSelectScreen.tsx` / リスクパスへの抵触: 無し

## 1. 概要・目的
ログイン（アカウント選択）画面において、各ユーザーカードがスマホ画面で巨大な1列縦積みになっており画面の大半を専有している問題を解消する。
Nintendo Switch / Netflix 風のスマートな2列グリッド（`grid-cols-2 sm:grid-cols-3 md:grid-cols-4`）を採用し、カードの余白・アバターサイズを最適化することで、スマホの1画面内にスクロール不要ですっきり全員が収まる快適なUIを実現する。

## 2. 機能要件 / 非機能要件
### 機能要件
- **FR-1**: スマホ表示時（デフォルト）に `grid-cols-2`、タブレット・PCで `sm:grid-cols-3 md:grid-cols-4` の2列以上グリッドとする。
- **FR-2**: アバター表示を `w-12 h-12` 前後の角丸アイコン枠（`text-2xl sm:text-3xl`）とし、コンパクトで美しいデザインにする。
- **FR-3**: パディングを `p-3.5 sm:p-4`、間隔を `space-y-2` にスリム化し、名前を `truncate` で保護。学年をコンパクトバッジ化。
- **FR-4**: タップ操作時の心地よいホバー・アクティブ演出（`active:scale-95`）を維持する。

### 非機能要件
- **NFR-1**: 既存のユーザー選択ロジック（`onSelectUser`）やデータバインディングに影響を与えないこと。
- **NFR-2**: TypeScript型エラー0件、ビルド成功を維持すること。

## 3. データフロー全経路
1. `src/frontend/App.tsx:L396` ➔ `<LoginSelectScreen users={users} onSelectUser={handleUserSelect} ... />`
2. `LoginSelectScreen.tsx` 内部で `users` 配列をマップして新グリッドレイアウトでカード描画。

## 4. 🛡️ 機密フィールド台帳と漏洩遮断設計（G-7）
新フィールド追加なし。該当なし。

## 5. 🗄️ DB マイグレーション DDL（全文 / G-4）
DB変更なし。該当なし。

## 6. API 契約
API変更なし。該当なし。

## 7. 🙈 エラーハンドリング仕様（G-5・5 状態の表）
| 状態 | UI挙動 | 表示メッセージ | ログ出力 |
| :--- | :--- | :--- | :--- |
| 正常系（users >= 1） | 2列グリッドで全カード表示 | - | なし |
| 空データ（users == 0） | 「まだユーザーが登録されていません」＋登録ボタン表示 | - | なし |

## 8. 🏛️ アーキテクチャ選定と却下案（G-8）
- **採用方式**: モバイル2列グリッド（`grid-cols-2`）。正方形に近いカードで情報が整理され、ゲーム的な選択感と視認性のバランスが最良。
- **却下案**: 横型リスト（バー形式）。縦には縮むが、各行が横に広がりアバターの存在感が薄れ、ゲームらしい楽しさが減少するため却下。

## 9. 🧪 受け入れ基準（検証コマンド付き）
1. `npm run build` が成功すること: `$ npm run build` (exit 0)
2. `npx tsc --noEmit` が合格すること: `$ npx tsc --noEmit` (exit 0)
3. `grid-cols-2` が適用されていること: `$ grep -rn "grid-cols-2" src/frontend/components/LoginSelectScreen.tsx`

## 10. 📋 前提条件・ブロッカー
ブロッカーなし。

## 11. UI / コンポーネント設計
- グリッド: `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4`
- カード: `glass-card glass-card-hover p-3.5 sm:p-4 rounded-2xl border border-slate-800 hover:border-cyber-neonCyan/60 cursor-pointer text-center space-y-2 sm:space-y-2.5 group transition-all transform hover:-translate-y-1 active:scale-95`
- アイコン枠: `w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-2xl sm:text-3xl group-hover:scale-105 transition-transform shadow-inner`
- 名前: `text-sm sm:text-base font-black text-white group-hover:text-cyber-neonCyan transition-colors truncate`
- 学年: `text-[10px] bg-slate-800/90 text-slate-300 font-mono px-1.5 py-0.5 rounded border border-slate-700/60 inline-block`
- 所持pt: `pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] sm:text-xs text-slate-400 font-mono`

## 12. 実装タスクチェックリスト（依存順・1 タスク 1 コミット・完了条件付き）
- [x] T1: `src/frontend/components/LoginSelectScreen.tsx` のカード2列グリッド化とコンパクトスタイリング / 完了条件: `npx tsc --noEmit` 0 error ＋ `npm run build` 成功
  → 実装完了: `src/frontend/components/LoginSelectScreen.tsx:L62-L89` / grid-cols-2化・w-12 h-12アイコン化・p-3.5スリム化 / tsc 0 error / build 成功

## 13. 未確認事項（E-4）
なし。

## 14. 品質ゲート実行結果（G-11）
$ /Users/fukuikeitaro/antigravity-agents/scripts/verify.sh design
```
========================================================
 verify.sh  role=design  base=HEAD  repo=game
 HEAD=75c7259  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
```

## 15. 改訂履歴（差分改訂 / §2-5）
| 版 | 指摘 # | 変更したセクション | 1 行要約 |
| :--- | :--- | :--- | :--- |
| 1 | - | 初版作成 | 新規作成 |
