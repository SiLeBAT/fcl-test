import { CONFIGURATION_TABS } from '../../fixtures/configuration_tabs.spec';
import { COLUMN_LABELS } from '../../fixtures/column-labels.spec';

Cypress.Commands.add("matchFilterTableSnapshot", (fileNameOrOptions, options) => {
    cy.get('ngx-datatable').matchImageSnapshot(fileNameOrOptions, options);
});

Cypress.Commands.add("openConfigurationSideBar", () => {
    cy.get('fcl-configuration', { timeout: 0 }).then($sidebar => {
        if (!$sidebar.is(':visible')){
            cy.get('[data-cy=fcl-toggle-conf-sidebar-button]').click();
        }
    });
});

Cypress.Commands.add("openFilterTab", () => {
    cy.openConfigurationSideBar();
    cy.get('fcl-configuration > fcl-tab-layout > mat-tab-group > mat-tab-header .mat-tab-label')
        .eq(CONFIGURATION_TABS.FILTER.index)
        .should('have.text', CONFIGURATION_TABS.FILTER.label)
        .then(($filterTabLabel) => {
        if (!$filterTabLabel.hasClass('mat-tab-label-active')) {
            cy.wrap($filterTabLabel).click();
        }
    });
});

Cypress.Commands.add("openHighlightingTab", () => {
    cy.openConfigurationSideBar();
    cy.get('fcl-configuration > fcl-tab-layout > mat-tab-group > mat-tab-header .mat-tab-label')
        .eq(CONFIGURATION_TABS.HIGHLIGHTING.index)
        .should('have.text', CONFIGURATION_TABS.HIGHLIGHTING.label)
        .then(($highlightingTabLabel) => {
        if (!$highlightingTabLabel.hasClass('mat-tab-label-active')) {
            cy.wrap($highlightingTabLabel).click();
        }
    });
});

Cypress.Commands.add("openStationHighlightingTab", () => {
    cy.openHighlightingTab();
    cy.get('fcl-highlighting fcl-tab-layout > mat-tab-group > mat-tab-header .mat-tab-label')
        .eq(CONFIGURATION_TABS.STATIONS.index)
        .should('have.text', CONFIGURATION_TABS.STATIONS.label)
        .then(($stationHighlightingTabLabel) => {
        if (!$stationHighlightingTabLabel.hasClass('mat-tab-label-active')) {
            cy.wrap($stationHighlightingTabLabel).click();
        }
    });
});

Cypress.Commands.add("openStationFilterTab", (columns, putIDInFront) => {
    cy.openFilterTab();
    cy.get('fcl-filter > fcl-tab-layout > mat-tab-group > mat-tab-header .mat-tab-label')
        .eq(CONFIGURATION_TABS.STATIONS.index)
        .should('have.text', CONFIGURATION_TABS.STATIONS.label)
        .then(($stationFilterTabLabel) => {
        if (!$stationFilterTabLabel.hasClass('mat-tab-label-active')) {
            cy.wrap($stationFilterTabLabel).click();
        }
        if (columns !== undefined) {
            cy.showFilterColumns(columns, putIDInFront);
        }
    });
});

Cypress.Commands.add("openDeliveryFilterTab", (columns, putIDInFront) => {
    cy.openFilterTab();
    cy.get('fcl-filter > fcl-tab-layout > mat-tab-group > mat-tab-header .mat-tab-label')
        .eq(CONFIGURATION_TABS.DELIVERIES.index)
        .should('have.text', CONFIGURATION_TABS.DELIVERIES.label)
        .then(($deliveryFilterTabLabel) => {
        if (!$deliveryFilterTabLabel.hasClass('mat-tab-label-active')) {
            cy.wrap($deliveryFilterTabLabel).click();
        }
        if (columns !== undefined) {
            cy.showFilterColumns(columns, putIDInFront);
        }
    });
});

Cypress.Commands.add("showFilterColumns", (labels, putIDInFront) => {
    if (putIDInFront!==false && labels.indexOf('ID')>=0 && labels.length > 1) {
        cy.showFilterColumns(['ID'], false);
        cy.showFilterColumns(labels, false);
    } else {
        cy.get('.mat-tab-body-active .mat-tab-body-active .fcl-more-columns-button').eq(0).click({ force: true });
        cy.get('fcl-dialog-select').within(function () {
            // uncheck all checkboxes
            cy.get(':checkbox').uncheck({ force: true });

            cy.get('mat-checkbox .mat-checkbox-label').then(($elements) => {
                const availableColumns = Cypress.$.makeArray($elements).map((el) => el.innerText.trim())

                debugger;
                for(const label of labels) {
                    const columnIndex = availableColumns.indexOf(label);
                    if (columnIndex<0) {
                        throw new Error(`Column '${label}' is not available.`);
                    }
                    cy.wrap($elements[columnIndex]).prev().click({ force: true });
                }

            });
        });
        cy.get('.mat-dialog-actions button').filter(':contains("OK")').click();
        cy.waitUntilCdkOverlayDisappeared();
    }
});

