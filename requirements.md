# requirements.md

# Markdown Table Assist 要件定義

## 1. 目的

本プロジェクトは、Markdown文書作成において、rowspan / colspan を含む表を視覚的に編集できる Visual Studio Code 拡張機能を作成することを目的とする。初期バージョンでは `neoteroi.spantable` を主な出力形式として扱う。

通常のMarkdown表では、結合セルを扱いにくい。  
また、`neoteroi.spantable` は結合セルを表現できるが、Markdownを手書きで編集するには負担が大きい。

そこで、VSCode上で以下を実現する。

- Excelで作成した表を貼り付けて初期テーブルを作成する
- VSCode上でセル結合を視覚的に編集する
- `neoteroi.spantable` 形式のMarkdownとして保存する
- `neoteroi.spantable` の表キャプションを編集・保存・再編集できるようにする
- 一度作成した表を再編集できるようにする
- 将来的に Grid Table や Typst table にも拡張できる設計にする

## 2. 想定利用環境

本拡張機能は、オフライン・エアギャップ環境での利用を前提とする。

### 2.1 実行時の制約

実行時に以下を行ってはならない。

- インターネット接続
- CDNからのJavaScript読み込み
- CDNからのCSS読み込み
- 外部フォントの読み込み
- 外部画像の読み込み
- 外部Web APIへのアクセス
- サーバとの通信
- クラウドサービス連携

### 2.2 配布形態

- VSCode拡張機能として配布する
- VSIX形式で配布できること
- 実行時に `npm install` を要求しないこと
- 必要なJavaScript / CSS / 画像等は拡張機能に同梱すること

## 3. 想定ユーザー

主なユーザーは、Markdownで技術文書を作成する開発者・技術文書作成者とする。

特に以下のようなユーザーを想定する。

- Markdownで技術文書を作成している
- MkDocs Materialなど、Markdownベースのドキュメント環境を利用している
- 結合セルを含む表を作成したい
- 表キャプション付きの表を作成したい
- Excelで表の下書きを作ることに慣れている
- オフライン環境や社内閉域環境で作業している
- Markdownの手編集だけで複雑な表を管理するのは避けたい

## 4. 基本方針

### 4.1 初期表作成はExcelに任せる

本拡張機能は、完全なスプレッドシートアプリを目指さない。

初期表の作成はExcelに任せ、VSCode拡張機能では以下に集中する。

- Excelからコピーした表データの貼り付け
- 表の視覚的な確認
- セル結合
- 表キャプションの設定
- `neoteroi.spantable` 形式への変換
- Markdown文書への挿入
- 既存表の再編集

### 4.2 エディタと変換処理を分離する

将来的な拡張に備え、エディタ部分とMarkdown変換部分を分離する。

```text
Visual Table Editor
        ↓
TableModel
        ↓
Parser / Serializer
  ├─ spantable
  ├─ future: gridtable
  └─ future: typst
```

エディタは `spantable` の文法を直接扱わない。
エディタは中間モデルである `TableModel` のみを編集する。

### 4.3 初期対応形式は spantable とする

初期バージョンでは `neoteroi.spantable` のみを正式対応対象とする。

Grid Table、Typst table、HTML tableは将来拡張とする。

## 5. 対象Markdown形式

### 5.1 標準出力形式

本拡張機能が生成する標準形式は、軽量コメント付きの `spantable` ブロックとする。

```markdown
<!-- table-editor:start id="tbl-001" format="spantable" version="1" -->

::spantable:: caption="比較表" class="wide-table"

| 区分 | 項目A | 項目B |
| ---- | ----- | ----- |
| 共通 @span |  | 値1 |

<!-- table-editor:end id="tbl-001" -->
```

### 5.2 spantableキャプション

`neoteroi.spantable` のキャプションに対応する。

キャプションは `::spantable::` ディレクティブの `caption` 属性として出力する。

```markdown
::spantable:: caption="比較表"
```

キャプションとclassを同時に指定する場合は、以下のように出力する。

```markdown
::spantable:: caption="比較表" class="wide-table"
```

キャプションの要件は以下とする。

* Webviewエディタ上でキャプションを入力・編集できること
* 既存の `caption="..."` を読み込めること
* 保存時に `caption="..."` として出力できること
* キャプションが空の場合は `caption` 属性を出力しないこと
* 再編集時に既存キャプションを保持できること
* キャプション文字列内の引用符など、Markdown属性として問題になる文字は適切にエスケープすること

### 5.3 コメントに含める情報

初期バージョンでは、コメントに以下のみを保持する。

