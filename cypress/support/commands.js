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

Cypress.Commands.add("matchPrefixedImageSnapshot", (fileNameOrOptions, options) => {
    const defaultOptions = {
        capture: 'viewport',
        customDiffConfig: { },
        comparisonMethod: 'ssim'
    };
    options = options !== undefined ? options :
        typeof fileNameOrOptions === 'object' ? fileNameOrOptions :
        {};
    options = {
        ...defaultOptions,
        ...options
    };

    const snapshotPrefix = Cypress.env('add-image-snapshot-prefix');
    const fileName = typeof fileNameOrOptions === 'string' ? (snapshotPrefix + fileNameOrOptions) : undefined;

    const args = fileName === undefined ? [options] : [fileName, options];

    cy.matchImageSnapshot(...args);
});

Cypress.Commands.add("matchJsonSnapshot", (fileName, data) => {
    const folders = Cypress.spec.relative.split(/[\\\/]/);
    folders[1] = 'snapshots';
    const filePath = folders.join('/') + '/' + fileName + '.json';
    cy.task('readFileMaybe', filePath).then((textOrNull) => {
        if (textOrNull !== null) {
            const refData = JSON.parse(textOrNull);
            expect(data, 'Snapshot does not match data in \'' + fileName + '\'').to.deep.eq(refData);

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
