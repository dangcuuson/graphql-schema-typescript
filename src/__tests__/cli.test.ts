import * as fsa from 'fs-extra';
import * as path from 'path';
import { executeCommand } from './testUtils';
import { testSchema } from './testSchema/index';
import { generateTypeScriptTypes } from '../index';
import { GenerateTypescriptOptions } from '../types';

const baseCmd = 'node ./lib/cli.js generate-ts';
const schemaFolderPath = './src/__tests__/testSchema';
const outputFolder = path.join(__dirname, 'generatedTypes-CLIs');

async function executeCLITest(
    testId: string,
    cmdOptions: string = '',
    apiOptions: GenerateTypescriptOptions = {}
) {
    const outputPathCLI = path.join(outputFolder, testId + '-CLI.ts');
    const outputPathAPI = path.join(outputFolder, testId + '-API.ts');

    const cmd = `${baseCmd} ${schemaFolderPath} --output ${outputPathCLI} ${cmdOptions}`;
    await executeCommand(cmd);
    await generateTypeScriptTypes(testSchema, outputPathAPI, apiOptions);

    const cliTypes = fsa.readFileSync(outputPathCLI, 'utf-8');
    const apiTypes = fsa.readFileSync(outputPathAPI, 'utf-8');

    expect(cliTypes).toBe(apiTypes);
}

describe('CLIs - generate-ts', () => {
    beforeAll(() => {
        if (fsa.existsSync(outputFolder)) {
            fsa.emptyDirSync(outputFolder);
        } else {
            fsa.mkdirsSync(outputFolder);
        }
    });

    it('no options', async () => {
        await executeCLITest('noOption');
    });
    it('global', async () => {
        await executeCLITest('global', '--global', { global: true });
    });
    it('typePrefix', async () => {
        await executeCLITest('typePrefix', '--typePrefix MyPrefix', { typePrefix: 'MyPrefix' });
    });
    it('namespace', async () => {
        await executeCLITest('namespace', '--namespace MyNS', { namespace: 'MyNS' });
    });
    it('minimize interface', async () => {
        await executeCLITest('minimizeInterface', '--minimizeInterfaceImplementation', { minimizeInterfaceImplementation: true });
    });
    it('context type', async () => {
        await executeCLITest('ctxType', '--contextType string', { contextType: 'string' });
    });
    it('importStatements', async () => {
        await executeCLITest(
            'importStatements',
            '--importStatements "import * as fs from \'fs\';" "import * as path from \'path\';" ',
            { importStatements: [
                'import * as fs from \'fs\';',
                'import * as path from \'path\';'
            ]}
        );
    });
    it('smartTParent', async() => {
        await executeCLITest('smartTParent', '--smartTParent', { smartTParent: true });
    });
    it('smartTResult', async() => {
        await executeCLITest('smartTResult', '--smartTResult', { smartTResult: true });
    });
    it('asyncResult', async() => {
        await executeCLITest('asyncResult', '--asyncResult', { asyncResult: true });
    });
    it('requireResolverTypes', async() => {
        await executeCLITest('requireResolverTypes', '--requireResolverTypes', { requireResolverTypes: true });
    });
    it('noStringEnum', async() => {
        await executeCLITest('noStringEnum', '--noStringEnum', { noStringEnum: true });
    });
    it('optionalResolverInfo', async() => {
        await executeCLITest('optionalResolverInfo', '--optionalResolverInfo', { optionalResolverInfo: true });
    });
});