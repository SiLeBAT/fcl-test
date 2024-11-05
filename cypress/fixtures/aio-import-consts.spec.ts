import { CellAddress } from './aio-import-model.spec';
import { ERROR_RESOLUTION_TEXTS, ERROR_TEXTS } from './io-consts.spec';

export const SHEET_NAMES = {
    stations: 'Stations',
    deliveries: 'Deliveries',
    deliveries2Deliveries: 'Deliveries2Deliveries'
} as const;

function escapeRegex(text: string): string {
    return text.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

export const TOASTER_TEXTS = {
    missingSheet: (sheetName: string) =>
        `${ERROR_TEXTS.invalidDataFormat} ${ERROR_RESOLUTION_TEXTS.uploadAllInOneTemplate} Sheet '${sheetName}' is missing.`,
    missingSheets:
     new RegExp(`^${escapeRegex(`${ERROR_TEXTS.invalidDataFormat} ${ERROR_RESOLUTION_TEXTS.uploadAllInOneTemplate}`)} Sheets .* are missing.$`),
    invalidExcelFile: `${ERROR_TEXTS.invalidDataFormat} ${ERROR_RESOLUTION_TEXTS.uploadAllInOneTemplate}`,
    invalidSheetHeader: (sheet: string, row: number, col: number, expectedValue: string) =>
        `${ERROR_TEXTS.invalidDataFormat} ${ERROR_RESOLUTION_TEXTS.uploadAllInOneTemplate} Unexpected cell text. Text in cell (row: ${row}, column: ${col}, sheet: '${sheet}') does not match '${expectedValue}'.`
};

export const INVALIDATE_CELL_TEXTS: { sheet: (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES]; cellAddresses: CellAddress[] }[] = [
    {
        sheet: SHEET_NAMES.stations,
        cellAddresses: [{ row: 1, col: { from: 1, to: 11 } }]
    },
    {
        sheet: SHEET_NAMES.deliveries,
        cellAddresses: [
            { row: 1, col: [{ from: 1, to: 5 }, 7, 10, 13, 15, 16] },
            { row: 2, col: { from: 5, to: 14 } }
        ]
    },
    {
        sheet: SHEET_NAMES.deliveries2Deliveries,
        cellAddresses: [{ row: 1, col: [1, 2] }]
    }
];
