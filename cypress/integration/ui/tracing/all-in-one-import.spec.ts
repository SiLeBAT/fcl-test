import { INVALIDATE_CELL_TEXTS, SHEET_NAMES, TOASTER_TEXTS } from '../../../fixtures/aio-import-consts.spec';
import { ENV_CONSTS } from '../../../fixtures/env-constants.spec';
import { Cell, CellAddress, ColumnAddress } from '../../../fixtures/aio-import-model.spec';

const AIO_EXAMPLE_NAME = 'aio-import-example';
const AIO_EXAMPLE_PATH = `cypress/fixtures/${AIO_EXAMPLE_NAME}.xlsx`;
const TMP_FILE_PATH = `${Cypress.env(ENV_CONSTS.TMP_FOLDER)}/edited-aio-template.xlsx`;
const INVALID_EXCEL_FILE_PATH = `${Cypress.env(ENV_CONSTS.TMP_FOLDER)}/invalid-excel-file.xlsx`;

function getColumnArray(col: ColumnAddress): number[] {
    return typeof col === 'number' ? [col] :
        Array.isArray(col) ? ([] as number[]).concat(...col.map(getColumnArray)) :
            Array.from({ length: col.to - col.from + 1}, (element, index: number) => col.from + index);
}

function getCells(addresses: CellAddress[]): Cell[] {
    const cells = addresses.map(
        address => getColumnArray(address.col).map(col => ({ row: address.row, col: col }))
    );
    return ([] as Cell[]).concat(...cells);
}

describe('Testing the all-in-one-import of the app', function () {

    beforeEach(function () {
        cy.fixture('users.json').as('users').then(
            (users) => {
                cy.login(users[0]);
                cy.fixture('ui-routes.json').as('paths').then(
                    (paths) => {
                        cy.visit(paths.tracing);
                    }
                );
            }
        );
    });

    it('should test a valid data upload', function () {
        cy.uploadModelData(AIO_EXAMPLE_PATH, {  addFixturesDirPrefix: false, waitInMs: 1000});
        cy.checkNameOfLoadedFile(AIO_EXAMPLE_NAME);
    });

    it('should test a invalid excel file upload', function () {
        cy.writeFile(INVALID_EXCEL_FILE_PATH, '', 'utf-8');
        cy.uploadModelData(INVALID_EXCEL_FILE_PATH, { addFixturesDirPrefix: false });
        cy.checkErrorToaster(TOASTER_TEXTS.invalidExcelFile);
        cy.checkNameOfLoadedFile(undefined);
    });

    describe('should test missing sheet validation ...', function () {

        const sheetsToCheck = [SHEET_NAMES.stations, SHEET_NAMES.deliveries, SHEET_NAMES.deliveries2Deliveries];

        sheetsToCheck.forEach(sheetName => {

            it(`should test missing '${sheetName}' sheet validation`, function () {

                cy.task('editXlsxFile', {
                    readFilePath: AIO_EXAMPLE_PATH,
                    editOps: [{
                        type: 'remove-sheets',
                        sheets: [sheetName]
                    }],
                    writeFilePath: TMP_FILE_PATH
                }).then(() => {
                    cy.uploadModelData(TMP_FILE_PATH, { addFixturesDirPrefix: false });
                    cy.checkErrorToaster(TOASTER_TEXTS.missingSheet(sheetName));
                    cy.checkNameOfLoadedFile(undefined);
                });
            });
        });

        const sheetsToRemove = [SHEET_NAMES.stations, SHEET_NAMES.deliveries];
        it(`should test missing '${sheetsToRemove.join(`', '`)}' sheets validation ...`, function () {

            cy.task('editXlsxFile', {
                readFilePath: AIO_EXAMPLE_PATH,
                editOps: [{
                    type: 'remove-sheets',
                    sheets: sheetsToRemove
                }],
                writeFilePath: TMP_FILE_PATH
            }).then(() => {
                cy.uploadModelData(TMP_FILE_PATH, { addFixturesDirPrefix: false });
                cy.checkErrorToaster(TOASTER_TEXTS.missingSheets);
                cy.checkNameOfLoadedFile(undefined);
            });
        });
    });

    describe('should test sheet header validation ...', function () {

        INVALIDATE_CELL_TEXTS.forEach(({sheet, cellAddresses}) => {
            describe(`should test '${sheet}' header validation`, function () {

                const cellsToVerify = getCells(cellAddresses);

                cellsToVerify.forEach(cell => {

                    it(`should test cell (${cell.row}, ${cell.col}) validation`, function () {

                        cy.task('getXlsxCellText', { filePath: AIO_EXAMPLE_PATH, sheet: sheet, cell: cell })
                            .then(cellText => {
                                cy.task('editXlsxFile', {
                                    readFilePath: AIO_EXAMPLE_PATH,
                                    editOps: [{
                                        type: 'edit-sheet',
                                        sheet: sheet,
                                        cellOps: [{ row: cell.row, col: cell.col, value: 'Asas' }]
                                    }],
                                    writeFilePath: TMP_FILE_PATH
                                }).then(() => {
                                    cy.uploadModelData(TMP_FILE_PATH, { addFixturesDirPrefix: false, waitInMs: 1000 });
                                    cy.checkErrorToaster(TOASTER_TEXTS.invalidSheetHeader(sheet, cell.row, cell.col, cellText as string));
                                    cy.checkNameOfLoadedFile(undefined);
                                });

                            });
                    });
                });
            });
        });
    });
});
