export type CellAlign = "left" | "center" | "right";

export type TableColumn = {
  align?: CellAlign;
};

export type TableCell = {
  id: string;
  text: string;
  row: number;
  col: number;
  rowspan: number;
  colspan: number;
  hidden: boolean;
  header?: boolean;
  cellAlign?: CellAlign;
};

export type TableFormat =
  | "spantable"
  | "pipeTable"
  | "mdxSpanner"
  | "gridTable"
  | "typst";

export type TableModel = {
  id: string;
  format: TableFormat;
  version: number;
  caption?: string;
  className?: string;
  columns: TableColumn[];
  rows: TableCell[][];
};

export interface TableParser {
  parse(source: string): TableModel;
}

export interface TableSerializer {
  serialize(table: TableModel): string;
}
