import * as fs from 'fs';
import * as path from 'path';
import { testSchema } from './testSchema';
import { executeCommand } from './testUtils';
import { generateTypeScriptTypes } from '../index';

const outputFolder = path.join(__dirname, 'generatedTypes');

describe('Typescript Generator', () => {
    it('should generate unknown custom scalar type as `any`', async () => {
        const outputPath = path.join(outputFolder, 'types1.ts');

        await generateTypeScriptTypes(testSchema, outputPath);

        const generated = fs.readFileSync(outputPath, 'utf-8');
        expect(generated).toMatchSnapshot();
    });

    it('should generate known scalar type to its corresponding type', async () => {
        const outputPath = path.join(outputFolder, 'types2.ts');

        await generateTypeScriptTypes(testSchema, outputPath, {
            customScalarType: {
                'Date': 'Date'
            }
        });

        const generated = fs.readFileSync(outputPath, 'utf-8');
        expect(generated).toMatchSnapshot();
    });

    it('should use correct tabspaces in config options', async () => {
        const outputPath = path.join(outputFolder, 'types3.ts');

        await generateTypeScriptTypes(testSchema, outputPath, {
            tabSpaces: 4
        });

        const generated = fs.readFileSync(outputPath, 'utf-8');
        expect(generated).toMatchSnapshot();
    });

    it('should use correct prefix in config options', async () => {
        const outputPath = path.join(outputFolder, 'types4.ts');

        await generateTypeScriptTypes(testSchema, outputPath, {
            typePrefix: 'MyCustomPrefix'
        });

        const generated = fs.readFileSync(outputPath, 'utf-8');
        expect(generated).toMatchSnapshot();
    });

    it('should generate non-corrupt typescript file', async () => {
        const generatedFiles = fs.readdirSync(outputFolder).map(file => path.join(outputFolder, file));

        for (let generatedTSFile of generatedFiles) {
            await executeCommand(`tsc --noEmit --lib es6,esnext.asynciterable --target es5 ${generatedTSFile}`);
        }
    });
});