import { executeApiTest } from './testUtils';

describe('global + namespace', () => {
    it('should wrap types in global and use string union if global is configured', async () => {
        const generated = await executeApiTest('global.ts', { global: true });
        expect(generated).toContain('declare global {');
        expect(generated).toContain(`export type GQLUserRole = 'sysAdmin' | 'manager' | 'clerk' | 'employee';`);
    });

    it('should wrap types in namespace if namespace is configured', async () => {
        const generated = await executeApiTest('global.ts', { namespace: 'MyNamespace' });
        expect(generated).toContain('namespace MyNamespace {');
    });

    it('should have no conflict between global and namespace config', async () => {
        const generated = await executeApiTest('globalWithNamespace.ts', { namespace: 'MyNamespace', global: true });
        expect(generated).toContain('declare global {');
        expect(generated).toContain('namespace MyNamespace {');
    });
});
