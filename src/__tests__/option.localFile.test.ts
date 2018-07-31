import * as path from 'path';
import { generateTypeScriptTypes } from '..';
import { executeCommand, OUTPUT_FOLDER } from './testUtils';

describe('schema from local file', () => {
    it('should generate from local file if argument is a string', async () => {
        const outputPath = path.join(OUTPUT_FOLDER, 'localFile.ts');
        await generateTypeScriptTypes(__dirname + '/testSchema', outputPath);
        await executeCommand(`tsc --noEmit --lib es6,esnext.asynciterable --target es5 ${outputPath}`);
    });
});