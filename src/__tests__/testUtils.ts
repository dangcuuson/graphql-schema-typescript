import { generateTypeScriptTypes } from '../index';
import * as childProcess from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { GenerateTypescriptOptions } from '../types';
import { testSchema } from './testSchema';
import { GraphQLSchema } from 'graphql';

export const executeCommand = (command: string, options?: childProcess.ExecOptions) => {
    return new Promise((resolve, reject) => {
        const process = childProcess.exec(command, options);

        process.stdout.on('data', console.log);
        process.stderr.on('data', console.error);

        process.on('close', (exitCode: number) => {
            if (exitCode !== 0) {
                reject(`Command: ${command} return non-0 exit code: ${exitCode}`);
            } else {
                resolve();
            }
        });
        process.on('error', err => {
            console.error(err);
            reject(err);
        });
    });
};

/** Function that count occurrences of a substring in a string;
 * @param {String} string               The string
 * @param {String} subString            The sub string to search for
 * @param {Boolean} [allowOverlapping]  Optional. (Default:false)
 *
 * @author Vitim.us https://gist.github.com/victornpb/7736865
 * @see Unit Test https://jsfiddle.net/Victornpb/5axuh96u/
 * @see http://stackoverflow.com/questions/4009756/how-to-count-string-occurrence-in-string/7924240#7924240
 */
export const occurrences = (str: string, subString: string, allowOverlapping: boolean) => {

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
};

export const OUTPUT_FOLDER = path.join(__dirname, 'generatedTypes');
export const executeApiTest = async (
    outputFile: string,
    options: GenerateTypescriptOptions,
    schema?: GraphQLSchema | string
): Promise<string> => {
    // prepare output folder
    if (!fs.existsSync(OUTPUT_FOLDER)) {
        fs.mkdirSync(OUTPUT_FOLDER);
    }
    const outputPath = path.join(OUTPUT_FOLDER, outputFile);

    // run api function
    await generateTypeScriptTypes(schema || testSchema, outputPath, options);

    // ensure no error on tsc
    const generated = fs.readFileSync(outputPath, 'utf-8');
    await executeCommand(`tsc --noEmit --lib es6,esnext.asynciterable --target es5 ${outputPath}`);

    // snapshot
    expect(generated).toMatchSnapshot();
    return generated;
};