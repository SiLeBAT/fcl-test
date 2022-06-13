/// <reference types="Cypress" />

describe('Use-cases Login Page', function () {
    beforeEach(function () {
        cy.viewport(1400, 1000);
        cy.fixture('ui-routes.json').as('paths')
            .then(
                (paths) => cy.visit(paths.root)
            );
        cy.fixture('api-routes.json').as('routes');
        cy.fixture('success-responses.json').as('successResponses');
        cy.fixture('users.json').as('users');

    });

    describe('User1 login', function () {
        beforeEach(() => {
            cy.get('input[name="email"]').as('emailInput');
            cy.get('input[name="password"]').as('passwordInput');
            cy.get('button[type=submit]').as('loginButton');
        });


        const fillOutLoginForm = user => {
            cy.get('@emailInput').type(user.email);
            cy.get('@passwordInput').type(user.password);
        };

        it('should allow User1 to log in and out again, clearing local storage', function () {
            fillOutLoginForm(this.users[0]);
            cy.get('@loginButton').click();
            cy.url()
                .should('include', this.paths.dashboard)
                .then(() => {
                    const userJSON = window.localStorage.getItem('currentUser');
                    expect(userJSON).to.not.equal(null);
                    // tslint:disable-next-line: no-non-null-assertion
                    const user = JSON.parse(userJSON);
                    expect(user.firstName).to.equal('User1');
                });

            cy.get('fcl-page-header').within(function () {
                cy.get('.fcl-avatar-item')
                    .find('button')
                    .click({ force: true });
            });

            cy.get('.mat-menu-content').within(function () {
                cy.contains('a', 'Logout').click();
            });

            cy.url()
                .should('include', this.paths.login)
                .then(() =>
                    expect(window.localStorage.getItem('currentUser')).to.equal(
                        null
                    )
                );
        });
    });
});
