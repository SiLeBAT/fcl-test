import { getDispatchOptions } from './options';
import { ConclusionType, GithubApiWrapper, LogLevelType, RepoOptions } from './github-api-wrapper';
import { applyImageSnapshotsFromArtifacts } from './shared';

const WORKFLOW = 'run-e2e-tests.yml';
const IMAGE_SNAPSHOT_ARTIFACT_NAME_PREFIX = 'updated-image-snapshots-';

const options = getDispatchOptions({ workflow_id: WORKFLOW}, ['host']);
const repoOptions: RepoOptions = { owner: options.owner, repo: options.repo };
const githubApiWrapper = new GithubApiWrapper(repoOptions, options.token);
githubApiWrapper.logLevel = LogLevelType.INFO;
githubApiWrapper.getRuns({ ref: options.ref, workflow_id: WORKFLOW })
    .then(async (runs) => {
        const successfulRuns = runs.filter(run => run.conclusion === ConclusionType.SUCCESS);
        for (const run of successfulRuns) {
            const runResult = await githubApiWrapper.getRunResult(run);
            const imageSnapshotsArtifactIds = runResult.artifacts
                .filter(artifact => artifact.name.startsWith(IMAGE_SNAPSHOT_ARTIFACT_NAME_PREFIX))
                .map(artifact => artifact.id);
            if (imageSnapshotsArtifactIds.length > 0) {
                process.stdout.write(`Applying artifacts of run ${run.id} from ${run.created_at} ...\n`);
                applyImageSnapshotsFromArtifacts(
                    imageSnapshotsArtifactIds,
                    repoOptions,
                    options.token,
                    true
                );
                return;
            }
        }
        process.stdout.write('Could not find a successful run with image snapshot artifacts.\n');
    });
