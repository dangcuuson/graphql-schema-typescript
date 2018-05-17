import * as path from 'path';
import * as fsa from 'fs-extra';
import { testSchema } from './testSchema';
import { executeCommand } from './testUtils';
import { generateTypeScriptTypes } from '../index';
import { versionMajorMinor } from 'typescript';

const outputFolder = path.join(__dirname, 'generatedTypes');

describe('Strict Mode', () => {
    beforeAll(() => {
        if (fsa.existsSync(outputFolder)) {
            fsa.emptyDirSync(outputFolder);
        } else {
            fsa.mkdirsSync(outputFolder);
        }
    });

    it('should generate unknown custom scalar type as `any`', async () => {
        const outputPath = path.join(outputFolder, 'strictNulls.ts');

        await generateTypeScriptTypes(testSchema, outputPath, { strictNulls: true });

        const generated = fsa.readFileSync(outputPath, 'utf-8');
        expect(generated).toMatchSnapshot();
        expect(generated).toContain('scalarString1: string | null;');
        expect(generated).toContain('scalarString2: string;');
        expect(generated).toContain('listString2: Array<string | null>;');
        expect(generated).toContain('listString1: Array<string | null> | null;');
        expect(generated).toContain('listString2: Array<string | null>;');
        expect(generated).toContain('listString3: Array<string> | null;');
        expect(generated).toContain('listString4: Array<string>;');

        await executeCommand(`tsc --noEmit --lib es6,esnext.asynciterable --target es5 ${outputPath}`);
    });

});
