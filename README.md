# Markdown Table Assist

Markdown Table Assist は、Markdown 文書内の表を視覚的に編集するための Visual Studio Code 拡張機能です。

GitHub Flavored Markdown の通常テーブル、結合セルを表現できる `mdxSpanner`、MkDocs / neoteroi 向けの `spantable` など、複数の Markdown テーブル記法を同じ表エディタで扱えます。

---

## 機能

- **Excel からの貼り付け**: Excel でコピーした表を表エディタ画面に Ctrl+V で貼り付けて取り込む
- **セル編集**: ダブルクリックでセルを直接編集
- **行・列の追加 / 削除**
- **セル結合 / 解除**: 矩形選択した範囲を結合、または結合済みセルを解除
- **出力形式の切り替え**: GitHub Flavored Markdown / `mdxSpanner` / `spantable` を選択
- **キャプション・クラス名の編集**: 対応する形式では Markdown 出力に反映
- **Markdown プレビュー**: 選択中の形式で生成される Markdown を確認
- **ドキュメントへの反映**: Apply ボタンで Markdown ファイルへ書き戻す
- **再編集**: 既存の `table-editor` ブロックにカーソルを置いて再度コマンドを実行すると、内容を読み込んで再編集できる

---

## 使い方

### 新規テーブルを作成する

1. Visual Studio Code で `.md` ファイルを開く
2. 右クリックメニューから **Markdown Table Assist: Open Markdown Table Assist** を選択する  
   または、コマンドパレットで `Markdown Table Assist: Open Markdown Table Assist` を実行する
3. 表エディタ画面が開いたら、Excel からデータを貼り付けるか、セルを直接編集する
4. 必要に応じて出力形式を選択する
5. セルを結合するには範囲をクリック + Shift クリックで選択し、Merge ボタンを押す
6. Apply ボタンを押すと、カーソル位置にテーブルブロックが挿入される

### 既存テーブルを再編集する

1. Markdown ファイル内の `<!-- table-editor:start ... -->` ブロックの中にカーソルを置く
2. 右クリックメニューまたはコマンドパレットから **Open Markdown Table Assist** を実行する
3. テーブルが読み込まれるので編集し、Apply で上書きする

### 既存の Markdown テーブルを取り込む

`table-editor` コメントブロックを持たない既存の `::spantable::` ブロック、または GitHub Flavored Markdown のパイプテーブル付近にカーソルを置いてコマンドを実行すると、自動的に読み込みます。

Apply 時には、再編集に必要な軽量コメント付きの `table-editor` ブロックへ変換されます。

---

## 対応フォーマット

| フォーマット | 読み込み | 書き出し | 備考 |
| ------------ | -------- | -------- | ---- |
| GitHub Flavored Markdown pipe table | ✓ | ✓ | 通常の Markdown テーブル。結合セルは保存できません。 |
| `mdxSpanner` | ✓ | ✓ | 結合セルをマーカーで表現します。 |
| `neoteroi.spantable` | ✓ | ✓ | `@span` と空セルで結合セルを表現します。 |

Grid Table と Typst table は将来対応予定です。

---

## 生成される Markdown 形式

Markdown Table Assist は、テーブル本体を通常の Markdown として残しつつ、再編集のために軽量なコメントを付与します。

```markdown
<!-- table-editor:start id="tbl-001" format="pipeTable" version="1" -->

| 区分 | 項目A | 項目B |
| ---- | ---- | ---- |
| 共通 | 値1  | 値2  |

<!-- table-editor:end id="tbl-001" -->
```

`spantable` を選択した場合は、次のような形式で出力されます。

```markdown
<!-- table-editor:start id="tbl-002" format="spantable" version="1" -->

::spantable:: caption="比較表" class="wide-table"

| 区分 | 項目A @span |      |
| ---- | ----------- | ---- |
| 共通 | 値1         | 値2  |

::end-spantable::

<!-- table-editor:end id="tbl-002" -->
```

- コメントブロックには `id` / `format` / `version` のみを保持します
- テーブル内容は選択した Markdown 記法のまま保持します
- `spantable` では、`@span` が付いたセルが結合元、隣接する空セルが結合範囲です

---

## セル操作

| 操作 | 方法 |
| ---- | ---- |
| セル選択 | クリック |
| 範囲選択 | クリック後、終端セルを Shift + クリック |
| セル編集 | ダブルクリック |
| 編集確定 | Enter または Tab |
| 編集キャンセル | Escape |
| Excel 貼り付け | 表エディタ画面にフォーカスした状態で Ctrl+V |

---

## 開発

```bash
npm install
npm run build      # extension host + editor UI をビルド
npm test           # ユニットテスト
npm run package    # VSIX パッケージ生成
```

F5 キーで Extension Development Host を起動してデバッグできます。

---

## 動作要件

- Visual Studio Code 1.85 以上
