#!/usr/bin/env node

import * as yargs from 'yargs';
import * as path from 'path';
import { generateTypeScriptTypes, GenerateTypescriptOptions } from './index';
import { defaultOptions } from './types';

// Make sure unhandled errors in async code are propagated correctly
process.on('unhandledRejection', (error) => { throw error; });

function handleError(message: string, error: Error = new Error(message)) {
    console.log('Message: ', message);
    console.log('Error: ', error);
    process.exit(1);
}

const globalOpt: keyof GenerateTypescriptOptions = 'global';
const typePrefix: keyof GenerateTypescriptOptions = 'typePrefix';
const namespaceOpt: keyof GenerateTypescriptOptions = 'namespace';
const miminizeInterface: keyof GenerateTypescriptOptions = 'minimizeInterfaceImplementation';
const contextType: keyof GenerateTypescriptOptions = 'contextType';
const importStatements: keyof GenerateTypescriptOptions = 'importStatements';

yargs
    .option(globalOpt, {
        desc: 'Generate types as global',
        boolean: true,
        default: defaultOptions[globalOpt]
    })
    .option(typePrefix, {
        desc: 'A prefix to every generated types',
        string: true,
        default: defaultOptions[typePrefix]
    })
    .option(namespaceOpt, {
        desc: 'Add types under a namespace',
        string: true,
        default: defaultOptions[namespaceOpt]
    })
    .option(miminizeInterface, {
        desc: 'Ignore copying of interface keys to type implementation',
        boolean: true,
        default: defaultOptions[miminizeInterface]
    })
    .options(contextType, {
        desc: 'Name of your graphql context type',
        string: true,
        default: defaultOptions[contextType]
    })
    .option(importStatements, {
        desc: 'Import statements at the top of the generated file that import your custom scalar type and context type',
        array: true
    })
    .option('output', {
        desc: 'Output path for Typescript definitions file',
        string: true,
        demand: true,
        default: 'graphqlTypes.d.ts',
        normalize: true,
        coerce: path.resolve
    })
    .command(
    'generate-ts <folderPath>',
    'Generate typescript definitions from a local folder that cointains `.graphql` type definitions',
    {},
    async argv => {
        const { folderPath, output } = argv;

        const options: GenerateTypescriptOptions = {};
        options[globalOpt] = argv[globalOpt];
        options[typePrefix] = argv[typePrefix];
        options[namespaceOpt] = argv[namespaceOpt];
        options[miminizeInterface] = argv[miminizeInterface];
        options[contextType] = argv[contextType];
        options[importStatements] = argv[importStatements];

        await generateTypeScriptTypes(folderPath, path.resolve(output), options);
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