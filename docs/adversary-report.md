# 反証レポート: docs/design-spec.md（UI横幅有効活用・不要な括弧（）及び冗長説明の削減）

- 作成日時: 2026-09-30 19:30
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 2c17559
- 上流 Artifact: docs/design-spec.md（対象コミット: 2c17559）
- **判定: REFUTED**

## 0. 確定済みの前提
- 【実測】HEAD は 2c17559 で上流の対象コミットと一致。鮮度差分なし（`git diff` の stat 取得不要）[EV-R1]
- 本番 URL の稼働（上流 EV-1）は重い実測のため再実行しない（§2-3-2）。

## 1. 抜き取り再実測（3 件以上）

### [EV-R1] 上流 [EV-2] の再実行
$ git rev-parse --short HEAD
2c17559
- 【実測】上流と一致 [EV-R1]。

### [EV-R2] 上流 [EV-5] の再実行
$ sed -n '312,320p' src/frontend/components/PersonalStreakCard.tsx
            <span className="text-xs font-black text-indigo-300 flex items-center gap-1">
              <span>🔥 デイリー</span>
              <span className="text-xs font-normal text-slate-400">(1pt+)</span>
…(6 行省略・上流貼付と同一)
- 【実測】上流と一致 [EV-R2]。

### [EV-R3] 上流 [EV-3] の再実行（上流貼付との diff）
$ sed -n '734,765p' src/frontend/components/DailyChart.tsx | diff - <(sed -n '46,79p' docs/design-spec.md)
0a1,2
>                   <div
>                     key={log.id}
- 【実測】**不一致（書式）** [EV-R3]。上流の貼付は `sed -n '734,765p'` の出力ではなく L732-L765 の 34 行。コード内容自体は一致するため §2-3-1 により書式不備（その場修正要求）扱い。

### [EV-R4] 上流 [EV-4] 先頭 18 行の再実行（上流貼付との diff）
$ sed -n '150,187p' src/frontend/components/Dashboard.tsx | head -18 | diff - <(sed -n '83,100p' docs/design-spec.md) && echo SAME4head
SAME4head
- 【実測】一致 [EV-R4]。

## 2. レンズ A: 再現性

- 反証仮説 A-1: 「確定済みの前提」の `React + Vite + Tailwind [EV-3]` は EV-3 から導けない。

### [EV-R5]
$ grep -n '"react"\|"vite"\|"tailwindcss"' package.json
7:    "dev": "vite",
17:    "react": "^18.3.1",
30:    "tailwindcss": "^3.4.17",
33:    "vite": "^6.0.5",
- 【実測】EV-3 は DailyChart.tsx の JSX 抜粋で、スタックの根拠になっていない（参照先が誤り）。事実としては正しい [EV-R5]。結果: **反証成立（書式のみ・その場修正要求）**。あわせてクイズバッジの行番号は L156 ではなく L157 [EV-R6]。

- 反証仮説 A-2: 「問題文が幅160px前後」「実機スクリーンショットで確定・未確認事項なし」は実測ラベル付きなのに実測の根拠がない。

### [EV-R6]
$ grep -n "スクリーンショット\|操作:\|観測:\|Console:\|G-13" docs/design-spec.md
130:- 未確認事項: なし（実機スクリーンショットおよびコード行の実測により、問題箇所・影響範囲はすべて確定済み）
$ grep -n "主な活動成果\|クイズ累積正解\|{log.category}\|glass-card p-6" src/frontend/components/Dashboard.tsx
148:      <div className="glass-card p-6 rounded-2xl space-y-4">
153:              <span>主な活動成果（読書・運動・インプット）</span>
157:                🧠 クイズ累積正解: {quizSuccessCount}問 (+{quizSuccessCount}pt)
182:                    <span className="text-slate-400 text-xs">{log.category}</span>
…(1 行省略)
- 【実測】[EV-R6] スクリーンショットやブラウザでの計測結果は Artifact 内のどこにも無い。「幅160px」「3行折り返し」はクラス名から計算した**推定**なのに実測ラベルで書かれている（E-1 違反）。「未確認事項: なし」も根拠のない断定（E-4 違反）。結果: **反証成立**（主張の中身に関わる不備）。

## 3. レンズ B: 網羅性

- 反証仮説 B-1: 目的 1-1-3 では「アプリ全体の…重複する（70%還元）等」をスリム化対象としているが、§4 の対象一覧に漏れがある。

