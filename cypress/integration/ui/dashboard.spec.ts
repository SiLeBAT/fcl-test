/// <reference types="Cypress" />

describe('Testing the Dashboard of the app', function () {
    let str;

    beforeEach(function () {
        cy.fixture('users.json').as('users').then(
            (users) => {
                cy.login(users[0]);
                cy.fixture('ui-routes.json').as('paths').then(
                    (paths) => {
                        cy.visit(paths.dashboard);
                        cy.get('fcl-page-header').as('fclHeader');
                        cy.get('fcl-page-body').as('fclBody');
                    }
                );
            }
        );
    });

    it('should have a visible functioning link to tracing view', function () {
        cy.get('@fclBody').within(function () {
            cy.get('[data-cy=fcl-dashboard-tracing-view-button]')
                .should('contain', 'Tracing View')
                .click({ force: true});
        });
        cy.url().should('contain', this.paths.tracing);
    });

    it('should contain visible funding source', function () {
        cy.get('@fclBody').within(function () {
            cy.get('.fcl-funding-box').should('contain', 'funding')
                .should('be.visible');
        });
    });
});
