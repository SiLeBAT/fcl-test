Cypress.Commands.add("uploadModelData", (filepath, waitInMs = 200) => {
    cy.get('fcl-page-header').within(function () {
        cy.get('[data-cy=fcl-upload-model-fileinput]').selectFile('cypress/fixtures/' + filepath, { force: true });
        if (waitInMs > 0) {
            cy.wait(waitInMs);
        }
    });
});

Cypress.Commands.add("downloadModelData", () => {
    const downloadsFolder = Cypress.config('downloadsFolder');
    cy.task('getFilesInFolder', downloadsFolder).then(files => {
        if (files === null) {
            throw new Error(`Could not read files in folder '${downloadsFolder}'`)
        }
        const oldDownloadFiles = files;

        cy.get('[data-cy=fcl-download-model-button]').click();

        cy.wait(1000);

        cy.task('getFilesInFolder', downloadsFolder).then(files => {
            if (files === null) {
                throw new Error(`Could not read files in folder '${downloadsFolder}'`)
            } else {
                const newFiles = files.filter(f => oldDownloadFiles.indexOf(f) < 0);

                if (newFiles.length === 1) {
                    return downloadsFolder + '/' + newFiles[0];
                } else {
                    throw new Error(`Found ${newFiles.length} new downloaded files instead of 1.`)
                }
            }
        });
    });
});

Cypress.Commands.add("extractSymbol", () => {
    cy.extractNodeSymbol().then(symbol => {
        if (symbol !== null) {
            return symbol;
        }
        cy.extractEdgeSymbol().then(symbol => {
            return symbol;
        });
    });
});

Cypress.Commands.add("extractNodeSymbol", () => {
    cy.root().then($el => {
        const $els = $el.find('fcl-node-symbol-view svg');
        if ($els.length > 0) {
            const $svg = $els.eq(0);
            const $obj = $svg.children(':last');
            return $obj.attr('data-cy-shape') + ':' + $obj.attr('fill');
        }
        return null;
    })
});

Cypress.Commands.add("extractEdgeSymbol", () => {
    cy.root().then($el => {
        const $els = $el.find('fcl-edge-symbol-view svg');
        if ($els.length > 0) {
            const $svg = $els.eq(0);
            return 'edge:' +  $svg.children(':first').attr('stroke');
        }
        return null;
    })
});

Cypress.Commands.add("loadExampleData", (entry, waitInMs = 200) => {
    entry = typeof entry === 'string' ? [entry] : entry;

    cy.get('fcl-page-header').within(function () {
        cy.get('.fcl-action-container').within(function () {
            cy.get('[data-cy=fcl-load-example-button]').click();
        });
    });

    for (const label of entry) {
        cy.get('.cdk-overlay-pane').eq(-1)
            .get('.mat-menu-item')
            .filter(`:contains("${label}")`)
            .should('have.length', 1)
            .click();
    }
    if (waitInMs) {
        cy.wait(waitInMs);
    }
});