Cypress.Commands.add("getFilterTableData", () => {
    const headers = [];
    cy.get('ngx-datatable datatable-header-cell').each(($el,index) => {
        if (index <= 1) {
            const $els = $el.find('fcl-symbol-header-cell-view');
            if ($els.length > 0) {
                headers.push('symbol');
                return;
            }
        } else if (index === 2) {
            const $els = $el.find('fcl-visibilityfilter-header-cell-view');
            if ($els.length > 0) {
                headers.push('visibility');
                return;
            }
        }
        const $spans = $el.find('.fcl-header-sort-span');
        const defaultColumnName = 'column' + index;
        if ($spans.length > 0) {
            headers.push($spans.get(0).innerText.trim() || defaultColumnName);
        } else {
            headers.push(defaultColumnName);
        }
    });

    const rows = [];
    cy.get('ngx-datatable datatable-body-row').then(($rows) => {
        Cypress.$.each($rows, (index, row) => {
            cy.wrap(row).within(() => {
                cy.get('datatable-body-cell').then(($cells) => {
                    const cells = Cypress.$.makeArray($cells).map((cell) => cell.innerText.trim());
                    cy.wrap($cells.eq(1)).extractSymbol(false).then((symbol) => {
                        if (symbol !== null) {
                            cells[1] = symbol;
                        }
                        rows.push(Object.fromEntries(new Map(cells.map((x, i) => [headers[i], x]))));
                    });
                });
            });
        })
    }).then(() => {
        return { headers: headers, rows: rows };
    })
})

Cypress.Commands.add("getHighlightingTableData", () => {
    const highlightingLists = [];
    cy.get('fcl-highlighting-rules-list-view').each($list => {
        const rows = [];
        cy.wrap($list).within(() => {
            cy.root().get('.fcl-rules-list-item').each($row => {
                const row = {};
                cy.wrap($row).within(() => {
                    cy.get('.fcl-rules-list-item-name').then(($nameDiv) => {
                        row.name = $nameDiv.text().trim();
                    });
                    if ($row.find('.fcl-rules-list-item-symbol').length) {
                        cy.root().get('.fcl-rules-list-item-symbol').extractSymbol().then(symbol => {
                            if (symbol !== null) {
                                row.symbol = symbol;
                            }
                        });
                    }

                    cy.get('.fcl-rules-list-item-counts').then(($countsDiv) => {
                        row.counts = $countsDiv.text().trim();
                    });
                }).then(() => {
                    rows.push(row);
                });
            });
        }).then(() => {
            highlightingLists.push(rows);
        });
    }).then(() => {
        return highlightingLists;
    });
})

Cypress.Commands.add("matchFilterTableTextSnapshot", (fileName, rowsOnly) => {
    rowsOnly = rowsOnly === undefined ? false : rowsOnly;
    cy.getFilterTableData().then((data) => {
        if (rowsOnly) {
            data = data.rows;
        }
        cy.matchJsonSnapshot(fileName, data);
    })
})

Cypress.Commands.add("matchHighlightingTableTextSnapshot", (fileName, index) => {
    cy.getHighlightingTableData().then((data) => {
        data = index === undefined ? data : data[index];
        cy.matchJsonSnapshot(fileName, data);
    })
})

Cypress.Commands.add("matchFilterTableRowSymbolSnapshot", (fileName, id) => {
    cy.getFilterTableData().then(data => {
        const symbolColumnIndex = data.headers.indexOf('symbol');
        if (symbolColumnIndex < 0) {
            throw new Error(`Symbol column not found.`);
        }
        const idColumnIndex = data.headers.indexOf(COLUMN_LABELS.ID);
        if (idColumnIndex < 0) {
            throw new Error(`Column with label ${COLUMN_LABELS.ID} not found.`);
        }
        const rowIndex = data.rows.findIndex(row => row.ID === id);
        if (rowIndex < 0) {
            throw new Error(`Row with ID '${id}' not found.`);
        }

        cy.get('ngx-datatable datatable-body-row').eq(rowIndex).within(() => {
            cy.get('datatable-body-cell').eq(symbolColumnIndex).within(() => {
                cy.get('svg').within(() => {
                    cy.root().matchImageSnapshot(fileName);
                })
            });
        });
    });
})
