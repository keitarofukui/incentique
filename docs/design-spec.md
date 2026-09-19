# 機能設計仕様書: ホームの未獲得クイズ即阻止ボタン画面遷移修正

- 作成日時: 2026-09-19 14:45
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 2dd28fc
- 上流 Artifact: docs/investigation-report.md（対象コミット: 2dd28fc）
- トラック: ライト（理由: スキーマ・機密フィールド・外部API・認証の変更がなく、フロントエンド1行のナビゲーション引数修正であるため / §2-6）
- トラック自己照合: §12 の変更対象パス = `src/frontend/components/PersonalStreakCard.tsx` / リスクパス・他レーン共有パスへの抵触: 無し


## 0. 上流の抜き取り再実測（§2-3・軽量コマンド 3 件）

### [EV-1] 上流 [EV-1] の再実行（Gitコミットとブランチ情報）
$ git rev-parse --short HEAD && git branch --show-current && git status --short
2dd28fc
main
 M docs/investigation-report.md
- 【実測】上流と一致（コミット `2dd28fc`、ブランチ `main`） [EV-1]

### [EV-2] 上流 [EV-2] の再実行（PersonalStreakCard.tsx の即阻止ボタン生コード）
$ sed -n '225,236p' src/frontend/components/PersonalStreakCard.tsx
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('quizzes')}
            className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all flex items-center gap-1.5"
          >
            <span>🧠 クイズで即阻止！</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
- 【実測】上流と一致（229行目に `onClick={() => onNavigate('quizzes')}` が存在） [EV-2]

### [EV-3] 上流 [EV-6] の再実行（'quizzes' の使用箇所検索）
$ grep -rn "'quizzes'" src/
src/frontend/components/PersonalStreakCard.tsx:229:            onClick={() => onNavigate('quizzes')}
- 【実測】上流と一致（ヒット 1 件のみ） [EV-3]

## 0-1. 確定済みの前提（上流から引き継ぎ・再実測しない / §2-5）
| 事実 | 根拠（上流の EV） |
| :--- | :--- |
| プロジェクト内のクイズ画面タブ名は一貫して `'quiz'` であり `'quizzes'` は存在しない | 上流 EV-4, EV-6, EV-7 |
| 本番APIは未活動日数1日のユーザーに対して正常に `penaltyWarning` を返却している | 上流 EV-5 |
| 現行コードベースは TypeScript 型チェックおよび vite build が通過している | 上流 EV-8 |


- トラック: ライト（理由: スキーマ・機密フィールド・外部API・認証の変更がなく、フロントエンド1行のナビゲーション引数修正であるため / §2-6）
- トラック自己照合: §12 の変更対象パス = `src/frontend/components/PersonalStreakCard.tsx` / リスクパス・他レーン共有パスへの抵触: 無し

## 1. 概要・目的
ホーム画面の「1日間ポイント未獲得」ペナルティ警告バナーに表示される「クイズで即阻止！」ボタンを押下した際、クイズ画面（`QuizQuest` コンポーネント）へ正しく遷移するようにナビゲーション引数を修正する。

## 2. 機能要件 / 非機能要件
- **機能要件**:
  - ユーザーが「🧠 クイズで即阻止！」ボタンをクリックした際、`activeTab` が `'quiz'` に更新され、クイズ画面が正しく表示されること。
- **非機能要件**:
  - 既存のUIスタイリング、アニメーション、および他のタブ遷移（`PersonalStreakCard.tsx:L458`、`RivalPulse.tsx:L414` 等）の動作に影響を与えないこと。

## 3. データフロー全経路
- **既存経路**:
  1. `src/frontend/components/PersonalStreakCard.tsx:L229`: ユーザーがボタンをクリック
  2. `onClick={() => onNavigate('quizzes')}` により `handleSetActiveTab('quizzes')` が呼び出される (`src/frontend/App.tsx:L62`)
  3. `setActiveTab('quizzes')` により `activeTab` が `'quizzes'` にセットされる (`src/frontend/App.tsx:L70`)
  4. `src/frontend/App.tsx:L473` の描画条件 `{activeTab === 'quiz' && <QuizQuest ... />}` に一致せず、どのタブも描画されない
- **変更後経路**:
  1. `src/frontend/components/PersonalStreakCard.tsx:L229`: ユーザーがボタンをクリック
  2. `onClick={() => onNavigate('quiz')}` により `handleSetActiveTab('quiz')` が呼び出される (`src/frontend/App.tsx:L62`)
  3. `setActiveTab('quiz')` により `activeTab` が `'quiz'` にセットされる (`src/frontend/App.tsx:L70`)
  4. `src/frontend/App.tsx:L473` の描画条件 `{activeTab === 'quiz' && <QuizQuest ... />}` に完全一致し、`QuizQuest` が正常に表示される

