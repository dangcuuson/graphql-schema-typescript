#!/usr/bin/env node

import * as yargs from 'yargs';
import * as path from 'path';
import { generateTypeScriptTypes } from './index';

// Make sure unhandled errors in async code are propagated correctly
process.on('unhandledRejection', (error) => { throw error; });
process.on('uncaughtException', handleError);

function handleError(error: Error) {
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
            default: 'graphqlTypes.json',
            normalize: true,
            coerce: path.resolve,
        }
    },
    async argv => {
        const { schema, output } = argv;

        await generateTypeScriptTypes(schema, output);
    }
    )
    .fail(function (message: string, error: Error) {
        handleError(error);
        process.exit(1);
    })
    .help()
    .version()
    .strict();