import { getDispatchOptions } from './options';
import { ConclusionType, GithubApiWrapper, LogLevelType } from './github-api-wrapper';
import { applyImageSnapshotsFromArtifacts } from './shared';

const WORKFLOW = 'run-e2e-tests.yml';
const IMAGE_SNAPSHOT_ARTIFACT_NAME_PREFIX = 'updated-image-snapshots-';

const options = getDispatchOptions({ workflow_id: WORKFLOW}, ['host']);

const repoOptions = {
    owner: options.owner,
    repo: options.repo
};
const githubApiWrapper = new GithubApiWrapper(repoOptions, options.token);
githubApiWrapper.logLevel = LogLevelType.INFO;
githubApiWrapper.dispatchWorkflowAndWaitForResult(
    { workflow_id: options.workflow_id, ref: options.ref },
    options.inputs
).then(result => {
    process.stdout.write('\n===================================\n');
    process.stdout.write('Run-Result:\n');
    process.stdout.write(`Conclusion: ${result.conclusion}\n`);
    process.stdout.write(`Run-Html-Url: ${result.run_html_url}\n`);
    for (const artifact of result.artifacts) {
        process.stdout.write(`Artifact: ${artifact.name} [${artifact.url}]\n`);
    }
    if (result.conclusion === ConclusionType.SUCCESS) {
        const imageSnapshotsArtifacts = result.artifacts.filter(a => a.name.startsWith(IMAGE_SNAPSHOT_ARTIFACT_NAME_PREFIX));
        if (imageSnapshotsArtifacts.length > 0) {
            process.stdout.write(`Applying image snapshots from artifacts (${imageSnapshotsArtifacts.length}) ...\n`);
            applyImageSnapshotsFromArtifacts(
                imageSnapshotsArtifacts.map(a => a.id),
                repoOptions,
                options.token,
                true
            );
        }
    }
});
