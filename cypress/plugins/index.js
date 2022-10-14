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

module.exports = (on, config) => {
    // `on` is used to hook into various events Cypress emits
    // `config` is the resolved Cypress config
    on('before:browser:launch', (browser = {}, launchOptions) => {
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
      })
}