* `id`
* `format`
* `version`

TableModel全体のJSONは初期バージョンでは埋め込まない。

表キャプションはコメントには保持せず、`::spantable::` の `caption` 属性として保持する。

### 5.4 コメントを使う理由

軽量コメントを使う理由は以下である。

* 再編集対象の開始位置と終了位置を明確にする
* 将来的にGrid TableやTypst tableを扱いやすくする
* 誤って別の表を編集するリスクを下げる
* VSCode上で対象ブロックを安全に置換できるようにする

### 5.5 コメントなし spantable の扱い

既存文書との互換性のため、コメントなしの `::spantable::` ブロックも読み込み対象とする。

コメントなしの `spantable` を編集した場合、保存時には軽量コメント付き形式へ変換する。

コメントなしの `spantable` に `caption="..."` が存在する場合は、TableModelの `caption` として読み込み、保存時にも維持する。

## 6. 主な利用フロー

### 6.1 新規作成フロー

```text
1. Excelで表の下書きを作成する
2. Excel上で表範囲をコピーする
3. VSCodeでMarkdownファイルを開く
4. 本拡張機能のテーブルエディタを開く
5. Webview上にExcel表を貼り付ける
6. 必要に応じてセル結合を行う
7. 表キャプションを設定する
8. classを設定する
9. Markdownプレビューを確認する
10. Markdown文書へ挿入する
```

### 6.2 再編集フロー

```text
1. Markdownファイル内の既存テーブル付近にカーソルを置く
2. 本拡張機能のテーブルエディタを開く
3. table-editorコメント範囲を検出する
4. 範囲内のspantable MarkdownをTableModelへ変換する
5. 既存のcaption / classを読み込む
6. Webview上で表を再編集する
7. 必要に応じてcaption / classを更新する
8. Apply操作により元のテーブルブロックを置換する
```

### 6.3 コメントなし spantable の取り込みフロー

```text
1. コメントなしの ::spantable:: ブロック付近にカーソルを置く
2. 本拡張機能のテーブルエディタを開く
3. spantableブロックを検出する
4. caption / classを読み取る
5. TableModelへ変換する
6. 編集後、軽量コメント付き形式で保存する
```

## 7. 機能要件

### 7.1 VSCodeコマンド

最低限、以下のコマンドを提供する。

```text
tableEditor.open
```

このコマンドは、現在のカーソル位置に応じて以下の動作を行う。

| 状態                  | 動作                  |
| ------------------- | ------------------- |
| table-editorコメント範囲内 | 既存表を再編集する           |
| コメントなしspantable付近   | spantableを取り込んで編集する |
| 対象表なし               | 新規テーブルエディタを開く       |

### 7.2 Webviewエディタ

VSCode Webviewを用いて、視覚的な表エディタを提供する。

最低限、以下を実装する。

* 表の表示
* セルテキスト編集
* Excel TSV貼り付け
* 行追加
* 行削除
* 列追加
* 列削除
* セル範囲選択
* 選択範囲の結合
* 結合解除
* 表キャプション編集
* class編集
* Markdownプレビュー
* Markdown文書への反映

### 7.3 表キャプション編集

Webviewエディタ上で、表キャプションを編集できること。

要件は以下とする。

* キャプション入力欄を用意する
* 新規作成時にキャプションを設定できる
* 再編集時に既存キャプションを表示する
* キャプションを変更して保存できる
* キャプションを空にした場合は、出力Markdownから `caption` 属性を削除する
* キャプションはTableModelの `caption` として保持する
* キャプションはspantable出力時に `::spantable:: caption="..."` として出力する

### 7.4 Excel貼り付け

Excelでコピーした範囲を、Webview上に貼り付けられること。

初期バージョンでは、クリップボードの `text/plain` TSVを対象とする。

```text
A<TAB>B<TAB>C
D<TAB>E<TAB>F
```

初期バージョンでは、Excel上で設定された結合セルの復元は必須としない。

推奨運用は以下とする。

```text
Excelでは表の下書きのみ行う
セル結合はVSCode拡張機能上で行う
```

### 7.5 セル結合

セル結合は、矩形選択に対して実行する。

結合時のルールは以下とする。

* 選択範囲は矩形であること
* 既存の結合セルと部分的に重なってはならない
* 不正な選択範囲の場合はエラーを表示し、表を変更しない
* 選択範囲の左上セルを結合元セルとする
* 結合元セルに `rowspan` / `colspan` を設定する
* それ以外のセルは非表示セルとして扱う

### 7.6 結合解除

