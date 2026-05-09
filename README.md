# Markdown Table Assist

Visual editor for Markdown tables, with first-class support for [`neoteroi.spantable`](https://www.neoteroi.dev/mkdocs-plugins/spantable/).

Rowspan / colspan を含む表を、セルを結合・分割しながら視覚的に編集し、`spantable` 形式の Markdown を生成します。

---

## 機能

- **Excel からの貼り付け**: Excel でコピーした表を Webview に Ctrl+V で貼り付けて取り込む
- **セル編集**: ダブルクリックでセルを直接編集
- **行・列の追加 / 削除**
- **セル結合 / 解除**: 矩形選択した範囲を結合、または結合済みセルを解除
- **キャプション・クラス名の編集**
- **Markdown プレビュー**: 生成される `spantable` 形式を確認
- **ドキュメントへの反映**: Apply ボタンで Markdown ファイルへ書き戻す
- **再編集**: 既存の `table-editor` ブロックにカーソルを置いて再度コマンドを実行すると、内容を読み込んで再編集できる
- **完全オフライン動作**: CDN やインターネット接続は不要

---

## 使い方

### 新規テーブルを作成する

1. `.md` ファイルを開く
2. 右クリックメニューから **Markdown Table Assist: Open Markdown Table Assist** を選択（またはコマンドパレットで `Markdown Table Assist: Open Markdown Table Assist`）
3. 表が表示されたら、Excel からデータを貼り付けるか、セルを直接編集する
4. セルを結合するには範囲をクリック+Shiftクリックで選択し、**Merge** ボタンを押す
5. **Apply** ボタンを押すと、カーソル位置に `spantable` ブロックが挿入される

### 既存テーブルを再編集する

1. Markdown ファイル内の `<!-- table-editor:start ... -->` ブロックの中にカーソルを置く
2. 右クリックメニューまたはコマンドパレットから **Open Markdown Table Assist** を実行
3. テーブルが読み込まれるので編集し、**Apply** で上書きする

### 既存の `::spantable::` ブロックを取り込む

`table-editor` コメントブロックを持たない既存の `::spantable::` ブロックにカーソルを置いてコマンドを実行すると、自動的に読み込みます。Apply 時にコメントブロック形式に変換されます。

---

## 生成される Markdown 形式

```markdown
<!-- table-editor:start id="tbl-001" format="spantable" version="1" -->

::spantable:: caption="比較表" class="wide-table"

| 区分    | 項目A @span |         |
| ------- | ----------- | ------- |
| 共通    | 値1         | 値2     |

::end-spantable::

<!-- table-editor:end id="tbl-001" -->
```

- コメントブロックには `id` / `format` / `version` のみを保持し、テーブル内容は通常の Markdown として残す
- `@span` が付いたセルが結合元、隣接する空セルが結合範囲

---

## セル操作

| 操作 | 方法 |
| ---- | ---- |
| セル選択 | クリック |
| 範囲選択 | クリック後、終端セルを Shift+クリック |
| セル編集 | ダブルクリック |
| 編集確定 | Enter または Tab |
| 編集キャンセル | Escape |
| Excel 貼り付け | Webview にフォーカスした状態で Ctrl+V |

---

## 対応フォーマット

| フォーマット | 読み込み | 書き出し |
| ------------ | -------- | -------- |
| `neoteroi.spantable` | ✓ | ✓ |

Grid Table・Typst は将来対応予定。

---

## 開発

```bash
npm install
npm run build      # extension host + webview をビルド
npm test           # ユニットテスト
npm run package    # VSIX パッケージ生成
```

F5 キーで Extension Development Host を起動してデバッグできます。

---

## 動作要件

- Visual Studio Code 1.85 以上
- ネットワーク接続不要（完全オフライン対応）
