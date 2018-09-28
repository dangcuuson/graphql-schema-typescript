import { executeApiTest, occurrences } from './testUtils';

describe('noStringEnum', () => {
    it('should use string union instead of enum', async () => {
        const generated = await executeApiTest('noStringEnum.ts', { noStringEnum: true });
        const lines = generated.split('\n');
        expect(occurrences(lines.join(''), 'enum', false)).toBe(0);
    });
});
