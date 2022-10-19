import { Octokit } from '@octokit/core';
import {format as prettyFormat} from 'pretty-format'; // ES2015 modules
import { components } from '@octokit/openapi-types/types';
import ProxyAgent from 'proxy-agent';
import * as os from 'os';
import { delay, downloadFile, getTimeSpanString, repeatUntil } from './utils';


const DEFAULT_STATUS_QUERY_INTERVAL_IN_MS = 30000;
const DEFAULT_WAIT_FOR_COMPLETION_TIMEOUT_IN_MS = 3600000;
const DEFAULT_WAIT_FOR_FIRST_RUN_IDENTIFICATION_IN_MS = 5000;
const DEFAULT_RUN_IDENTIFICATION_INTERVAL_IN_MS = 10000;
const DEFAULT_RUN_IDENTIFICATION_TIMEOUT_IN_MS = 60000;

interface TimingOptions {
    waitForFirstRunIdentificationInMs: number;
    runIdentificationTimeoutInMs: number;
    runIdentificationIntervalInMs: number;
    statusQueryIntervalInMs: number;
    waitForCompletionTimeoutInMs: number;
}

type Payload = Record<string, string>;

export interface RepoOptions {
    owner: string;
    repo: string;
}

export interface WorkflowOptions {
    ref: string;
    workflow_id: string | number;
}

// Enums according to
// https://docs.github.com/en/rest/guides/getting-started-with-the-checks-api
enum StatusType {
    QUEUED = 'queued',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed'
}

export enum ConclusionType {
    ACTION_REQUIRED = 'action_required',
    CANCELED = 'cancelled',
    TIMED_OUT = 'timed_out',
    NEUTRAL = 'neutral',
    SUCCESS = 'success',
    FAILURE = 'failure',
    STARTUP_FAILURE = 'startup_failure'
}

export enum LogLevelType {
    INFO = 'info',
    DEFAULT = 'default'
}


export type JobData = components['schemas']['job'];
export type RunData = components['schemas']['workflow-run'];
export type ArtifactData = components['schemas']['artifact'];
export type WorkflowData = components['schemas']['workflow'];

export interface RunResult {
    conclusion: ConclusionType;
    run_html_url: string;
    artifacts: {
        id: number;
        name: string;
        url: string;
    }[];
}

export class GithubApiWrapper {
    private octokit: Octokit;
    logLevel = LogLevelType.DEFAULT;

    constructor(private repoOptions: RepoOptions, token: string) {
        this.octokit = new Octokit({
            auth: token,
            userAgent: 'octokit-wrapper',
            request: {
                agent: new ProxyAgent()
            }
        });
    }

    async dispatchWorkflow(workflowOptions: WorkflowOptions, payload?: Payload | undefined): Promise<void> {
        this.logInfoLn(`Dispatching workflow ${workflowOptions.workflow_id}`+ (
            payload !== undefined ?
                ` with payload '${prettyFormat(payload)}' ...` :
                ' ...'
        ));

        await this.octokit.request(
            'POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches',
            {
                ...this.repoOptions,
                ...workflowOptions,
                inputs: payload
            }
        ).catch((err) => {
            this.logErr('Dispatch failed.');
            throw err;
        });
        return;
    }

    private getTimingOptions(options: Partial<TimingOptions> | undefined): TimingOptions {
        return {
            waitForFirstRunIdentificationInMs: DEFAULT_WAIT_FOR_FIRST_RUN_IDENTIFICATION_IN_MS,
            runIdentificationIntervalInMs: DEFAULT_RUN_IDENTIFICATION_INTERVAL_IN_MS,
            runIdentificationTimeoutInMs: DEFAULT_RUN_IDENTIFICATION_TIMEOUT_IN_MS,
            statusQueryIntervalInMs: DEFAULT_STATUS_QUERY_INTERVAL_IN_MS,
            waitForCompletionTimeoutInMs: DEFAULT_WAIT_FOR_COMPLETION_TIMEOUT_IN_MS,
            ...(options || {})
        };
    }

    async dispatchWorkflowAndWaitForResult(
        workflowOptions: WorkflowOptions,
        payload?: Payload,
        timingOptions?: Partial<TimingOptions>
    ): Promise<RunResult> {
        const processedTimingOptions = this.getTimingOptions(timingOptions);
        const oldRunIds = (await this.getRuns(workflowOptions)).map(run => run.id);
        await this.dispatchWorkflow(workflowOptions, payload);
        const runId = (await this.waitForDispatchedRun(workflowOptions, oldRunIds, processedTimingOptions)).id;
        const run = await this.waitForCompletedRun(runId, processedTimingOptions);
        return this.getRunResult(run);
    }

    private async getDispatchedRun(
        workflowOptions: WorkflowOptions,
        knownPreviousRunIds: number[]
    ): Promise<RunData | null> {
        const runs = await this.getRuns(workflowOptions);
        let result: RunData | null = null;
        for (const run of runs) {
            if (knownPreviousRunIds.includes(run.id)) {
                // sort order of runs: newest at first to oldest at last
                break;
            }
            if (run.run_attempt !== undefined && run.run_attempt > 1) {
                // we are only interested in the first attempt
                continue;
            }

            result = run;
        }
        return result;
    }

