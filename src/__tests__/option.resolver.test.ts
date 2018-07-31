import { executeApiTest } from './testUtils';

describe('Options for resolvers', () => {
    it('should make all fields in resolvers required if requireResolverTypes option is specified', async () => {
        await executeApiTest('requireResolverTypes.ts', { requireResolverTypes: true });
    });

    it('should guess TParent in resolvers correctly', async () => {
        const generated = await executeApiTest('smartTParent.ts', {
            smartTParent: true,
            rootValueType: 'string'
        });
        expect(generated).not.toContain('TParent = any');
    });

    it('should guess TResult in resolvers correctly', async () => {
        const generated = await executeApiTest('smartTResult.ts', { smartTResult: true });
        expect(generated).not.toContain('TResult = any');
    });

    it('should make resolver return TResult or Promise<TResult> if asyncResult is set', async () => {
        const generated = await executeApiTest('asyncResult.ts', { asyncResult: true });
        expect(generated).toContain('TResult | Promise<TResult>');
    });
});
