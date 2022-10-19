import { GithubApiWrapper, LogLevelType, RepoOptions } from './github-api-wrapper';
import * as fs from 'fs';
import { execSync } from 'child_process';
import extract = require('extract-zip');

async function cleanGithubImageSnapshots(): Promise<void> {
    process.stdout.write(`Cleaning image snapshots ...\n`);
    execSync('npm run clean-github-image-snapshots');
}

export async function applyImageSnapshotsFromArtifacts(
    artifactIds: number[],
    repoOptions: RepoOptions,
    token: string,
    cleanGithubSnapshots?: boolean
): Promise<void> {
    const githubApiWrapper = new GithubApiWrapper(repoOptions, token);
    githubApiWrapper.logLevel = LogLevelType.INFO;
    const zipPaths = await githubApiWrapper.downloadArtifacts(artifactIds);
    if (cleanGithubSnapshots) {
        await cleanGithubImageSnapshots();
    }
    for (const zipPath of zipPaths) {
        await extractImageSnapshots(zipPath, `${process.cwd()}/cypress/snapshots`);
        fs.unlinkSync(zipPath);
    }
    process.stdout.write('Image snapshots were replaced.\n');
}

async function extractImageSnapshots(zipPath: string, targetDir: string): Promise<void> {
    process.stdout.write(`Extacting image snapshots from '${zipPath}' to '${targetDir}' ...\n`);
    await extract(zipPath, { dir: targetDir });
}