    private async waitForDispatchedRun(
        workflowOptions: WorkflowOptions,
        oldRunIds: number[],
        options: TimingOptions
    ): Promise<RunData> {
        this.logInfoLn('Searching for dispatched run ...');
        await delay(options.waitForFirstRunIdentificationInMs);
        const result = await repeatUntil(
            async () => this.getDispatchedRun(workflowOptions, oldRunIds),
            {
                intervalInMs: options.runIdentificationIntervalInMs,
                timeoutInMs: options.runIdentificationTimeoutInMs,
                timeoutMsg: `Timeout while waiting for dispatched run (Timeout: ${getTimeSpanString(options.runIdentificationTimeoutInMs)}).`
            }
        );

        this.logInfoLn(`Dispatched run found (run-id: ${result.id})`);
        return result;
    }

    private async waitForCompletedRun(runId: number, options: TimingOptions): Promise<RunData> {
        this.logInfoLn(`Waiting for run completion ...`);

        const result = await repeatUntil(
            async () => this.getRun(runId),
            {
                intervalInMs: options.statusQueryIntervalInMs,
                timeoutInMs: options.waitForCompletionTimeoutInMs,
                timeoutMsg: `Timeout while waiting for run completion (Timeout: ${getTimeSpanString(options.waitForCompletionTimeoutInMs)}).`
            },
            (run: RunData) => run.status === StatusType.COMPLETED
        );
        this.logInfoLn(`Run completed.`);
        return result;
    }

    private logErr(msg: string): void {
        this.logInfoLn(msg);
    }
    private logInfo(msg: string): void {
        if (this.logLevel === LogLevelType.INFO) {
            process.stdout.write(msg);
        }
    }

    private logInfoLn(msg: string): void {
        this.logInfo(msg + '\n');
    }

    async getRuns(workflowOptions: WorkflowOptions): Promise<RunData[]> {
        // Be aware that the runs result contains possibly not all runs
        // because the amount of results returned depends on the per_page setting
        // the default for this setting is 30
        // But we are only interested in the recently started runs
        // and don't expect a high frequency of workflow_dispatch events

        return (await this.octokit.request(`GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs?branch=${workflowOptions.ref}&event=workflow_dispatch`, {
            owner: this.repoOptions.owner,
            repo: this.repoOptions.repo,
            ref: workflowOptions.ref,
            workflow_id: workflowOptions.workflow_id
        }).catch((err) => {
            this.logErr('GET workflow runs failed');
            throw err;
        })).data.workflow_runs;
    }

    private async getJobs(runId: number): Promise<JobData[]> {
        return (await this.octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs', {
            owner: this.repoOptions.owner,
            repo: this.repoOptions.repo,
            run_id: runId
        }).catch((err) => {
            this.logErr('GET jobs failed');
            throw err;
        })).data.jobs;
    }

    private async getRun(runId: number): Promise<RunData> {
        const run = (await this.octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}', {
            owner: this.repoOptions.owner,
            repo: this.repoOptions.repo,
            run_id: runId
        }).catch(err => {
            this.logErr('GET run failed');
            throw err;
        })).data;
        this.logInfoLn(`Run status: ${run.status}, conclusion: ${run.conclusion}`);
        return run;
    }

    async getRunResult(run: RunData): Promise<RunResult> {
        const jobs = await this.getJobs(run.id);
        const artifacts = await this.getArtifacts(run.id);
        const result = {
            conclusion: run.conclusion as ConclusionType,
            run_html_url: run.html_url,
            artifacts: artifacts.map(a => ({ id: a.id, name: a.name, url: a.archive_download_url}))
        };
        return result;
    }

    private async getArtifacts(runId: number): Promise<ArtifactData[]> {
        this.logInfoLn(`Get Artifacts for id ${runId} ...`);
        return (await this.octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts', {
            ...this.repoOptions,
            run_id: runId
        }).catch(err => {
            this.logErr('GET artifacts failed');
            throw err;
        })).data.artifacts;
    }

    async downloadArtifacts(artifactIds: number[], targetDir?: string): Promise<string[]> {
        const targetPaths: string[] = [];
        for (const artifactId of artifactIds) {
            const targetPath = `${targetDir || os.tmpdir}/artifact-${artifactId}.zip`;
            await this.downloadArtifact(artifactId, targetPath);
            targetPaths.push(targetPath);
        }
        return targetPaths;
    }

    async downloadArtifact(artifactId: number, targetPath: string): Promise<void> {
        const url = (await this.octokit.request('GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}', {
            ...this.repoOptions,
            artifact_id: artifactId,
            archive_format: 'zip'
        })).url;

        await downloadFile(url, targetPath);
    }

    async deleteRun(runId: number): Promise<void> {
        await this.octokit.request('DELETE /repos/{owner}/{repo}/actions/runs/{run_id}', {
            ...this.repoOptions,
            run_id: runId
        });
    }

    async deleteWorkflowRuns(workflowOptions: WorkflowOptions, dryRun: boolean): Promise<void> {
        process.stdout.write(`Deleting workflow runs ${ dryRun ? '(dryRun) ' : '' }...\n`);
        const runs = await this.getRuns(workflowOptions);
        process.stdout.write(`${runs.length} run(s) found.\n`);

        for (const run of runs) {
            process.stdout.write(`Deleting run ${run.id} ...\n`);
            if (!dryRun) {
                const tmp = await this.deleteRun(run.id);
            }
        }
    }

    async getWorkflows(): Promise<WorkflowData[]> {
        return (await this.octokit.request('GET /repos/{owner}/{repo}/actions/workflows', {
            ...this.repoOptions
        })).data.workflows;
    }
}
