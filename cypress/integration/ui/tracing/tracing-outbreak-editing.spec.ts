import { COLUMN_LABELS } from '../../../fixtures/column-labels.spec';
import { GRAPH_MENU_ITEMS } from '../../../fixtures/graph-menu-items.spec';

import { assertSchema, combineSchemas, ObjectSchema, SchemaCollection, VersionedSchema, versionSchemas } from '@cypress/schema-tools';
import { LEGEND_ENTRIES } from '../../../fixtures/legend-entries.spec';
import { ENV_CONSTS } from '../../../fixtures/env-constants.spec';

const STATION_COLS_TO_CHECK = [
    COLUMN_LABELS.ID,
    COLUMN_LABELS.SCORE,
    COLUMN_LABELS.OUTBREAK,
    COLUMN_LABELS.WEIGHT,
    COLUMN_LABELS.COMMONLINK
];

const DELIVERY_COLS_TO_CHECK = [
    COLUMN_LABELS.ID,
    COLUMN_LABELS.SCORE,
    COLUMN_LABELS.WEIGHT
];

const PATH_MODEL_ONE_DELIVERY = 'OneDeliveryModel.json';

const POS = {
    Source: { x: 624, y: 285 },
    Target: { x: 624, y: 415 },
    EMPTY_SPACE: { x: 500, y: 300 }
};

const GRAPH_CLIP = { clip: { x: 590, y: 260, width: 100, height: 280 } }; // clip: { x: 67, y: 0, width: 530, height: 363 }};

const assertFclSchema = (fclData: any) => {
    cy.fixture('json-schema').then((jsonSchema) => {
        cy.fixture('example-data').then((exampleData) => {
            const objectSchema: ObjectSchema = {
                version: {
                    major: 1,
                    minor: 1,
                    patch: 2
                },
                schema: {
                    ...jsonSchema
                },
                example: exampleData
            };
            const versionedSchema: VersionedSchema = versionSchemas(objectSchema);
            const schemaCollection: SchemaCollection = combineSchemas(versionedSchema);
            assertSchema(schemaCollection)(
                jsonSchema.title,
                objectSchema.version.major + '.' + objectSchema.version.minor + '.' + objectSchema.version.patch
            )(fclData);
        });
    });
};

