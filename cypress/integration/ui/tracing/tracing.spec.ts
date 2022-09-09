import { EXAMPLE_MENUE_ENTRIES } from '../../../fixtures/example-data-entries.spec';

const VIEWPORT_SIZE = { width: 800, height: 700 };

describe('Testing the TracingViewGraph of the app', function () {

    beforeEach(function () {
        cy.fixture('users.json').as('users').then(
            (users) => {
                cy.login(users[0]);
                cy.fixture('ui-routes.json').as('paths').then(
                    (paths) => {
                        cy.visit(paths.tracing);
                        cy.get('fcl-page-header').as('fclHeader');
                        cy.get('fcl-page-body').as('fclBody');
                        cy.get('.fcl-graph-container').as('fclGraphContainer');
                        cy.get('fcl-graph-view').eq(0).as('fclGraphView');
                    }
                );
            }
        );
    });

    it('should test the default view (empty graph)', function () {
        it('should contain zoom controls', function () {
            cy.get('@fclGraphView').within(function () {
                cy.get('.zoom-reset').should('be.visible');
                cy.get('.zoom-in').should('be.visible');
                cy.get('.zoom-out').should('be.visible');
                cy.get('.zoom-slider').should('be.visible');
            });
        });

        it('should contain fcl logo', function () {
            cy.get('@fclGraphView').within(function () {
                cy.get('.fcl-created-image').should('be.visible');
            });
        });
    });

    describe('should test load example feature ...', function () {
        beforeEach(function () {
            // reduce size
            cy.viewport(VIEWPORT_SIZE.width, VIEWPORT_SIZE.height);
        });

        it('header should contain load example button', function () {
            cy.get('@fclHeader').within(function () {
                cy.get('[data-cy=fcl-load-example-button]').should('be.visible');
            });
        });

        it('it should load & show the example data graph', function () {
            cy.loadExampleData(EXAMPLE_MENUE_ENTRIES.EXAMPLE_DATA, 500);
            cy.matchGraphSnapshot('ExampleData_graph');
        });

        it('it should load & show the scenario 1 graph', function () {
            cy.loadExampleData([EXAMPLE_MENUE_ENTRIES.BABY_TEA, EXAMPLE_MENUE_ENTRIES.SCENARIO_1], 500);
            cy.matchGraphSnapshot('BabyTea-Scen1_graph');
        });

        it('it should load & show the scenario 2 graph', function () {
            cy.loadExampleData([EXAMPLE_MENUE_ENTRIES.BABY_TEA, EXAMPLE_MENUE_ENTRIES.SCENARIO_2], 500);
            cy.matchGraphSnapshot('BabyTea-Scen2_graph');
        });

        it('it should load & show the scenario 3 graph', function () {
            cy.loadExampleData([EXAMPLE_MENUE_ENTRIES.BABY_TEA, EXAMPLE_MENUE_ENTRIES.SCENARIO_3], 3000);
            cy.matchGraphSnapshot('BabyTea-Scen3_graph');
        });
    });

    describe('Testing upload model feature ...', function () {
        beforeEach(function () {
            // reduce size
            cy.viewport(VIEWPORT_SIZE.width, VIEWPORT_SIZE.height);
        });

        it('header should contain upload data button', function () {
            cy.get('@fclHeader').within(function () {
                cy.get('[data-cy=fcl-upload-model-button]')
                    .should('be.visible')
                    .should('contain', 'Upload Data')
                    .find('mat-icon').should('contain', 'file_upload');
            });
        });

        it('should upload a model', function () {
            cy.uploadModelData('example-data.json', 1000);
            cy.matchGraphSnapshot('uploaded-model_graph');
        });
    });

    describe('Testing download model feature ...', function () {
        it('header should contain download data button', function () {
            cy.get('@fclHeader').within(function () {
                cy.get('[data-cy=fcl-download-model-button]')
                    .should('be.visible')
                    .should('contain', 'Download Data')
                    .find('mat-icon').should('contain', 'file_download');
            });
        });

        it('should download a model', function () {
            cy.uploadModelData('example-data.json');
            cy.downloadModelData().then(path => {
                cy.readFile(path).then(observedData => {
                    cy.fixture('example-data.json').then(expectedData => {
                        expect(observedData).to.deep.equal(expectedData);
                    });
                });
            });
        });
    });
});
