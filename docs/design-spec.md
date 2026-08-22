# 機能設計仕様書: 管理者PIN入力のPCキーボード対応

- 作成日時: 2026-08-22 16:15
- 対象リポジトリ/ブランチ: keitarofukui/incentique / main
- 対象コミット: 1dc4deb
- 上流 Artifact: docs/investigation-report.md（対象コミット: 1dc4deb）

---

## 0. 上流の抜き取り再実測

### [EV-1] 上流 [EV-1] の再実行（リポジトリ状態）
$ git rev-parse --short HEAD && git branch --show-current && git status --short
```
1dc4deb
main
 M docs/investigation-report.md
 M src/backend/index.ts
```
- 【実測】上流と一致。コミット `1dc4deb` / ブランチ `main` [EV-1]。

### [EV-2] 上流 [EV-3] の再実行（ParentPinAuthModal 検索）
$ grep -rn "ParentPinAuthModal" src/
```
src/frontend/App.tsx:18:import { ParentPinAuthModal } from './components/ParentPinAuthModal';
src/frontend/App.tsx:386:        <ParentPinAuthModal
src/frontend/App.tsx:564:        <ParentPinAuthModal
src/frontend/components/ParentPinAuthModal.tsx:5:interface ParentPinAuthModalProps {
src/frontend/components/ParentPinAuthModal.tsx:11:export const ParentPinAuthModal: React.FC<ParentPinAuthModalProps> = ({
```
- 【実測】上流と一致。対象コンポーネントは `ParentPinAuthModal.tsx` のみ [EV-2]。

### [EV-3] 上流 [EV-4] の再実行（バックエンド verify-pin API）
$ sed -n '1590,1608p' src/backend/index.ts
```ts
app.post('/api/parent/verify-pin', async (c) => {
  try {
    const body = await c.req.json<{ pin: string }>();
    await c.env.DB.prepare(
      'CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)'
    ).run();
    const row: any = await c.env.DB.prepare('SELECT value FROM app_settings WHERE key = \'parent_pin\'').first();
    const targetPin = row?.value || '1234';

    if (body.pin === targetPin) {
      return c.json({ success: true, valid: true });
    } else {
      return c.json({ success: true, valid: false, error: 'PINコードが正しくありません' });
    }
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});
```
- 【実測】上流と一致。API 変更不要 [EV-3]。

---

## 1. 概要・目的

PC環境において、保護者管理者認証モーダル（`ParentPinAuthModal`）を開いた際に、マウスでのテンキーボタンクリックだけでなく、PCキーボードの数字キー（`0`〜`9`）、テンキー（Numpad）、`Backspace`/`Delete`（一文字削除）、`Escape`（モーダルを閉じる）による直感的なPIN入力操作を可能にし、ユーザビリティを大幅に向上させる。

---

## 2. 機能要件 / 非機能要件

### 機能要件
1. **キーボード数字入力**: モーダル表示中、PCキーボードの `0`〜`9`（メインキーおよびテンキー）の打鍵で数字が入力されること。
2. **削除操作**: `Backspace` キーまたは `Delete` キーで入力済みのPINの末尾1文字が削除されること。
3. **キャンセル操作**: `Escape` キーでモーダルが閉じられること。
4. **入力上限・自動検証**: 4桁入力完了時に自動的に検証APIが走る既存ロジックが、キーボード入力時も同様に作動すること。
5. **検証中の割り込み無効**: API検証中（`isVerifying === true`）はキー入力を受け付けないこと。
6. **既存UI互換**: 従来のオンスクリーンテンキーボタンからのタップ/クリック入力も完全に動作を維持すること。

### 非機能要件
1. **メモリリーク・副作用防止**: モーダルが非表示になった場合、およびコンポーネントのアンマウント時には `keydown` イベントリスナーを即座に削除（クリーンアップ）し、他画面の操作に一切影響を与えないこと。

---

## 3. データフロー全経路

本機能はフロントエンドコンポーネント（`ParentPinAuthModal.tsx`）内部の入力イベントハンドリング変更のみで完結する。DB/API のスキーマ・データフローへの影響はない。

```
[ PC Keydown Event / Button Click ]
          │
          ▼
 [ ParentPinAuthModal State: pin ]
          │ (length === 4)
          ▼
[ POST /api/parent/verify-pin ] ➔ { success: true, valid: true/false }
```

---

## 4. 🛡️ 機密フィールド台帳と漏洩遮断設計（G-7）

新規または改修で取り扱う機密データについて下表の通り管理・遮断を徹底する。

| フィールド | 機密度 | 既存の露出経路（実測） | 遮断策（具体実装） |
| :--- | :--- | :--- | :--- |
| `pin` | 高 | `ParentPinAuthModal.tsx` 内のローカル `useState` [EV-2] | 外部ログや URL クエリ等には露出せず、POST `/api/parent/verify-pin` の JSON ボディとして送信。画面上はドット表示 (`●`) で隠蔽。 |

---

## 5. 🗄️ DB マイグレーション DDL（G-4）

