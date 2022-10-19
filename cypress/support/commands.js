// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

import { addMatchImageSnapshotCommand } from 'cypress-image-snapshot/command';
import { ENV_CONSTS } from '../fixtures/env-constants.spec';
import 'cypress-wait-until';

addMatchImageSnapshotCommand({
  failureThreshold: 0.00,
  failureThresholdType: 'percent',
  customDiffConfig: { threshold: 0.0 },
  capture: 'viewport',
});

Cypress.Commands.add("login", user => {
    return cy
        .request({
            method: "POST",
            url: "/v1/users/login",
            body: {
                email: user.email,
                password: user.password
            }
        })
        .then(response => {
            window.localStorage.setItem(
                "currentUser",
                JSON.stringify(response.body)
            );
        });
});

Cypress.Commands.overwrite('matchImageSnapshot', (originalFn, element, fileNameOrOptions, options) => {
    const defaultOptions = {
        failureThreshold: 1, // default 0
        failureThresholdType: 'pixel', // default 'pixel'   ('pixel' | 'percent')
        capture: 'viewport',
        customDiffConfig: { },
        comparisonMethod: 'ssim', // default 'pixelmatch'
        runInProcess: true, // default: false
        customSnapshotsDir: Cypress.env(ENV_CONSTS.IMAGE_SNAPSHOTS_DIR)
    };
    options = options !== undefined ? options :
        typeof fileNameOrOptions === 'object' ? fileNameOrOptions :
        {};
    options = {
        ...defaultOptions,
        ...options
    };


    let snapshotPrefix = Cypress.env(ENV_CONSTS.IMAGE_SNAPSHOT_PREFIX);
    if (snapshotPrefix === null || snapshotPrefix === undefined) {
        snapshotPrefix = `${Cypress.platform}-${Cypress.browser.name}-`;
    }

    snapshotPrefix = snapshotPrefix.replace('{platform}', Cypress.platform);
    snapshotPrefix = snapshotPrefix.replace('{browser}', Cypress.browser.name);
    snapshotPrefix = snapshotPrefix.replace('{browserVersion}', Cypress.browser.version);
    snapshotPrefix = snapshotPrefix.replace('{browserMajorVersion}', Cypress.browser.majorVersion);

    const fileName = typeof fileNameOrOptions === 'string' ? (snapshotPrefix + fileNameOrOptions) : undefined;
    const args = fileName === undefined ? [options] : [fileName, options];

    const pathInSnapshotsDir = `${Cypress.spec.name}/${fileName}.snap.png`;
    if (Cypress.env(ENV_CONSTS.SKIP_IMAGE_SNAPSHOTS) === true) {
        cy.task('logSkip', `Skip image snapshot ${pathInSnapshotsDir}`);
        return;
    }

    if (Cypress.env(ENV_CONSTS.FAIL_ON_IMAGE_SNAPSHOT_DIFF) === true) {
        throw new Error(`env setting '"${ENV_CONSTS.FAIL_ON_IMAGE_SNAPSHOT_DIFF}": true' will not work. To fail on diffs omit this setting.`);
    }

    const updateImage = Cypress.env(ENV_CONSTS.UPDATE_IMAGE_SNAPSHOTS);

    if (!updateImage && Cypress.env(ENV_CONSTS.FAIL_ON_MISSING_IMAGE_SNAPSHOTS)) { // 'fail-on-missing-image-snapshot')) {
        const filePath = `${options.customSnapshotsDir}/${pathInSnapshotsDir}`;
        cy.task('pathExists', filePath).then(pathExists => {
            if (!pathExists) {
                throw new Error(`Image snapshot '${pathInSnapshotsDir}' is missing.`);
            } else {
                return originalFn(element, ...args);
            }
        })
    } else {
        return originalFn(element, ...args);
    }
})

Cypress.Commands.add("matchJsonSnapshot", (fileName, data) => {
    const filePathInSnapshotDir = `${Cypress.spec.name}/${fileName}.json`;
    const filePath = `${Cypress.env(ENV_CONSTS.DATA_SNAPSHOTS_DIR)}/${filePathInSnapshotDir}`;
    cy.task('readFileMaybe', filePath).then((textOrNull) => {
        if (textOrNull !== null) {
            const refData = JSON.parse(textOrNull);
            expect(data, `Snapshot does not match data in '${filePathInSnapshotDir}'`).to.deep.eq(refData);

        } else {
            cy.writeFile(filePath, JSON.stringify(data), 'utf8');
        }
    });
})

Cypress.Commands.add("waitUntilCdkOverlayDisappeared", () => {
    cy.waitUntil(function() {
        return cy.get('.cdk-overlay-container').should('be.empty');
    }, {
        timeout: 5000,
        errorMsg: 'CdkOverlay did not disappear within timeout.'
    });
});