### [EV-R7]
$ grep -rn "70%還元" src/frontend/components/ | head
src/frontend/components/Dashboard.tsx:122:                交換所で <strong ...>「💵 現金還元 (7掛け/70%還元)」</strong> を選んで申請できます！…
src/frontend/components/WishlistSection.tsx:239:            💵 現金還元は「7掛け (70%還元)」でお小遣い化！
src/frontend/components/WishlistSection.tsx:308:                        <span>70%還元: {cashAmount.toLocaleString()}円</span>
src/frontend/components/WishlistSection.tsx:505:                    <span>7掛け（70%還元）現金交換ルール</span>
src/frontend/components/ParentPortal.tsx:557:                          <span>手渡す現金（70%還元）:</span>
- 【実測】ヒットは 5 件（3 ファイル）。§4 で扱うのは WishlistSection の `現金還元 (7掛け)` だけ。Dashboard.tsx:L122 / WishlistSection.tsx:L239,L505 / ParentPortal.tsx:L557 は記載も「対象外にする理由」も無い。さらに `現金還元 (7掛け)` 自体が L326 と L496 の 2 箇所にあり、どちらを直すのか決まっていない [EV-R8]。結果: **反証成立**。

- 反証仮説 B-2: 4-4「重複する『※保護者が現金・物品を手渡した時に…』注意書き」は実際には重複していない／場所が決まらない。

### [EV-R8]
$ grep -n "7掛け\|達成度\|保護者が現金" src/frontend/components/WishlistSection.tsx
136:        lines.push(`受取現金金額: ¥${cashAmount.toLocaleString()}（7掛け還元）`);
239:            💵 現金還元は「7掛け (70%還元)」でお小遣い化！
326:                          <Banknote className="w-3 h-3" /> 現金還元 (7掛け)
381:                        <span>達成度</span>
431:                        <p className="text-xs text-slate-400 text-center">※保護者が現金・物品を手渡した時にポイントを引き落とします</p>
496:                    <span>💵 現金還元 (7掛け)</span>
…(3 行省略)
- 【実測】[EV-R8] この文言が出てくるのは L431 の 1 箇所だけで、「重複」とは言えない。同じ意味の文言は L141（`'※ポイントが引かれるのは、保護者が実際に手渡したあとです。'`）と L256/L264（ルール欄）にあるが、設計書はどれを残してどれを消すかを書いていない。製造ロールが推測で決めることになる（G-2 のブロッカーになる）。さらに 4-4 の `達成度 {progress}% (...)` は実コードでは L381 の `<span>達成度</span>` と L382 の `<span>{progress}% (...)</span>` に分かれており、引用が実コードと一致しない（E-2）。結果: **反証成立**。

## 4. レンズ C: 二次被害（攻撃順: G-7 → G-5 → 変異）

- 反証仮説 C-1（G-7 / トラック）: ライトトラックの宣言は偽りで、機密・スキーマ・API・認証に触れる。

### [EV-R9]
$ git diff --name-only 2c17559
docs/adversary-report.md
docs/design-spec.md
- 【実測】製品コードの差分はまだ無い。§4 の変更対象 6 行すべて（Dashboard.tsx L148/153/157/182、PersonalStreakCard.tsx L350/394/442/452 など）は JSX の表示文言とクラス名で、`fetch`・DB・認証の経路は無い [EV-R6][EV-R10]。`GATE_TRACK_RISKY_PATHS` に当たるパスも無い。結果: **反証失敗**（G-7 非該当・ライト宣言は妥当）。

- 反証仮説 C-2（変異・情報欠落）: 「見れば自明な注釈」として削る `({midThreshold}pt+)` は、実際には自明ではない動的な値で、削るとカード上から基準値が消える。

