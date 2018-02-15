#!/usr/bin/env node

import * as yargs from 'yargs';
import * as path from 'path';
import { generateTypeScriptTypes } from './index';

// Make sure unhandled errors in async code are propagated correctly
process.on('unhandledRejection', (error) => { throw error; });

function handleError(message: string, error: Error = new Error(message)) {
    console.log('Message: ', message);
    console.log('Error: ', error);
    process.exit(1);
}

yargs
    .command(
    'generate-ts <folderPath>',
    'Generate typescript definitions from a local folder that cointains `.graphql` type definitions',
    {
        output: {
            demand: true,
            describe: 'Output path for Typescript definitions file',
            default: 'graphqlTypes.d.ts',
            normalize: true,
            coerce: path.resolve,
        }
    },
    async argv => {
        const { folderPath, output } = argv;

        await generateTypeScriptTypes(folderPath, path.resolve(output));
        console.log(`Typescript generated at: ${output}`);
    }
    )
    .fail(function (message: string, error: Error) {
        handleError(message, error);
        process.exit(1);
    })
    .help()
    .version()
    .strict()
    // tslint:disable-next-line
    .argv;