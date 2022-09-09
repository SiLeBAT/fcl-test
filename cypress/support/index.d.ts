/// <reference types="Cypress" />

import { Credentials } from './test.model';

interface MatchSnapshotOptions {
    clip?: { x: number; y: number; width: number; height: number };
}

interface FilterTableData {
    headers: string[];
    rows: Record<string, string>[];
}

type HighlightingTableData = Record<string, string>[];

interface Position {
    x: number;
    y: number;
}

declare global {
//declare
namespace Cypress {
  interface Chainable {
    /**
     * Custom command to log user into the front-end.
     * @example cy.login()
     */
    login(credentials: Credentials): Chainable<Element>;

    waitUntilCdkOverlayDisappeared(): void;

    getHighlightingTableData(): Chainable<HighlightingTableData[]>;
    getFilterTableData(): Chainable<FilterTableData>;
    openFilterTab(): void;
    openHighlightingTab(): void;
    openStationFilterTab(columns?: string[], putIDInFront?: boolean): void;
    openStationHighlightingTab(): void;
    openDeliveryFilterTab(columns?: string[], putIDInFront?: boolean): void;
    showFilterColumns(labels: string[]): void;
    matchImageSnapshot(fileName?: string, options?: MatchSnapshotOptions): void;
    matchGraphSnapshot(fileName?: string, options?: MatchSnapshotOptions): void;
    matchGraphSnapshot(options?: MatchSnapshotOptions): void;
    matchLegendSnapshot(fileName?: string, options?: MatchSnapshotOptions): void;
    matchLegendSnapshot(options?: MatchSnapshotOptions): void;
    matchLegendTextSnapshot(fileName: string): void;
    matchLegendEntryNodeSymbolSnapshot(fileName: string, entryName: string): void;
    matchLegendEntryEdgeSymbolSnapshot(fileName: string, entryName: string): void;

    matchFilterTableSnapshot(fileName?: string, options?: MatchSnapshotOptions): void;
    matchFilterTableSnapshot(options?: MatchSnapshotOptions): void;
    matchFilterTableTextSnapshot(fileName: string, rowsOnly?: boolean): void;
    matchFilterTableRowSymbolSnapshot(fileName: string, id: string): void;
    matchHighlightingTableTextSnapshot(fileName: string, index?: number): void;

    clickGraphMenuButton(labels: string[]): void;

    downloadModelData(): Chainable<string>;
    uploadModelData(fileName: string, wait?: number): void;
    loadExampleData(entry: string | string[], waitInMs?: number): void;

    selectGraphElements(positions: Position[]): void;
    openGraphContextMenuAndSelect(pos: Position | Position[], menuItems: string[]): void;
  }
}
}
