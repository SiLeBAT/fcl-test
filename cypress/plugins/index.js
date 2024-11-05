// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

const {
    addMatchImageSnapshotPlugin,
} = require('cypress-image-snapshot/plugin');

const fs = require('fs');
const path = require('path');
const excel = require('exceljs');

module.exports = (on, config) => {
    // `on` is used to hook into various events Cypress emits
    // `config` is the resolved Cypress config
    on('before:browser:launch', (browser = {}, launchOptions) => {
        const downloadDirectory = path.join(__dirname, '..', 'downloads');
        if (browser.family === 'chromium' && browser.name !== 'electron') {
            launchOptions.preferences.default['download'] = { default_directory: downloadDirectory }
        }
        if (browser.name === 'chrome') {
            launchOptions.args.push('--window-size=1280,1024');
        }
        if (browser.name === 'firefox' && browser.isHeadless) {
            launchOptions.args.push('--width=1280')
            launchOptions.args.push('--height=1024')
          }
        if (browser.name === 'electron') {
            launchOptions.preferences.width = 1280
            launchOptions.preferences.height = 1024
        }
        if (browser.name === 'edge' && browser.isHeadless) {
            launchOptions.args.push('--window-size=1280,1024');
        }

        // force color profile
        if (browser.family === 'chromium' && browser.name !== 'electron') {
            launchOptions.args.push('--force-color-profile=srgb');
        }
        return launchOptions;
    });
    addMatchImageSnapshotPlugin(on, config);
    on('task', {
        readFileMaybe(filename) {
          if (fs.existsSync(filename)) {
            return fs.readFileSync(filename, 'utf8')
          }

          return null
        }
    });
    on('task', {
        pathExists(path) {
          return fs.existsSync(path);
        }
    });
    on('task', {
        getFilesInFolder(folderpath) {
            if (fs.existsSync(folderpath)) {
                const filenames = fs.readdirSync(folderpath);
                return filenames;
            } else {
                return null;
            }
        }
    });
    on('task', {
        log (message) {
          console.log(message)
          return null
        }
    });
    on('task', {
        logSkip (message) {
          console.log('\x1b[34m%s\x1b[0m', message);
          return null
        }
    });
    on('task', {
        logWarn (message) {
          console.log('\x1b[31m%s\x1b[0m', message);
          return null
        }
    });
    on('task', {
        readXlsxFile (args) {
            const workbook = new excel.Workbook();
            return new Promise((resolve, reject) => {
                workbook.xlsx.readFile(args.readFilePath).then(() => {
                    workbook.removeWorksheet(args.sheetName);
                    workbook.xlsx.writeFile(args.writeFilePath).then(() => {
                        resolve(true)
                    }).catch((err) => reject(err));
                }).catch((err) => reject(err));
            });

        },
    });

    on('task', {
        editXlsxFile (args) {
            const workbook = new excel.Workbook();
            return new Promise((resolve, reject) => {
                workbook.xlsx.readFile(args.readFilePath).then(() => {
                    for (const editOp of args.editOps) {
                        switch (editOp.type) {
                            case 'remove-sheets':
                                editOp.sheets.forEach(sheet => workbook.removeWorksheet(sheet));
                                break;
                            case 'edit-sheet':
                                const worksheet = workbook.getWorksheet(editOp.sheet);
                                if (worksheet) {
                                    editOp.cellOps.forEach(cellOp => worksheet.getRow(cellOp.row).getCell(cellOp.col).value = cellOp.value);
                                } else {
                                    throw new Error(`Worksheet '${editOp.sheet}' is missing.`);
                                }
                                break;
                            default:
                                throw new Error(`Unsupported edit type: '${editOp.type}'`);
                        }
                    }
                    workbook.xlsx.writeFile(args.writeFilePath).then(() => {
                        resolve(true)
                    }).catch((err) => reject(err));
                }).catch((err) => reject(err));
            });
        },
    });

    on('task', {
        getXlsxCellText (args) {
            const workbook = new excel.Workbook();
            return new Promise((resolve, reject) => {
                const { filePath, sheet, cell: { row, col } } = args;
                workbook.xlsx.readFile(filePath).then(() => {
                    const worksheet = workbook.getWorksheet(sheet);
                    if (worksheet) {
                        resolve(worksheet.getRow(row)?.getCell(col)?.text ?? '');
                    } else {
                        reject(`Sheet '${sheet}' is missing.`)
                    }
                }).catch((err) => reject(err));
            });
        },
    });
}
