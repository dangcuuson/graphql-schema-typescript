import * as path from 'path';
import { generateTypeScriptTypes } from '..';
import { executeApiTest } from './testUtils';

describe('schema extension declaration', () => {
    
    it('should generate if schema is a valid graphql schema', async () => {
        const schemaStr = `schema { query: Query } type Query { test: String! } extend type Query { foo: String }`;
        const generated = await executeApiTest('schemaString.ts', {}, schemaStr);
        expect(generated).toEqual(expect.stringContaining('foo?: string'));
    });
});