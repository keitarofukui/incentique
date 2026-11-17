# 調査報告レポート: ライバルタブ「今日の勝負」におけるメンバータップ時の本日ログ詳細表示調査

- 作成日時: 2026-10-05 16:36
- 対象リポジトリ/ブランチ: game / main
- 対象コミット: 8ee4872
- トピック: rival-pulse-user-today-logs
- 上流 Artifact: なし（新規調査起点）

## 1. 結論サマリー
- **依頼内容**: 
  - ライバルタブの「今日の勝負」のところで、人をタップするとその人の「今日のログ」が見えるようにできるか調査してほしい。
- **【実測】実現可能性（1行断定）**: 
  **完全に実現可能であり、追加のAPIリクエストやDB変更も一切不要でフロントエンドのみで即時実装できる**（`RivalPulse` コンポーネントは既に全ユーザーの `actionLogs` を props で受け取っており、本日の判定ロジック `todayLogicalDateStr` および `logLogicalDateStr` も内部に揃っているため）[EV-1] [EV-2]。
- **【実測】現状のUI構造と改修箇所**:
  1. `src/frontend/components/RivalPulse.tsx:L123-128`:
     - `actionLogs` が既に全件渡されており、各ユーザーの本日分ログ（`todayStr` と一致し、status が rejected でないもの）を抽出可能。
  2. `src/frontend/components/RivalPulse.tsx:L333-347`:
     - 現在は `rows.map((row, idx) => (<div key={row.user.id} className="...">` と静的なカードが表示されている。
     - ここに `selectedUserId`（またはクリックトグル状態 `expandedUserId`）のローカルステートを追加し、タップ可能（カーソルポインター＋タップ効果）にする。
  3. **表示形式のUI設計案**:
     - **案A（インラインアコーディオン展開）**: タップするとその人のカードの下が滑らかに展開し、今日の獲得アクション一覧（時間・カテゴリバッジ・タイトル・獲得pt・素点/ボーナス内訳）がスッキリ表示される。再度タップで閉じる。
     - **案B（モーダルポップアップ表示）**: タップすると「○○の今日の活動履歴」というポップアップダイアログが開き、一覧を表示する。
     - **推奨**: **案A（アコーディオン展開）**。ライバル画面の文脈を失わず、他の人とその場で見比べやすいため。
- **推奨トラック**: ライト（理由: 既存の `actionLogs` を用いたフロントエンドUI拡張のみ、DB・API・認証への影響なし / §2-6）

---

## 1-1. 確定済みの前提（下流は再実測しない / §2-5）
| 事実 | 根拠 | 重い実測か |
| :--- | :--- | :--- |
| リポジトリ HEAD は `8ee4872`、ブランチは `main` | [EV-3] | いいえ |
| `RivalPulse` に渡される `actionLogs` には全ユーザーの行動ログ（category, title_or_menu, earned_points, created_at, status等）が含まれている | [EV-1] | いいえ |
| 日付判定は朝4時境界（`todayLogicalDateStr` / `logLogicalDateStr`）で統一されている | [EV-2] | いいえ |

---

## 2. 実測エビデンス

### [EV-1] RivalPulseProps と親からのデータ受け渡し実測
$ sed -n '6,11p' src/frontend/components/RivalPulse.tsx
```tsx
interface RivalPulseProps {
  users: User[];
  currentUser: User;
  actionLogs: ActionLog[];
  onNavigate: (tab: string) => void;
}
```
- 【実測】`actionLogs` は親コンポーネント（`App.tsx`）から配列全件が渡されており、特定ユーザーのログ取得のためにサーバーへ新規APIを叩く必要がないことを確認。

### [EV-2] 今日のログ判定ロジックの実測
$ sed -n '171,195p' src/frontend/components/RivalPulse.tsx
```tsx
    actionLogs.forEach((log) => {
      if (log.status === 'rejected') return;
      const entry = acc.get(log.user_id);
      if (!entry) return;

      const day = logLogicalDateStr(log.created_at);
      if (!day) return;
      entry.days.add(day);
...
      if (day === todayStr) {
        const earned = Number(log.earned_points) || 0;
        entry.todayPoints += earned;
```
- 【実測】`todayStr = todayLogicalDateStr()` と `logLogicalDateStr(log.created_at)` を比較することで、既存の集計と1ミリのズレもなく完全に同じ基準で「その人の今日のログ」を抽出・表示できる。

### [EV-3] Git ステータスとコミット
$ git status; git rev-parse --short HEAD
```
On branch main
8ee4872
```

---

## 3. 否定された仮説（E-5）
1. **仮説**: 他人の詳細な行動ログを取得するには専用のバックエンドAPI（`/api/users/:id/today-logs` 等）を新設する必要があるのではないか？
   - **棄却根拠**: `App.tsx` で全ユーザー共通の `actionLogs` が既に取得されており、ライバルボードやランキングでも同じ `actionLogs` をクライアント側でフィルタリングして表示しているため、API追加は不要でフロントエンドのみで極めて高速に動作可能。
2. **仮説**: モーダル表示が最も見やすいのではないか？
   - **棄却根拠**: スマホ画面でモーダルを開くと背後のライバル順位やポイント差が隠れてしまい、「誰が何をしてどれくらい追いついてきたか」を比較しづらい。カード直下にアコーディオンとしてインライン展開する方が、ゲームUIとしてのテンポが良く自然である。

---

## 4. UI設計・実装イメージ（提案）
- **カードの操作性**:
  - 各行に `cursor-pointer hover:bg-slate-900/80 active:scale-[0.99] transition-all` を付与し、右側に小さな下矢印（`ChevronDown`）を配置。タップ可能であることを明示。
- **展開されるログ内容**:
  - 今日のログが 0 件の場合: 「今日はまだ記録がありません」
  - ログがある場合（新着順）:
    - 時間（例: `14:20`）
    - アイコン・カテゴリ名（例: 🧠 クイズ、📚 読書、🏋️ 筋トレ、🍚 ごはん など）
    - タイトル（例: 「中学英語 基礎編 第3問 正解」「走れメロス」）
    - 獲得ポイント（例: `+120 pt`）
    - ボーナス等の内訳（ガチャ2倍、ストリークボーナスなど）
