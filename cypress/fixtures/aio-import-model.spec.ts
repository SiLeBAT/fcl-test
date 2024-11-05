export interface ColumnRange {
    from: number;
    to: number;
}

export type ColumnArray = [number | ColumnRange, ...(number | ColumnRange)[]];
export type ColumnAddress = number | ColumnRange | ColumnArray;

export interface CellArray {
    row: number;
    col: Exclude<ColumnAddress, number>;
}

export interface Cell {
    row: number;
    col: number;
}

export type CellAddress = Cell | CellArray;
