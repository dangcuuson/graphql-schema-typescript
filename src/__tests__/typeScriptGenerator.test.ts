import * as path from 'path';
import * as rimraf from 'rimraf';
import * as fsa from 'fs-extra';
import { testSchema } from './testSchema';
import { executeCommand } from './testUtils';
import { generateTypeScriptTypes } from '../index';
import { versionMajorMinor } from 'typescript';

const outputFolder = path.join(__dirname, 'generatedTypes');

/** Function that count occurrences of a substring in a string;
 * @param {String} string               The string
 * @param {String} subString            The sub string to search for
 * @param {Boolean} [allowOverlapping]  Optional. (Default:false)
 *
 * @author Vitim.us https://gist.github.com/victornpb/7736865
 * @see Unit Test https://jsfiddle.net/Victornpb/5axuh96u/
 * @see http://stackoverflow.com/questions/4009756/how-to-count-string-occurrence-in-string/7924240#7924240
 */
function occurrences(str: string, subString: string, allowOverlapping: boolean) {

    str += '';
    subString += '';
    if (subString.length <= 0) {
        return (str.length + 1);
    }

    var n = 0,
        pos = 0,
        step = allowOverlapping ? 1 : subString.length;

    while (true) {
        pos = str.indexOf(subString, pos);
        if (pos >= 0) {
            ++n;
            pos += step;
        } else {
            break;
        }
    }
    return n;
}

describe('Typescript Generator', () => {
    beforeAll(() => {
        if (fsa.existsSync(outputFolder)) {
            fsa.emptyDirSync(outputFolder);
        } else {
            fsa.mkdirsSync(outputFolder);
        }
    });

    it('should generate unknown custom scalar type as `any`', async () => {
        const outputPath = path.join(outputFolder, 'scalarAsAny.ts');

        await generateTypeScriptTypes(testSchema, outputPath);

        const generated = fsa.readFileSync(outputPath, 'utf-8');
        expect(generated).toMatchSnapshot();
        expect(generated).toContain('export type GQLDate = any;');

        await executeCommand(`tsc --noEmit --lib es6,esnext.asynciterable --target es5 ${outputPath}`);
    });

    it('should generate known scalar type to its corresponding type', async () => {
        const outputPath = path.join(outputFolder, 'scalarAsCustom.ts');

        await generateTypeScriptTypes(testSchema, outputPath, {
            customScalarType: {
                'Date': 'Date'
            }
        });

        const generated = fsa.readFileSync(outputPath, 'utf-8');
        expect(generated).toContain('export type GQLDate = Date;');

        await executeCommand(`tsc --noEmit --lib es6,esnext.asynciterable --target es5 ${outputPath}`);
    });

    it('should use correct tabspaces in config options', async () => {
        const outputPath = path.join(outputFolder, 'tabSpaces.ts');

        await generateTypeScriptTypes(testSchema, outputPath, {
            tabSpaces: 4
        });

        const generated = fsa.readFileSync(outputPath, 'utf-8');

        await executeCommand(`tsc --noEmit --lib es6,esnext.asynciterable --target es5 ${outputPath}`);
    });

    it('should use correct prefix in config options', async () => {
        const outputPath = path.join(outputFolder, 'prefix.ts');

        await generateTypeScriptTypes(testSchema, outputPath, {
            typePrefix: 'MyCustomPrefix'
        });

        const generated = fsa.readFileSync(outputPath, 'utf-8');
        expect(generated).toContain('export interface MyCustomPrefixRootQuery');

        await executeCommand(`tsc --noEmit --lib es6,esnext.asynciterable --target es5 ${outputPath}`);
    });

    it('should minimize interface implementation if configure', async () => {
        const outputPath = path.join(outputFolder, 'minimizedInterface.ts');

        await generateTypeScriptTypes(testSchema, outputPath, {
            minimizeInterfaceImplementation: true
        });

        const generated = fsa.readFileSync(outputPath, 'utf-8');
        const occurrence = occurrences(generated, 'relatedProducts: GQLIProduct[];', false);
        expect(occurrence).toBe(1);

        await executeCommand(`tsc --noEmit --lib es6,esnext.asynciterable --target es5 ${outputPath}`);
    });

    xit('should fallback to string union if String Enum is not supported', async () => {
        // TODO: mock ts version and run generator
    });

    it('should wrap types in global and use string union if global is configured', async () => {
        const outputPath = path.join(outputFolder, 'global.ts');

        await generateTypeScriptTypes(testSchema, outputPath, {
            global: true
        });

        const generated = fsa.readFileSync(outputPath, 'utf-8');
        expect(generated).toContain('declare global {');
        expect(generated).toContain(`export type GQLUserRole = 'sysAdmin' | 'manager' | 'clerk' | 'employee';`);

        await executeCommand(`tsc --noEmit --lib es6,esnext.asynciterable --target es5 ${outputPath}`);
    });

    it('should wrap types in namespace if namespace is configured', async () => {
        const outputPath = path.join(outputFolder, 'namespace.ts');

        await generateTypeScriptTypes(testSchema, outputPath, {
            namespace: 'MyNamespace'
        });

        const generated = fsa.readFileSync(outputPath, 'utf-8');
        expect(generated).toContain('namespace MyNamespace {');

        await executeCommand(`tsc --noEmit --lib es6,esnext.asynciterable --target es5 ${outputPath}`);
    });

    it('should have no conflict between global and namespace config', async () => {
        const outputPath = path.join(outputFolder, 'globalWithNamespace.ts');

        await generateTypeScriptTypes(testSchema, outputPath, {
            namespace: 'MyNamespace',
            global: true
        });

        const generated = fsa.readFileSync(outputPath, 'utf-8');
        expect(generated).toContain('declare global {');
        expect(generated).toContain('namespace MyNamespace {');

        await executeCommand(`tsc --noEmit --lib es6,esnext.asynciterable --target es5 ${outputPath}`);
    });
});