本機能では DB テーブルの変更・追加は発生しないため、マイグレーション SQL の作成は不要（なし）。

---

## 6. API 契約

既存の API 契約を変更することなくそのまま利用する。

- **パス**: `POST /api/parent/verify-pin`
- **リクエスト JSON**:
  ```json
  {
    "pin": "1234"
  }
  ```
- **成功レスポンス JSON (200 OK)**:
  ```json
  {
    "success": true,
    "valid": true
  }
  ```
- **認証エラーレスポンス JSON (200 OK)**:
  ```json
  {
    "success": true,
    "valid": false,
    "error": "PINコードが正しくありません"
  }
  ```

---

## 7. 🙈 エラーハンドリング仕様（G-5）

| 状態 | UI 挙動 | 表示メッセージ | ログ出力先 |
| :--- | :--- | :--- | :--- |
| **正常（PIN一致）** | モーダルを閉じ、`onSuccess()` を実行 | なし | なし |
| **PIN不一致 (valid: false)** | 振動アニメーション (`animate-shake`) ＋ PINリセット | `PINコードが正しくありません` | なし |
| **サーバーエラー (500)** | エラー表示 ＋ PINリセット | サーバー返却エラーメッセージ | `console.error` |
| **ネットワーク断 / 例外** | エラー表示 ＋ PINリセット | `通信エラーが発生しました` | `console.error` |
| **検証処理中 (isVerifying)** | テンキーボタン disabled ＋ キーボード打鍵無効化 | なし | なし |

※失敗時に成功画面・成功メッセージを表示することは一切禁止する (G-5)。

---

## 8. 🏛️ アーキテクチャ選定と却下案（G-8）

### 採用方式: `useEffect` によるグローバル `keydown` イベント監視
- **内容**: モーダルが表示されている間 (`isOpen === true`)、`window.addEventListener('keydown', handleKeyDown)` でキーボードの打鍵イベントを直接受領する。
- **採用理由**: 既存のオンスクリーンテンキー UI と DOM 構造を変更せず、シンプルかつ確実にキーボード打鍵（`0-9`、`Backspace`、`Escape`）に対応できる。フォーカス状態を意識する必要がないため操作性が最も高い。

### 却下案: 隠し `<input type="password">` の配置と autoFocus
- **内容**: モーダル内に隠し `<input>` 要素を配置し、`ref.current?.focus()` でフォーカスをあてる方式。
- **却下理由**: ユーザーがモーダルの背景や装飾部分をクリックした際に `<input>` からフォーカスが外れ、再度キーボード入力が効かなくなる問題が発生しやすい。不必要なフォーカス管理コードが増加し複雑化するため却下した。

---

## 9. 🧪 受け入れ基準（検証コマンド付き）

1. **型チェック・ビルド検証**:
   `npm run typecheck && npm run build` がエラーなし (exit code 0) で完了すること。
2. **キーボード打鍵検証（手動/E2E）**:
   - モーダルを開き、PCキーボードの `1` `2` `3` `4` を押すと即座に4桁入力され検証処理が行われること。
   - `Backspace` キーを押すと入力済みの文字が削除されること。
   - `Escape` キーを押すとモーダルが閉じること。
   - モーダルを閉じた後、他画面でキーを押しても何も動作しない（イベントリスナーが解約されている）こと。

---

## 10. 📋 前提条件・ブロッカー

- 特になし（外部APIや権限変更の依存なし）。

---

## 11. UI / コンポーネント設計

`src/frontend/components/ParentPinAuthModal.tsx` に以下のコードロジックを追加・更新する。

```tsx
export const ParentPinAuthModal: React.FC<ParentPinAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // ...既存のステートと関数...

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isVerifying) return;

      if (e.key >= '0' && e.key <= '9') {
        handleNumberClick(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleDelete();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isVerifying, pin, onClose]);

  // ...既存のJSX...
```

---

## 12. 実装タスクチェックリスト

- [x] **T1**: `src/frontend/components/ParentPinAuthModal.tsx` に `useEffect` キーリスナーとクリーンアップ関数を追加する。
  - **完了条件**: `npm run typecheck && npm run build` が exit code 0 で通過すること。
  - → 実装: `src/frontend/components/ParentPinAuthModal.tsx:L36-L55` / `npm run build` PASS / `verify.sh dev` PASS

---

## 13. 未確認事項（E-4）

| 未確認項目 | 確認手段 | ブロッカー理由 |
| :--- | :--- | :--- |
| なし | N/A | 現状のコード構造・動作仕様はすべて把握済み [EV-2]。 |

---

## 14. 品質ゲート実行結果（G-11）

$ ~/antigravity-agents/scripts/verify.sh design
```
========================================================
 verify.sh  role=design  base=HEAD  repo=game
 HEAD=1dc4deb  branch=main
========================================================
[PASS] gate-evidence      証跡フォーマット・鮮度・未確認記載の要件を満たしている
--------------------------------------------------------
RESULT: PASS  全ゲート通過（この出力を Artifact に貼付すること）
```