describe('Testing Tracing Outbreak Editing ...', function () {

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

    it('empty test', function () {
        // this is needed for some reason, otherwise the test below are failing
    });

    describe('running test set 1 ...', function () {

        before(function () {
            cy.uploadModelData(PATH_MODEL_ONE_DELIVERY, { waitInMs: 1000 });
            cy.matchGraphSnapshot('one-delivery-model-graph', GRAPH_CLIP);
        });

        beforeEach(function () {
            cy.uploadModelData(PATH_MODEL_ONE_DELIVERY, { waitInMs: 1000 });
        });

        it('check mark outbreak instant graph & legend & station filter update', function () {
            const prefix = 'mark-outbreak-target';
            cy.openStationFilterTab(STATION_COLS_TO_CHECK);
            cy.openGraphContextMenuAndSelect(POS.Target, [GRAPH_MENU_ITEMS.MARK_AS_OUTBREAK]);
            cy.matchGraphSnapshot(prefix + '_graph', GRAPH_CLIP);
            cy.matchLegendTextSnapshot(prefix + '_legend');
            cy.matchLegendEntryNodeSymbolSnapshot('symbol-common-link_legend', LEGEND_ENTRIES.COMMON_LINK.name);
            cy.matchLegendEntryNodeSymbolSnapshot('symbol-outbreak_legend', LEGEND_ENTRIES.OUTBREAK.name);
            cy.matchFilterTableTextSnapshot(prefix + '_station-table', true);
            cy.matchFilterTableRowSymbolSnapshot('symbol-common-link_station-table', 'Source');
            cy.matchFilterTableRowSymbolSnapshot('symbol-outbreak-common-link_station-table', 'Target');
        });

        it('check mark outbreak instant delivery filter update', function () {
            const prefix = 'mark-outbreak-target';
            cy.openDeliveryFilterTab(DELIVERY_COLS_TO_CHECK);
            cy.openGraphContextMenuAndSelect(POS.Target, [GRAPH_MENU_ITEMS.MARK_AS_OUTBREAK]);
            cy.matchFilterTableTextSnapshot(prefix + '_delivery-table', true);
        });

        it('check mark outbreak instant station highlighting update', function () {
            const prefix = 'mark-outbreak-target';
            cy.openStationHighlightingTab();
            cy.openGraphContextMenuAndSelect(POS.Target, [GRAPH_MENU_ITEMS.MARK_AS_OUTBREAK]);
            cy.matchHighlightingTableTextSnapshot(prefix + '_station-hrules-colors-shapes', 1);
        });

        it('check mark outbreaks', function () {
            const prefix = 'mark-outbreaks-target-source';
            cy.openStationFilterTab(STATION_COLS_TO_CHECK);
            cy.openGraphContextMenuAndSelect([POS.Target, POS.Source], [GRAPH_MENU_ITEMS.MARK_AS_OUTBREAK]);
            cy.matchGraphSnapshot(prefix + '_graph', GRAPH_CLIP);
            cy.matchFilterTableTextSnapshot(prefix + '_station-table', true);
            // discard graph element selection
            cy.get('@fclGraphView').click(POS.EMPTY_SPACE.x, POS.EMPTY_SPACE.y);
            cy.matchFilterTableRowSymbolSnapshot('symbol-outbreak_station-table', 'Target');
            cy.openDeliveryFilterTab(DELIVERY_COLS_TO_CHECK);
            cy.matchFilterTableTextSnapshot(prefix + '_delivery-table', true);
            cy.openStationHighlightingTab();
            cy.matchHighlightingTableTextSnapshot(prefix + '_station-hrules-colors-shapes', 1);
        });

        it('it should test mark a station as outbreak and download model)', function () {
            cy.openGraphContextMenuAndSelect(POS.Target, [GRAPH_MENU_ITEMS.MARK_AS_OUTBREAK]);
            cy.downloadModelData().then(filePath => {
                cy.readFile(filePath).then(fclData => {
                    // checks json schema
                    assertFclSchema(fclData);
                    expect(fclData).to.have.property('tracing');

                    // checks edited entry
                    const settings = fclData.tracing.nodes.filter((n: any) => n.id === 'Target');
                    expect(settings).to.have.length.of.at.least(1,
                        `Tracing settings not found for station 'Target'.`);
                    expect(settings).to.have.lengthOf(1,
                        `Tracing settings for station 'Target' are not unique.`);

                    expect(settings[0].weight).to.equal(1);
                });
            });

        });
    });

    describe('running test set 2 ...', function () {

        const modelName = PATH_MODEL_ONE_DELIVERY.split('.json')[0];
        const PATH_OF_MODIFIED_MODEL = `${Cypress.env(ENV_CONSTS.TMP_FOLDER)}/${modelName}-outbreaks-source-target`;

        before(function () {
            // creates a temporary model file with outbreaks
            cy.fixture(PATH_MODEL_ONE_DELIVERY).then(data => {
                data.tracing.nodes.forEach((n: { id: string; weight: number }) => {
                    if (n.id === 'Source' || n.id === 'Target') {
                        n.weight = 1;
                    }
                });
                cy.writeFile(PATH_OF_MODIFIED_MODEL, data);
            });
            cy.uploadModelData(PATH_OF_MODIFIED_MODEL, { addFixturesDirPrefix: false, waitInMs: 1000 });
            cy.matchGraphSnapshot('one-delivery-model-outbreaks-source-target_graph', GRAPH_CLIP);
        });

        beforeEach(function () {
            cy.uploadModelData(PATH_OF_MODIFIED_MODEL, { addFixturesDirPrefix: false, waitInMs: 1000 });
        });

        it('check unmark outbreaks instant graph & legend & station filter update', function () {
            const prefix = 'unmark-outbreaks';
            cy.openStationFilterTab(STATION_COLS_TO_CHECK);
            cy.openGraphContextMenuAndSelect([POS.Source, POS.Target], [GRAPH_MENU_ITEMS.UNMARK_AS_OUTBREAK]);
            cy.matchGraphSnapshot(prefix + '_graph', GRAPH_CLIP);
            cy.matchLegendTextSnapshot(prefix + '_legend');
            cy.matchFilterTableTextSnapshot(prefix + '_station-table', true);
        });

        it('check unmark outbreaks instant delivery filter update', function () {
            const prefix = 'unmark-outbreaks';
            cy.openDeliveryFilterTab(DELIVERY_COLS_TO_CHECK);
            cy.openGraphContextMenuAndSelect([POS.Source, POS.Target], [GRAPH_MENU_ITEMS.UNMARK_AS_OUTBREAK]);
            cy.matchFilterTableTextSnapshot(prefix + '_delivery-table', true);
        });

        it('check unmark outbreaks instant station highlighting update', function () {
            const prefix = 'unmark-outbreaks';
            cy.openStationHighlightingTab();
            cy.openGraphContextMenuAndSelect([POS.Source, POS.Target], [GRAPH_MENU_ITEMS.UNMARK_AS_OUTBREAK]);
            cy.matchHighlightingTableTextSnapshot(prefix + '_station-hrules-colors-shapes', 1);
        });

        it('check unmark outbreak', function () {
            const prefix = 'unmark-outbreak-target';
            cy.openStationFilterTab(STATION_COLS_TO_CHECK);
            cy.openGraphContextMenuAndSelect(POS.Target, [GRAPH_MENU_ITEMS.UNMARK_AS_OUTBREAK]);
            cy.matchGraphSnapshot(prefix + '_graph', GRAPH_CLIP);
            cy.matchFilterTableTextSnapshot(prefix + '_station-table', true);
            cy.openDeliveryFilterTab(DELIVERY_COLS_TO_CHECK);
            cy.matchFilterTableTextSnapshot(prefix + '_delivery-table', true);
            cy.openStationHighlightingTab();
            cy.matchHighlightingTableTextSnapshot(prefix + '_station-hrules-colors-shapes', 1);
        });

        it('check clear outbreaks instant graph & legend & station filter update', function () {
            const prefix = 'clear-outbreaks';
            cy.openStationFilterTab(STATION_COLS_TO_CHECK);
            cy.openGraphContextMenuAndSelect(POS.EMPTY_SPACE, [GRAPH_MENU_ITEMS.CLEAR_OUTBREAK_STATIONS]);
            cy.matchGraphSnapshot(prefix + '_graph', GRAPH_CLIP);
            cy.matchLegendTextSnapshot(prefix + '_legend');
            cy.matchFilterTableTextSnapshot(prefix + '_station-table', true);
        });

        it('check clear outbreaks instant delivery filter update', function () {
            const prefix = 'clear-outbreaks';
            cy.openDeliveryFilterTab(DELIVERY_COLS_TO_CHECK);
            cy.openGraphContextMenuAndSelect(POS.EMPTY_SPACE, [GRAPH_MENU_ITEMS.CLEAR_OUTBREAK_STATIONS]);
            cy.matchFilterTableTextSnapshot(prefix + '_delivery-table', true);
        });

        it('check clear outbreaks instant station highlighting update', function () {
            const prefix = 'clear-outbreaks';
            cy.openStationHighlightingTab();
            cy.openGraphContextMenuAndSelect(POS.EMPTY_SPACE, [GRAPH_MENU_ITEMS.CLEAR_OUTBREAK_STATIONS]);
            cy.matchHighlightingTableTextSnapshot(prefix + '_station-hrules-colors-shapes', 1);
        });

    });

});
