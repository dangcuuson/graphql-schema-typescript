import * as fs from 'fs';
import * as path from 'path';
import { GraphQLSchema, buildSchema } from 'graphql';
import { GenerateTypescriptOptions, defaultOptions } from './types';
import { TSResolverGenerator, GenerateResolversResult } from './typescriptResolverGenerator';
import { TypeScriptGenerator } from './typescriptGenerator';
import { formatTabSpace, introspectSchema, introspectSchemaViaLocalFile } from './utils';
import { isString } from 'util';
import { IntrospectionQuery } from 'graphql/utilities/introspectionQuery';

export { GenerateTypescriptOptions } from './types';

const packageJson = require(path.join(__dirname, '../package.json'));

const jsDoc =
    `/**
 * This file is auto-generated by ${packageJson.name}
 * Please note that any changes in this file may be overwritten
 */
 
`;

const typeDefsDecoration = [
    '/*******************************',
    ' *                             *',
    ' *          TYPE DEFS          *',
    ' *                             *',
    ' *******************************/'
];

const typeResolversDecoration = [
    '/*********************************',
    ' *                               *',
    ' *         TYPE RESOLVERS        *',
    ' *                               *',
    ' *********************************/'
];

export const generateTSTypesAsString = async (
    schema: GraphQLSchema | string,
    outputPath: string,
    options: GenerateTypescriptOptions
): Promise<string> => {
    const mergedOptions = { ...defaultOptions, ...options };

    let introspectResult: IntrospectionQuery;
    if (isString(schema)) {
        // is is a path to schema folder?
        try {
            const schemaPath = path.resolve(schema);
            const exists = fs.existsSync(schemaPath);
            if (exists) {
                introspectResult = await introspectSchemaViaLocalFile(schemaPath);
            }
        } catch {
            // fall-through in case the provided string is a graphql definition,
            // which can make path.resolve throw error
        }

        // it's not a folder, maybe it's a schema definition
        if (!introspectResult) {
            const schemaViaStr = buildSchema(schema);
            introspectResult = await introspectSchema(schemaViaStr);
        }
    } else {
        introspectResult = await introspectSchema(schema);
    }

    const tsGenerator = new TypeScriptGenerator(mergedOptions, introspectResult, outputPath);
    const typeDefs = await tsGenerator.generate();

    let typeResolvers: GenerateResolversResult = {
        body: [],
        importHeader: []
    };
    const tsResolverGenerator = new TSResolverGenerator(mergedOptions, introspectResult);
    typeResolvers = await tsResolverGenerator.generate();

    let header = options.includeResolverTypes ? 
        [...typeResolvers.importHeader, jsDoc] : 
        [jsDoc];

    let body: string[] = options.includeResolverTypes ? 
    [
        ...typeDefsDecoration,
        ...typeDefs,
        ...typeResolversDecoration,
        ...typeResolvers.body
    ] :
    [
        ...typeDefsDecoration,
        ...typeDefs
    ];

    if (mergedOptions.namespace) {
        body = [
            // if namespace is under global, it doesn't need to be declared again
            `${mergedOptions.global ? '' : 'declare '}namespace ${options.namespace} {`,
            ...body,
            '}'
        ];
    }

    if (mergedOptions.global) {
        body = [
            'export { };',
            '',
            'declare global {',
            ...body,
            '}'
        ];
    }

    const formatted = formatTabSpace([...header, ...body], mergedOptions.tabSpaces);
    return formatted.join('\n');
};

export async function generateTypeScriptTypes(
    schema: GraphQLSchema | string,
    outputPath: string,
    options: GenerateTypescriptOptions = defaultOptions
) {
    const content = await generateTSTypesAsString(schema, outputPath, options);
    fs.writeFileSync(outputPath, content, 'utf-8');
}