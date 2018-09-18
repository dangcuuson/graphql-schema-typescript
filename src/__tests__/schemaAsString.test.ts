import * as path from 'path';
import { generateTypeScriptTypes } from '..';
import { executeApiTest } from './testUtils';

describe('schema as string', () => {
    
    it('should generate if schema is a valid graphql schema', async () => {
        const schemaStr = `schema { query: RootQuery } type RootQuery { test: String! }`;
        const generated = await executeApiTest('schemaString.ts', {}, schemaStr);
        expect(generated).toEqual(expect.stringContaining('test: string'));
    });

    it('should generate from local file if argument is a string', async () => {
        const schemaDir = __dirname + '/testSchema';
        await executeApiTest('localFile.ts', {}, schemaDir);
    });
});