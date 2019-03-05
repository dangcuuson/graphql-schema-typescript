import { executeApiTest } from './testUtils';

describe('optionalResolverInfo', () => {
    it('should generate optional info arguement if configured', async () => {
        const generated = await executeApiTest('optionalResolverInfo.ts', { optionalResolverInfo: true });
        expect(generated).toContain('info?: GraphQLResolveInfo');
    });
});