結合解除は、結合元セルに対して実行する。

解除時のルールは以下とする。

* 対象セルの `rowspan` / `colspan` を1に戻す
* 結合範囲内の非表示セルを空セルとして復元する
* 元の結合元セルのテキストは維持する
* 復元されたセルのテキストは空とする

### 7.7 spantable出力

TableModelを `neoteroi.spantable` 形式のMarkdownへ変換できること。

出力例:

```markdown
::spantable:: caption="比較表" class="wide-table"

| 区分 | 項目A | 項目B |
| ---- | ----- | ----- |
| 共通 @span |  | 値1 |
```

出力時の要件:

* `::spantable::` ディレクティブを出力する
* TableModelの `caption` が設定されている場合は `caption="..."` を出力する
* TableModelの `caption` が空の場合は `caption` 属性を出力しない
* TableModelの `className` が設定されている場合は `class="..."` を出力する
* 結合元セルには `@span` を付与する
* 結合範囲の非表示セルは空セルとして出力する
* Markdown表として壊れないようにセル文字列をエスケープする
* `caption` および `class` の属性値は適切にエスケープする

### 7.8 spantable読み込み

既存の `spantable` Markdownを読み込み、TableModelへ変換できること。

読み込み時の要件:

* `::spantable::` を認識する
* `caption="..."` を読み取り、TableModelの `caption` に設定する
* `class="..."` を読み取り、TableModelの `className` に設定する
* Markdown表を読み取る
* `@span` を含むセルを結合元セルとして扱う
* 周辺の空セルから `rowspan` / `colspan` を推定する
* 曖昧なケースでは、決められたルールに従って解釈する

### 7.9 Markdown文書への反映

編集結果をMarkdown文書に反映できること。

反映時の要件:

* 対象のテーブルブロックだけを置換する
* テーブル前後の本文を変更しない
* コメント付きブロックの場合は、startからendまでを置換する
* コメントなしspantableの場合は、該当spantableブロックをコメント付きブロックへ置換する
* 不完全なコメントブロックの場合は自動修正せず、エラー表示する
* 既存のキャプションを変更した場合、置換後のMarkdownに反映する
* キャプションを削除した場合、置換後の `::spantable::` から `caption` 属性を削除する

## 8. 非機能要件

### 8.1 オフライン動作

実行時にネットワーク接続を必要としないこと。

### 8.2 セキュリティ

Webviewでは、可能な限り制限的なContent Security Policyを設定する。

要件:

* remote scriptを許可しない
* remote styleを許可しない
* nonce付きscriptを使用する
* ローカルアセットは `webview.asWebviewUri` を使用して読み込む
* Webviewから外部サイトへアクセスしない

### 8.3 保守性

以下の責務を分離する。

* VSCode拡張機能のコマンド処理
* Markdown文書中のブロック検出
* Markdown文書の置換処理
* TableModel操作
* spantableパース処理
* spantableシリアライズ処理
* 表キャプションの読み書き処理
* React Webview UI

### 8.4 拡張性

将来的に以下を追加できる構造にする。

* Grid Table出力
* Grid Table読み込み
* Typst table出力
* HTML table出力
* Excel clipboard HTMLの読み込み
* TableModel JSONのコメント埋め込み

### 8.5 依存関係

初期バージョンでは、大規模なスプレッドシートライブラリは利用しない方針とする。

ReactのHTML tableベースで実装する。

依存パッケージを追加する場合は、以下を満たすこと。

* 実行時にネットワーク接続しない
* VSIXに同梱できる
* ライセンス上、社内利用・業務利用に問題がない
* 実装全体が過度に複雑にならない

## 9. TableModel要件

エディタ内部では、Markdown文字列ではなく中間モデル `TableModel` を正とする。

想定モデル:

```ts
export type TableCell = {
  id: string;
  text: string;
  row: number;
  col: number;
  rowspan: number;
  colspan: number;
  hidden: boolean;
  header?: boolean;
  align?: "left" | "center" | "right";
};

export type TableModel = {
  id: string;
  format: "spantable" | "gridtable" | "typst";
  version: number;
  caption?: string;
  className?: string;
  rows: TableCell[][];
};
```

### 9.1 TableModelのルール

* `rows` は矩形グリッドとして扱う
* 表示セルは `hidden = false`
* 結合範囲内の非表示セルは `hidden = true`
* 結合元セルは `rowspan >= 1` および `colspan >= 1`
* 非結合セルは `rowspan = 1` および `colspan = 1`
* 非表示セルは原則としてテキストを持たない
* 表キャプションは `caption` に保持する
* `caption` が未設定または空文字の場合、出力時に `caption` 属性を生成しない
* CSS class相当の指定は `className` に保持する

