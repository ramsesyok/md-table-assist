# AGENTS.md

## Project Overview

This project is a Visual Studio Code extension for editing Markdown tables used in documentation.

The primary target format is `neoteroi.spantable`.

The extension provides a visual table editor that allows users to:

- Paste initial table data from Excel
- Edit cells visually in a VSCode Webview
- Merge and unmerge cells
- Generate `neoteroi.spantable` Markdown
- Re-edit previously generated tables
- Work fully offline in an air-gapped environment

The initial version must focus on `spantable`.
Grid Table and Typst table support are future extensions, but the architecture must not block them.

## Operating Environment

The extension must work in an offline and air-gapped environment.

Do not implement features that require internet access at runtime.

Do not use CDN-hosted JavaScript, CSS, fonts, images, or external web resources.

All frontend assets must be bundled into the extension package.

External npm packages may be used only if they are bundled at build time and do not require network access at runtime.

## Recommended Technology Stack

Use the following stack unless there is a strong reason not to:

- VSCode Extension API
- TypeScript
- React
- Vite
- Webview-based UI
- Local bundled CSS and JavaScript only

Do not rely on external web services.

Do not implement a server component.

Do not use a database for the initial version.

## Core Design Principle

Separate the editor UI from the table format conversion logic.

The React editor must not directly depend on `neoteroi.spantable` syntax.

Use an intermediate table model.

Recommended architecture:

```text
React Table Editor
        ↓
TableModel
        ↓
Format Parser / Serializer
  ├─ spantable
  ├─ future: gridtable
  └─ future: typst
```

## TableModel

Define an intermediate table model that can represent merged cells.

Example shape:

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

The editor must operate on `TableModel`.

The serializer must convert `TableModel` to Markdown.

The parser must convert Markdown back to `TableModel`.

## Standard Output Format

Use a lightweight comment-based block format from the first version.

The standard generated block must look like this:

```markdown
<!-- table-editor:start id="tbl-001" format="spantable" version="1" -->

::spantable:: caption="比較表" class="wide-table"

| 区分 | 項目A | 項目B |
| ---- | ----- | ----- |
| 共通 @span |  | 値1 |

<!-- table-editor:end id="tbl-001" -->
```

Only store lightweight metadata in the comments:

* id
* format
* version

Do not embed the full table model as JSON in the initial version.

The actual table content must remain normal `neoteroi.spantable` Markdown.

## Block Detection

Implement block detection in the following priority order:

1. If the cursor is inside a `table-editor:start` / `table-editor:end` block, open that block for editing.
2. If the cursor is near a plain `::spantable::` block without comments, import it as an editable table.
3. If no table is found, create a new table.

When saving a plain imported `::spantable::` block, convert it to the standard lightweight comment-based block.

## Markdown Block Rules

The extension must replace only the detected table block.

It must not rewrite unrelated Markdown content.

It must preserve content before and after the table block.

If a start comment exists without an end comment, or an end comment exists without a start comment, do not modify the document automatically. Show a clear error message.

## spantable Format

The initial serializer must support `neoteroi.spantable`.

`neoteroi.spantable` represents merged cells by using `@span` on the source cell and empty adjacent cells.

Example:

```markdown
::spantable::

| A @span |   | C |
| ------- | - | - |
| D       | E | F |
```

The serializer must:

* Emit `::spantable::`
* Include caption and class when set
* Convert merged cells to `@span`
* Emit empty cells for hidden cells in merged ranges
* Escape Markdown table cell text as needed
* Avoid generating malformed Markdown tables

The parser must:

* Read the `::spantable::` block
* Read the Markdown table rows
* Detect cells containing `@span`
* Infer merged ranges from adjacent empty cells
* Convert the result to `TableModel`

For ambiguous cases, choose a deterministic rule and document it in code comments.

## Excel Paste Support

Initial table creation should support pasting from Excel.

The first version should support TSV pasted from Excel through the clipboard.

Expected flow:

```text
Excel
  ↓ copy selected range
VSCode Webview
  ↓ paste
Parse text/plain TSV
  ↓
Create TableModel
```

Initial version does not need to preserve Excel-side merged cells.

Users are expected to:

1. Create the rough table in Excel
2. Copy the table range
3. Paste it into the VSCode table editor
4. Merge cells inside the VSCode editor
5. Save as `spantable` Markdown

Future support may parse `text/html` from the clipboard to recover Excel-side rowspan and colspan, but do not implement this in the initial version unless explicitly requested.

## React Webview UI

Implement the editor as a VSCode Webview using React.

Minimum UI features:

