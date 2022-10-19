export interface ConfigOptions {
    host?: string;
    repo?: {
        owner?: string;
        name?: string;
    };
    token?: string;
}


export interface CmdRepoOptions {
    owner: string;
    repo: string;
}

export interface CmdTokenOption {
    token: string;
}

export interface CmdWorkflowOption {
    workflow: string;
    ref: string;
}

export interface CmdDispatchOptions extends CmdRepoOptions, CmdTokenOption, CmdWorkflowOption {
    input: {
        key: string;
        value: string;
    }[];
}

export interface DispatchOptions {
    owner: string;
    repo: string;
    ref: string;
    token: string;
    inputs?: Inputs;
    workflow_id: string;
}

interface Inputs {
    [key: string]: string;
}

interface OptionDefinition<T> {
    name: keyof T;
    alias?: string;
    type?: (x: string) => any;
    description?: string;
    multiple?: boolean;
}

const cmdOptionDefinitions_Repo: OptionDefinition<CmdRepoOptions>[] = [
    { name: 'owner', alias: 'o', type: String, description: 'Repo-Owner' },
    { name: 'repo', alias: 'r', type: String, description: 'Repo-Name'} // , multiple: true, defaultOption: true },
];

const cmdOptionDefinition_Token: OptionDefinition<CmdTokenOption> =
    { name: 'token', alias: 't', type: String, description: 'Personal Access Token'};
const cmdOptionDefinitions_Workflow: OptionDefinition<CmdWorkflowOption>[] = [
    { name: 'workflow', alias: 'w', type: String, description: 'File name or id of the workflow'},
    { name: 'ref', alias: 'b', type: String, description: 'Commit-Ref' }
];

function parseDispatchInput(input: string): { key: string; value: string } {
    const index = input.indexOf('=');
    if (index < 0) {
        throw new Error(`Input argument '${input} does not contain the symbol '='.`);
    } else if (index === 0) {
        throw new Error(`Input argument '${input} does not contain the parameter name.`);
    } else {
        return ({ key: input.slice(0, index), value: input.slice(index + 1)});
    }
}
const cmdOptionDefinitions_Dispatch: OptionDefinition<CmdDispatchOptions>[] = [
    ...cmdOptionDefinitions_Repo,
    cmdOptionDefinition_Token,
    ...cmdOptionDefinitions_Workflow,
    { name: 'input', alias: 'i', type: parseDispatchInput, multiple: true }
];

export function getCmdOptions<T>(optionDefinitions: any): T {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const commandLineArgs = require('command-line-args');
    return commandLineArgs(optionDefinitions);
}

export function getConfigOptions(): ConfigOptions {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require('config');
    return config;
}

export function getDispatchOptions(defaultOptions?: Partial<DispatchOptions>, requiredInputs?: string[]): DispatchOptions {
    defaultOptions = defaultOptions || {};
    requiredInputs = requiredInputs || [];
    const configOptions = getConfigOptions();
    const cmdOptions = getCmdOptions<CmdDispatchOptions>(cmdOptionDefinitions_Dispatch);
    const inputs = (cmdOptions.input || []).reduce((result, input) => {
        result[input.key] = input.value;
        return result;
    }, {} as { [key: string]: string });
    inputs['host'] = inputs['host'] || configOptions.host || '';

    const options: DispatchOptions = {
        owner: cmdOptions.owner || configOptions.repo?.owner || defaultOptions.owner || '',
        repo: cmdOptions.repo || configOptions.repo?.name || defaultOptions.repo || '',
        token: cmdOptions.token || configOptions.token || defaultOptions.token || '',
        ref: cmdOptions.ref || defaultOptions.ref || '', //  || await getCurrentBranch(),
        workflow_id: cmdOptions.workflow || defaultOptions.workflow_id || '',
        inputs: inputs
    };
    checkDispatchOptions(options, requiredInputs);
    return options;
}

function checkDispatchOptions(options: DispatchOptions, requiredInputs: string[]): void {
    const requiredOptions: (keyof DispatchOptions)[] = ['owner', 'repo', 'ref', 'workflow_id'];
    for (const requiredOption of requiredOptions) {
        const value = options[requiredOption];
        if (value === undefined || value === null || value === '') {
            const optionDescription = cmdOptionDefinitions_Dispatch.filter(o => o.name === requiredOption)[0].description || `${requiredOption}-value`;
            process.stderr.write(`Option '${requiredOption}' is missing. Please use '--${requiredOption} <${ optionDescription }>' to specify option.\n`);
            process.exit(1);
        }
    }
    checkDispatchInputs(options.inputs || {}, requiredInputs);
}

function checkDispatchInputs(inputs: Inputs, requiredInputs: string[]): void {
    for (const requiredInput of requiredInputs) {
        const value = inputs[requiredInput];
        if (value === undefined || value === null || value === '') {
            process.stderr.write(`Input '${requiredInput}' is missing. Please use '-i ${requiredInput}=<${requiredInput}-value>' to specify missing input.\n`);
            process.exit(1);
        }
    }
}