## 10. エラー処理

以下の場合は、文書を自動変更しない。

* `table-editor:start` があるが `table-editor:end` がない
* `table-editor:end` があるが `table-editor:start` がない
* コメント内の `format` が未対応
* spantable MarkdownをTableModelに変換できない
* spantableの `caption` 属性の解析に失敗した
* セル結合範囲が不正
* Markdown置換範囲を安全に特定できない

エラー時は、ユーザーに分かるメッセージを表示する。

## 11. 初期バージョンの対象範囲

初期バージョンで対応するもの:

* VSCode拡張として起動
* React Webview表示
* Excel TSV貼り付け
* TableModel作成
* セル編集
* 行追加・削除
* 列追加・削除
* 矩形セル選択
* セル結合
* セル結合解除
* 表キャプション編集
* class編集
* spantable Markdown生成
* spantableキャプション出力
* spantableキャプション読み込み
* 軽量コメント付きブロック生成
* コメント付きspantableの再編集
* コメントなしspantableの取り込み編集
* Markdown文書への反映

## 12. 初期バージョンで対象外とするもの

以下は初期バージョンでは対象外とする。

* Excel `.xlsx` ファイルの直接読み込み
* Excelファイルへの出力
* Excel上の結合セル情報の完全復元
* クリップボードHTMLの本格解析
* 数式
* ソート
* フィルタ
* ドラッグフィル
* セル背景色
* セル罫線編集
* セル単位のCSS設定
* 複雑なリッチテキスト編集
* セル内の複数段落Markdown
* セル内のMarkdown表
* Grid Table出力
* Grid Table読み込み
* Typst table出力
* HTML table出力
* サーバ機能
* データベース保存
* クラウド同期
* 実行時インターネットアクセス

## 13. 将来拡張

### 13.1 Grid Table対応

将来的に、TableModelからGrid Tableを出力できるようにする。

コメント型ブロック例:

```markdown
<!-- table-editor:start id="tbl-002" format="gridtable" version="1" -->

+--------+--------+
| 項目   | 値     |
+========+========+
| A      | 100    |
+--------+--------+

<!-- table-editor:end id="tbl-002" -->
```

### 13.2 Typst table対応

将来的に、TableModelからTypst tableを出力できるようにする。

コメント型ブロック例:

```markdown
<!-- table-editor:start id="tbl-003" format="typst" version="1" -->

```{=typst}
#table(
  columns: 2,
  [項目], [値],
  [A], [100],
)
```

<!-- table-editor:end id="tbl-003" -->
```


Typst table対応時も、TableModelの `caption` をTypst側の表キャプションとして出力できる設計にする。

### 13.3 Excel HTML貼り付け対応

将来的に、Excelコピー時の `text/html` を解析し、Excel上の結合セルを復元できるようにする。

ただし、初期バージョンでは必須としない。

### 13.4 TableModel JSON埋め込み

将来的に、完全な再編集性が必要な場合は、TableModelをコメント内にJSONとして埋め込むオプションを検討する。

初期バージョンでは採用しない。

## 14. テスト要件

少なくとも以下の単体テストを作成する。

* TSVからTableModelへの変換
* TableModelの正規化
* セル結合
* セル結合解除
* spantable Markdown生成
* spantable Markdown読み込み
* spantable caption出力
* spantable caption読み込み
* caption未設定時に `caption` 属性を出力しないこと
* caption更新時にMarkdownへ反映されること
* table-editorコメントブロック検出
* コメントなしspantableブロック検出
* Markdownブロック置換
* 不完全なコメントブロックのエラー検出

UIについては、初期バージョンでは手動確認でもよいが、ロジック部分は単体テストを重視する。

## 15. 成功条件

初期バージョンの成功条件は以下とする。

```text
1. Excelで作った表をVSCode Webviewに貼り付けられる
2. VSCode上でセルを編集できる
3. VSCode上でセル結合できる
4. 表キャプションを入力・編集できる
5. spantable Markdownを生成できる
6. spantable Markdownに caption 属性を出力できる
7. 軽量コメント付きブロックとしてMarkdown文書に挿入できる
8. 挿入済みの表を再編集できる
9. 再編集時に既存キャプションを読み込み、変更後に保存できる
10. 実行時にインターネット接続を必要としない
11. 将来的なGrid Table / Typst対応を妨げない構造になっている
```