* Display a table from `TableModel`
* Edit cell text
* Paste TSV from Excel
* Select a rectangular range of cells
* Add row
* Delete row
* Add column
* Delete column
* Merge selected cells
* Unmerge selected merged cell
* Edit caption
* Edit class name
* Preview generated Markdown
* Apply changes to the Markdown document

The table may be implemented using plain HTML `<table>` elements.

Do not introduce a large spreadsheet library unless necessary.

Avoid heavy dependencies in the initial version.

## Cell Merge Rules

Support rectangular cell selection only.

When merging cells:

* The selected range must be rectangular
* The selected range must not partially overlap an existing merged cell
* If the selection is invalid, show an error and do not modify the table
* The top-left cell becomes the visible source cell
* Other cells in the merged range become hidden cells
* The source cell receives `rowspan` and `colspan`

When unmerging:

* Reset the source cell to `rowspan = 1` and `colspan = 1`
* Restore hidden cells in the merged range as empty visible cells

## File Structure

Use a structure close to the following:

```text
src/
  extension.ts

  markdown-document/
    findTableEditorBlock.ts
    findSpantableBlock.ts
    replaceBlock.ts
    generateTableId.ts

  model/
    TableModel.ts
    normalizeTableModel.ts
    validateTableModel.ts
    mergeCells.ts
    unmergeCell.ts

  formats/
    spantable/
      parseSpantable.ts
      serializeSpantable.ts
      escapeMarkdownCell.ts

  webview/
    index.html
    main.tsx
    TableEditor.tsx
    Toolbar.tsx
    CellView.tsx
    tableEditor.css
```

Keep parsing, serialization, document replacement, and UI logic separated.

## Commands

Implement at least the following VSCode command:

```text
tableEditor.open
```

Behavior:

* If the cursor is inside an editable table block, open it for editing
* If the cursor is near a plain `::spantable::` block, import it
* Otherwise, open an empty editor and allow TSV paste or manual table creation

Optional future commands:

```text
tableEditor.insertNew
tableEditor.convertPlainSpantable
```

Do not implement optional commands unless needed.

## Webview Security

The Webview must use a restrictive Content Security Policy.

Do not allow remote scripts.

Do not allow remote styles.

Use nonce-based script loading.

Use `webview.asWebviewUri` for local assets.

Do not use inline scripts except where unavoidable.

## Offline Packaging

The extension must be buildable and installable as a VSIX package.

Runtime must not require:

* npm install
* internet access
* CDN access
* external web APIs

All dependencies must be resolved at build time.

## Testing

Add unit tests for non-UI logic.

At minimum, test:

* TSV parsing
* TableModel normalization
* Cell merging
* Cell unmerging
* spantable serialization
* spantable parsing
* table-editor comment block detection
* Markdown block replacement

Do not rely only on manual UI testing.

Prefer testing pure TypeScript functions outside the Webview.

## Initial Implementation Order

Implement in this order:

1. Define `TableModel`
2. Implement TSV-to-TableModel conversion
3. Implement spantable serializer
4. Implement table-editor comment block generation
5. Implement block detection and replacement
6. Implement simple React Webview table display
7. Implement cell editing
8. Implement Apply-to-document
9. Implement cell selection
10. Implement merge/unmerge
11. Implement spantable parser for re-editing
12. Add tests

Do not start with Grid Table or Typst support.

Only prepare the architecture for them.

## Future Extension Points

The following are future features and must not be hard-coded against:

* Grid Table output
* Grid Table re-editing
* Typst table output
* HTML table output
* Parsing Excel clipboard HTML
* Embedding full TableModel JSON in comments
* More complex Markdown inside cells

Use interfaces such as:

```ts
export interface TableParser {
  parse(source: string): TableModel;
}

export interface TableSerializer {
  serialize(table: TableModel): string;
}
```

## Non-Goals for Initial Version

Do not implement the following in the initial version:

* Full spreadsheet functionality
* Formula support
* Excel import from `.xlsx`
* Excel export
* Rich text editing inside cells
* Cell background colors
* Cell borders
* Cell-level CSS styling
* Drag-fill
* Sorting
* Filtering
* Database storage
* Server backend
* Cloud sync
* Runtime internet access

## Quality Expectations

Prefer simple, maintainable code.

Avoid clever parsing logic that is difficult to test.

Do not mix VSCode document manipulation with Webview UI logic.

Do not modify unrelated files.

Do not introduce large dependencies without justification.

All important behavior should be covered by unit tests.

When adding a new format, add it under `formats/<format-name>/` without changing the React editor model.

