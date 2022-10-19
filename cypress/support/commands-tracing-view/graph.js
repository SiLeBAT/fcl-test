Cypress.Commands.add("matchGraphSnapshot", (fileNameOrOptions, options) => {
    cy.get('fcl-schema-graph:not(:hidden),fcl-gis-graph:not(:hidden)').within(() => {
        cy.get('.fcl-graph').matchImageSnapshot(fileNameOrOptions, options);
    });
});

Cypress.Commands.add("matchLegendSnapshot", (fileNameOrOptions, options) => {
    const args = createSnapshotArgs(fileNameOrOptions, options);

    cy.get('fcl-schema-graph:not(:hidden),fcl-gis-graph:not(:hidden)')
        .get('.fcl-graph-legend')
        .get('table')
        .should('be.visible')
        .matchPrefixedImageSnapshot(...args);
});

Cypress.Commands.add("clickGraphMenuButton", (labels) => {
    for (const label of labels) {
        cy.get('.cdk-overlay-pane').eq(-1).get('[data-cy=fcl-graph-menu-item-button]').filter(`:contains("${label}")`).should('have.length', 1).click();
    }
});

Cypress.Commands.add("getLegendData", () => {
    const entries = [];
    cy.get('fcl-schema-graph:not(:hidden),fcl-gis-graph:not(:hidden)').get('.fcl-graph-legend').get('table').within(function () {
        cy.get('tr').each(($row) => {
            const ruleEntry = {};
            cy.wrap($row).within(() => {
                cy.get('[data-cy=fcl-graph-legend-rule-name]').then(($el) => {
                    ruleEntry.name = $el.text().trim();
                });
                cy.extractNodeSymbol().then(symbol => {
                    if (symbol !== null) {
                        ruleEntry.nodeSymbol = symbol;
                    }
                });
                cy.extractEdgeSymbol().then(symbol => {
                    if (symbol !== null) {
                        ruleEntry.edgeSymbol = symbol;
                    }
                });
            });
            entries.push(ruleEntry);
        });
    }).then(() => {
        return entries;
    });
})

Cypress.Commands.add("matchLegendTextSnapshot", fileName => {
    cy.getLegendData().then((data) => {
        cy.matchJsonSnapshot(fileName, data);
    })
})

Cypress.Commands.add("legendHasToContainEntries", expectedEntries => {
    cy.getLegendData().then((observedEntries) => {
        for (const expectedEntry of expectedEntries) {
            const filteredEntries = observedEntries.filter(observedEntry => observedEntry.name === expectedEntry.name);
            if (filteredEntries.length === 1) {
                for (const key of Object.keys(expectedEntry)) {
                    expect(expectedEntry[key], `Expected entry does `).to.eq(observedEntries[0][key]);
                }
            }
        }
    })
})

Cypress.Commands.add("legendMayNotContainEntries", entryNames => {
    cy.getLegendData().then((data) => {
        for (const entryName of entryNames) {
            if (data.findIndex(rule => rule.name === entryName) >= 0) {
                throw new Error(`Unexpected entry '${entryName}' in legend.`);
            }
        }
    })
});

Cypress.Commands.add("selectGraphElements", positions => {
    const graph = cy.get('fcl-schema-graph:not(:hidden),fcl-gis-graph:not(:hidden)');
    positions.forEach((p, i) => graph.click(p.x, p.y, { shiftKey: i > 0 }));
})

Cypress.Commands.add("openGraphContextMenu", pos => {
    const positions = Array.isArray(pos) ? pos : [pos];
    if (positions.length > 1) {
        cy.selectGraphElements(positions);
    }

    cy.get('fcl-schema-graph:not(:hidden),fcl-gis-graph:not(:hidden)').rightclick(positions[0].x, positions[0].y);
})

Cypress.Commands.add("openGraphContextMenuAndSelect", (pos, menuItems) => {
    const positions = Array.isArray(pos) ? pos : [pos];
    cy.openGraphContextMenu(positions)
    cy.clickGraphMenuButton(menuItems);
})

Cypress.Commands.add("matchLegendEntryNodeSymbolSnapshot", (fileName, entryName) => {
    cy.getLegendData().then(entries => {
        const entryIndex = entries.findIndex(entry => entry.name === entryName);
        if (entryIndex < 0) {
            throw new Error(`Legend entry '${entryName}' not found.`);
        }

        cy.get('fcl-schema-graph:not(:hidden),fcl-gis-graph:not(:hidden)').get('.fcl-graph-legend').get('table').within(function () {
            cy.get('tr').eq(entryIndex).within(function () {
                cy.get('fcl-node-symbol-view svg').within(function () {
                    cy.root().matchImageSnapshot(fileName);
                });
            });
        });
    });
})

Cypress.Commands.add("matchLegendEntryEdgeSymbolSnapshot", (fileName, entryName) => {
    cy.getLegendData().then(entries => {
        const entryIndex = entries.findIndex(entry => entry.name === entryName);
        if (entryIndex < 0) {
            throw new Error(`Legend entry '${entryName}' not found.`);
        }

        cy.get('fcl-schema-graph:not(:hidden),fcl-gis-graph:not(:hidden)').get('.fcl-graph-legend').get('table').within(function () {
            cy.get('tr').eq(entryIndex).within(function () {
                cy.get('fcl-edge-symbol-view svg').within(function () {
                    cy.root().matchImageSnapshot(fileName);
                });
            });
        });
    });
})
