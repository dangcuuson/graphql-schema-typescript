import { executeApiTest, occurrences } from './testUtils';

describe('enumsAsPascalCase', () => {
    it('should make enum values PascalCase', async () => {
        const generated = await executeApiTest('enumsAsPascalCase.ts', { enumsAsPascalCase: true });
        expect(generated).toContain(`SysAdmin = 'SYS_ADMIN'`);
    });

    it('should not make enum values PascalCase when disabled', async () => {
        const generated = await executeApiTest('enumsAsPascalCase.ts', { enumsAsPascalCase: false });
        expect(generated).toContain(`SYS_ADMIN = 'SYS_ADMIN'`);
    });
});