### [EV-R10]
$ grep -n "midThreshold\|godThreshold" src/frontend/components/PersonalStreakCard.tsx | head -20
49:  const midThreshold = Number.isFinite(rulePoints.streak_mid_threshold) ? rulePoints.streak_mid_threshold : 100;
350:              <span className="text-xs font-normal text-slate-400">({midThreshold}pt+)</span>
360:              {todayBase >= midThreshold ? (
367:                  素点あと <span ...>{(midThreshold - todayBase).toLocaleString()}pt</span>
394:              <span className="text-xs font-normal text-slate-400">({godThreshold}pt+)</span>
…(15 行省略)
$ grep -rn "streak_mid_threshold" src/frontend | grep -v PersonalStreakCard
src/frontend/components/ParentPortal.tsx:1027:                      value={editingPoints['streak_mid_threshold'] ?? 100}
src/frontend/components/StreakBonusInfo.tsx:31:  const midThreshold = ...
…(3 行省略)
- 【実測】[EV-R10] 基準値は保護者が ParentPortal で変えられる値（L1027）。カード上でこの値を出しているのは L350/L394 だけ。達成済みの日は L360 の分岐で「素点あと N pt」が出ないので、削ると基準値がカードから完全に消える。L442 も「+{節目×倍率}pt」という報酬額を含んでいるが、設計はこれを「次の節目まであとN日」だけに縮める。報酬額が消えることに触れていない。別画面の StreakBonusInfo（App.tsx L429/L524）で見られるという代わりの手段も設計書に書かれていない。結果: **反証成立**。

- 付記（G-13）: 変更対象はすべて `*.tsx` の UI 差分なのに、§6 検証計画は `tsc` と `build` だけ。ブラウザでの実行時検証（`操作:`/`観測:`/`Console:`）が計画に無い [EV-R6]。G-13 違反につながる設計の欠落として差し戻しに含める（打ち切り後の記録であり、仮説数には数えない）。

## 5. 否定された仮説（反証に失敗したもの・必須）
| 反証仮説 | 検証コマンド | 結果 |
| :--- | :--- | :--- |
| C-1 ライト宣言は偽り（機密・API・スキーマに触れる） | `git diff --name-only` / 対象行 grep [EV-R9][EV-R10] | 反証失敗（表示のみ・ライト妥当） |
| （補助）Dashboard L182 の `log.category` は英単語ではない | `grep -n category src/frontend/types.ts` → L97 `'quiz' \| 'input_book' \| ...` | 反証失敗（生英単語が出るという上流の主張は正しい） |
| （補助）上流 EV-4/EV-5 の貼付は捏造 | [EV-R2][EV-R4] | 反証失敗（一致） |

## 6. 差し戻し要求（REFUTED）
| # | 対象ロール | 要求内容 | 根拠 |
| :-- | :--- | :--- | :--- |
| 1 | 設計 | 「幅160px」「3行折り返し」を推定ラベルに直すか、ブラウザで計測した証跡を付ける。「未確認事項: なし」を撤回する | A-2 [EV-R6] |
| 2 | 設計 | 「アプリ全体」をうたうなら 70%還元・7掛け表記の全 5 箇所について、直すか対象外にするかを決める。`現金還元 (7掛け)` の L326/L496 を特定する | B-1 [EV-R7][EV-R8] |
| 3 | 設計 | 注意書きの集約について、残す行と消す行を行番号で指定する。「達成度」の引用を実コード（L381-L382）に合わせる | B-2 [EV-R8] |
| 4 | 設計 | 閾値 `({mid/godThreshold}pt+)` と L442 の報酬 pt を消すことでカード上から情報が消える影響を評価し、残すか代わりの表示を明記する | C-2 [EV-R10] |
| 5 | 設計 | §6 検証計画に G-13 の実行時検証（375px 幅でのブラウザ操作証跡）を追加する | 付記 G-13 |
| 6 | 設計（その場修正） | EV-3 の範囲表記（L732-765）とスタック根拠の参照先、L156→L157 を直す | A-1 [EV-R3][EV-R5] |

## 7. 未確認事項・未攻撃領域（E-4 / 打ち切りで残したもの）
| 未確認項目 / 未攻撃の反証仮説 | 確認手段 | ブロッカー理由 / 打ち切り理由 |
| :--- | :--- | :--- |
| 実画面で実際に幅が浪費されている量（px） | 375px 幅のブラウザで DOM を計測 | 反証ロールは読み取り専用・ブラウザ検証は範囲外 |
| DailyChart 4-1 で `line-clamp-4`/制限解除のどちらにするかが決まっていない | 設計への確認 | 打ち切り（6 件上限） |
| Dashboard `p-6 → p-3.5 sm:p-5` が他のカードとの余白の統一を崩すか | `grep -rn "glass-card p-" src/frontend` | 打ち切り |
| GoalPlannerWidget L150 の `truncate` が残ったままで、目的の「文字切れ解消」と矛盾しないか | 実画面の確認 | 打ち切り |
| 本番 URL の稼働（上流 EV-1） | `curl` | 重い実測のため再実行しない（§2-3-2） |

## 8. ゲート実行結果
（注: プロジェクト内の `scripts/` には verify.sh が無い。正典の実体 `~/antigravity-agents/scripts/verify.sh` をプロジェクト直下から実行した）

$ ~/antigravity-agents/scripts/verify.sh adversary; echo "exit=$?"
========================================================
 verify.sh  role=adversary  base=HEAD  repo=game
 HEAD=2c17559  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
exit=0
