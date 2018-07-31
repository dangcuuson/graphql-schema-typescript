import { executeApiTest, occurrences } from './testUtils';

describe('minimizedInterfaceImplementation', () => {
    it('should minimize interface implementation if configured', async () => {
        const generated = await executeApiTest('minimizedInterface.ts', { minimizeInterfaceImplementation: true });
        const occurrence = occurrences(generated, 'relatedProducts: Array<GQLIProduct>;', false);
        expect(occurrence).toBe(1);
    });
});