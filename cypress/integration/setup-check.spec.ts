/// <reference types="Cypress" />

describe('Checks Basic Web App Availability', function () {
    beforeEach(function () {
        cy.fixture('ui-routes.json').as('paths');
        cy.fixture('users.json').as('users');
    });

    it('opens web app', function () {
        cy.visit(this.paths.root);
    });

    it('checks ui bypassing login', function () {
        cy.login(this.users[0]);
    });
});
