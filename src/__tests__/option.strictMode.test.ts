import { executeApiTest } from './testUtils';

describe('Strict Mode', () => {
    it('should generate unknown custom scalar type as `any`', async () => {
        const generated = await executeApiTest('strictNulls.ts', { strictNulls: true });
        expect(generated).toContain('scalarString1: string | null;');
        expect(generated).toContain('scalarString2: string;');
        expect(generated).toContain('listString2: Array<string | null>;');
        expect(generated).toContain('listString1: Array<string | null> | null;');
        expect(generated).toContain('listString2: Array<string | null>;');
        expect(generated).toContain('listString3: Array<string> | null;');
        expect(generated).toContain('listString4: Array<string>;');
    });

});
