import { executeApiTest } from './testUtils';

describe('importStatements', () => {
    it('should inject import statements', async () => {
        const importStatements = [`import * as fs from 'fs';`, `import * as path from 'path';`];
        const generated = await executeApiTest('importStatements.ts', { importStatements });
        const lines = generated.split('\n');
        expect(lines[0]).toBe(importStatements[0]);
        expect(lines[1]).toBe(importStatements[1]);
    });
});
