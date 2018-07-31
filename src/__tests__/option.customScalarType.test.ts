import { executeApiTest } from './testUtils';

describe('customScalarType', () => {
    it('should generate unknown custom scalar type as `any`', async () => {
        const generated = await executeApiTest('scalarAsAny.ts', { customScalarType: {} });
        expect(generated).toContain('export type GQLDate = any;');
    });

    it('should generate known scalar type to its corresponding type', async () => {
        const generated = await executeApiTest('scalarAsCustom.ts', { customScalarType: { 'Date': 'Date' } });
        expect(generated).toContain('export type GQLDate = Date;');
    });
});