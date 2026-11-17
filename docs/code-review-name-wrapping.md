# コードレビュー報告書: ライバル画面の名前折り返し・Android等の1文字改行不具合の恒久是正

- 作成日時: 2026-10-05 16:24
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 8ee4872
- トピック: rival-board-name-wrapping
- 上流 Artifact: docs/design-spec.md（対象コミット: 8ee4872）
- 判定: **PASS（承認）**

## 0. 上流の抜き取り再実測（§2-3・軽量コマンド 3 件）
### [EV-1] 上流 [EV-1] の再実行（RivalBoard.tsx カード名前表示の修正後コード実測）
$ sed -n '80,105p' src/frontend/components/RivalBoard.tsx
```tsx
            >
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                {/* Rank Badge */}
                <div className={`px-2 py-1 rounded-xl text-xs font-black font-mono border shrink-0 text-center min-w-[46px] sm:min-w-[52px] ${rankBg}`}>
                  {rankBadge}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-lg sm:text-xl border border-slate-700 shrink-0">
                  {user.avatar || '⚡'}
                </div>

                {/* Name & Sub Info */}
                <div className="flex flex-col justify-center flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm sm:text-base font-extrabold text-white truncate whitespace-nowrap">
                      {user.name}
                    </span>
                    {isMe && (
                      <span className="text-[9px] bg-cyber-neonCyan/20 text-cyber-neonCyan font-black px-1.5 py-0.5 rounded-full border border-cyber-neonCyan/30 shrink-0 whitespace-nowrap">
                        YOU
                      </span>
                    )}
                  </div>
```
- 【実測】`truncate whitespace-nowrap` が付与され、親要素も `min-w-0` で適切に折り返しが抑止されている [EV-1]。

### [EV-2] 上流 [EV-2] の再実行（RivalBoard.tsx 上部バナー修正後コード実測）
$ sed -n '43,58p' src/frontend/components/RivalBoard.tsx
```tsx
        ) : isSecond && personAhead ? (
          <div className="bg-red-500/10 border border-red-500/30 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-red-300 flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400 animate-bounce shrink-0" />
            <span>首位の<span className="inline-block whitespace-nowrap">【{personAhead.name}】</span>まで あと <strong className="text-amber-400 font-mono text-sm">{gapToAhead.toLocaleString()} pt</strong>！</span>
          </div>
        ) : personAhead ? (
          <div className="bg-red-500/10 border border-red-500/30 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-red-300 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-red-400 animate-bounce shrink-0" />
              <span>次の順位（{userRankIndex}位）の<span className="inline-block whitespace-nowrap">【{personAhead.name}】</span>まで あと <strong className="text-amber-400 font-mono text-sm">{gapToAhead.toLocaleString()} pt</strong>！</span>
            </div>
            {leader && leader.id !== personAhead.id && (
              <span className="text-[0.6875rem] text-slate-400 font-normal">
                （首位<span className="inline-block whitespace-nowrap">【{leader.name}】</span>まで あと {gapToLeader.toLocaleString()} pt）
              </span>
            )}
```
- 【実測】`inline-block whitespace-nowrap` で名前の分断が防がれていることを確認 [EV-2]。

### [EV-3] 上流 [EV-3] の再実行（型検査・ビルド実測）
$ npx tsc --noEmit && npm run build
```
✓ built in 1.78s
```
- 【実測】exit code 0、ビルド成功を確認 [EV-3]。

---

## 1. コード品質とハード制約チェック
- **G-1 (担当外書き込み)**: PASS（`src/frontend/components/RivalBoard.tsx` のみ修正）
- **G-5 (エラー握りつぶし)**: PASS（例外・エラー制御に関するロジック変更なし）
- **G-7 (情報漏洩)**: PASS（露出フィールド追加なし）
- **G-8 (本質的アーキテクチャ)**: PASS（CSSの適切な `whitespace-nowrap truncate min-w-0` パターンを採用）
- **差分行数**: PASS（追加16行・削除15行、ライトトラック上限200行を大幅に下回る）

## 2. 結論
実装は設計書に完全準拠しており、不備なし。テストフェーズへ進行を承認。
