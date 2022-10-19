/// <reference types="Cypress" />
import { ENV_CONSTS } from '../../../fixtures/env-constants.spec';
import { User } from '../../../support/test.model';

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


        const fillOutLoginForm = (user: User) => {
            cy.get('@emailInput').type(user.email);
            cy.get('@passwordInput').type(user.password);
        };

        const logoutFromFcl = (uiPath: string) => {
            cy.get('fcl-page-header').within(function () {
                cy.get('.fcl-avatar-item')
                    .find('button')
                    .click({ force: true });
            });

            cy.get('.mat-menu-content').within(function () {
                cy.contains('a', 'Logout').click();
            });

            cy.url()
                .should('include', uiPath)
                .then(() =>
                    expect(window.localStorage.getItem('currentUser')).to.equal(
                        null
                    )
                );
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
                    const user = JSON.parse(userJSON as string);
                    expect(user.firstName).to.equal('User1');
                });

            logoutFromFcl(this.paths.login);
        });

        it('should show the "The Data Protection Declaration has been changed" dialog when log in', function () {
            cy.skipOn(Cypress.env(ENV_CONSTS.SKIP_RUN_ONCE_TESTS) === true);
            // perform this test only on first cypress run because this test updates the gdprDate and thus
            // makes this test failing on additional runs
            fillOutLoginForm(this.users[6]);
            cy.get('@loginButton').click();
            cy.url()
                .should('include', this.paths.dashboard)
                .then(() => {
                    cy.get('div.cdk-overlay-pane').within(() => {
                        cy.get('form.fcl-gdpr-agreement-dialog')
                            .should('contain', 'The Data Protection Declaration has been changed');
                        cy.get('mat-checkbox.mat-checkbox').as('checkbox');
                        cy.get('button.mat-button-disabled').as('continueButton');
                        cy.get('@continueButton').should('be.disabled');
                        cy.get('@checkbox').click();
                        cy.get('@continueButton').should('be.enabled');
                        cy.get('@continueButton').click();
                    });
                });
            cy.get('mat-card-content.mat-card-content').as('tracingViewButton');

            cy.get('@tracingViewButton')
                .should('contain', 'Tracing View');

            logoutFromFcl(this.paths.login);

            fillOutLoginForm(this.users[6]);
            cy.get('@loginButton').click();
            cy.url()
                .should('include', this.paths.dashboard)
                .then(() => {
                    cy.get('div.cdk-overlay-pane').should('not.exist');
                    cy.get('@tracingViewButton')
                        .should('contain', 'Tracing View');
                });
        });
    });
});
