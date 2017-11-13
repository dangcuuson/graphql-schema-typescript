import * as path from 'path';
import * as rimraf from 'rimraf';
import * as fsa from 'fs-extra';
import { testSchema } from './testSchema';
import { executeCommand } from './testUtils';
import { generateTypeScriptTypes } from '../index';
import { versionMajorMinor } from 'typescript';

const outputFolder = path.join(__dirname, 'generatedTypes');

describe('Typescript Generator', () => {
    beforeAll(() => {
        if (fsa.existsSync(outputFolder)) {
            fsa.emptyDirSync(outputFolder);
        } else {
            fsa.mkdirsSync(outputFolder);
        }
    });

    it('should generate unknown custom scalar type as `any`', async () => {
        const outputPath = path.join(outputFolder, 'types1.ts');

        await generateTypeScriptTypes(testSchema, outputPath);

        const generated = fsa.readFileSync(outputPath, 'utf-8');
        expect(generated).toMatchSnapshot();
        expect(generated).toContain('export type GQLDate = any;');
    });

    it('should generate known scalar type to its corresponding type', async () => {
        const outputPath = path.join(outputFolder, 'types2.ts');

        await generateTypeScriptTypes(testSchema, outputPath, {
            customScalarType: {
                'Date': 'Date'
            }
        });

        const generated = fsa.readFileSync(outputPath, 'utf-8');
        expect(generated).toMatchSnapshot();
        expect(generated).toContain('export type GQLDate = Date;');
    });

    it('should use correct tabspaces in config options', async () => {
        const outputPath = path.join(outputFolder, 'types3.ts');

        await generateTypeScriptTypes(testSchema, outputPath, {
            tabSpaces: 4
        });

        const generated = fsa.readFileSync(outputPath, 'utf-8');
        expect(generated).toMatchSnapshot();
    });

    it('should use correct prefix in config options', async () => {
        const outputPath = path.join(outputFolder, 'types4.ts');

        await generateTypeScriptTypes(testSchema, outputPath, {
            typePrefix: 'MyCustomPrefix'
        });

        const generated = fsa.readFileSync(outputPath, 'utf-8');
        expect(generated).toMatchSnapshot();
        expect(generated).toContain('export interface MyCustomPrefixRootQuery');
    });

    xit('should fallback to string union if String Enum is not supported', async () => {
        // TODO: mock ts version and run generator
    });

    it('should generate non-corrupt typescript file', async () => {
        const generatedFiles = fsa.readdirSync(outputFolder).map(file => path.join(outputFolder, file));

        for (let generatedTSFile of generatedFiles) {
            await executeCommand(`tsc --noEmit --lib es6,esnext.asynciterable --target es5 ${generatedTSFile}`);
        }
    });
});