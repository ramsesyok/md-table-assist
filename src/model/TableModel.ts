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

export type TableFormat = "spantable" | "gridtable" | "typst";

export type TableModel = {
  id: string;
  format: TableFormat;
  version: number;
  caption?: string;
  className?: string;
  rows: TableCell[][];
};

export interface TableParser {
  parse(source: string): TableModel;
}

export interface TableSerializer {
  serialize(table: TableModel): string;
}
