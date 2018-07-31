import { executeApiTest } from './testUtils';

describe('typePrefix', () => {
    it('should use correct prefix in config options', async () => {
        const generated = await executeApiTest('prefix.ts', { typePrefix: 'MyCustomPrefix' });
        expect(generated).toContain('export interface MyCustomPrefixRootQuery');
        expect(generated).not.toContain('export interface GQLRootQuery');
    });

    it('should have no prefix if prefix is empty string', async () => {
        const generated = await executeApiTest('prefix.ts', { typePrefix: '' });
        expect(generated).toContain('export interface RootQuery');
        expect(generated).not.toContain('export interface GQLRootQuery');
    });
});