## 4. 🛡️ 機密フィールド台帳と漏洩遮断設計（G-7）
| フィールド | 機密度 | 既存の露出経路（実測） | 遮断策（具体実装） |
| :--- | :--- | :--- | :--- |
| なし | なし | 該当なし（UIナビゲーション引数のみの変更） | 該当なし |

## 5. 🗄️ DB マイグレーション DDL（全文 / G-4）
- 本変更においてデータベーススキーマやマイグレーションの変更は一切発生しない。

## 6. API 契約（パス完全一致・リクエスト/成功/エラー JSON・ステータス）
- 本変更において新規APIの追加や既存API仕様の変更は一切発生しない。

## 7. 🙈 エラーハンドリング仕様（G-5・5 状態の表）
| 状態 | UI挙動 | 表示メッセージ | ログ出力 |
| :--- | :--- | :--- | :--- |
| 正常クリック | クイズ画面（QuizQuest）へ即座にタブ遷移 | なし | なし |
| 4xx / 5xx | 該当なし（クライアント内同期ステート変更） | 該当なし | 該当なし |
| ネットワーク断 | 該当なし（クライアント内同期ステート変更） | 該当なし | 該当なし |
| タイムアウト | 該当なし（クライアント内同期ステート変更） | 該当なし | 該当なし |

## 8. 🏛️ アーキテクチャ選定と却下案（G-8）
- **採用方式**:
  - `src/frontend/components/PersonalStreakCard.tsx:L229` の引数を既存の正式タブ名 `'quiz'` に直接修正する。
- **却下案とその理由**:
  - **却下案1: `App.tsx` 側で `'quizzes'` を受け取った場合に `'quiz'` として扱う別名マッピングを追加する案**:
    - 却下理由: タブ命名規則は `'quiz'` で統一されており、他コンポーネント（`PersonalStreakCard.tsx:L458`, `RivalPulse.tsx:L414`）もすべて `'quiz'` を使用している。不要な別名（エイリアス）を導入するとコードが複雑化し将来の技術的負債となるため却下。呼び出し元の誤りを直接修正するのが最もクリーンで持続可能である。

## 9. 🧪 受け入れ基準（検証コマンド付き）
1. `grep -rn "'quizzes'" src/` の結果が 0 件であること [EV-3]
2. `npx tsc --noEmit` が exit 0 であること
3. `npm run build` が exit 0 でビルド成果物を生成すること
4. ブラウザ上で「🧠 クイズで即阻止！」ボタンをクリックした際、クイズ画面（QuizQuest）が正常に描画されること

## 10. 📋 前提条件・ブロッカー
- なし（依存関係・認証・外部API・スキーマ変更等のブロッカーは存在しない）。

## 11. UI / コンポーネント設計
- 修正対象: `src/frontend/components/PersonalStreakCard.tsx`
  - 変更前: `onClick={() => onNavigate('quizzes')}`
  - 変更後: `onClick={() => onNavigate('quiz')}`
- スタイリング・マークアップ・アイコン（`🧠`, `ArrowRight`）に変更はなし。

## 12. 実装タスクチェックリスト（依存順・1 タスク 1 コミット・完了条件付き）
- [x] T1: `src/frontend/components/PersonalStreakCard.tsx:L229` の `onNavigate('quizzes')` を `onNavigate('quiz')` に修正する / 完了条件: `grep -rn "'quizzes'" src/` が 0 件 ＋ `npx tsc --noEmit` が exit 0 ＋ `npm run build` が exit 0
  - → 実装: `src/frontend/components/PersonalStreakCard.tsx:L226-L235` / `grep -rn "'quizzes'" src/` 0件 / `tsc` 0 error / `vite build` 成功 / `verify.sh dev` PASS

## 13. 未確認事項（E-4）
| 未確認項目 | 確認手段 | ブロッカー理由 |
| :--- | :--- | :--- |
| なし | 設計に必要なすべての仕様・コード・データフローを確認済み | ブロッカーなし |

## 14. 品質ゲート実行結果（G-11）
```
$ /Users/fukuikeitaro/antigravity-agents/scripts/verify.sh design
========================================================
 verify.sh  role=design  base=HEAD  repo=game
 HEAD=2dd28fc  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
```


## 15. 改訂履歴（差分改訂 / §2-5）
| 版 | 指摘 # | 変更したセクション | 1 行要約 |
| :--- | :--- | :--- | :--- |
| 初版 | — | 全文 | 新規作成 |
