import * as fs from 'fs';
import { GraphQLSchema } from 'graphql'
import { GenerateTypescriptOptions } from './types';
import { TypeScriptGenerator } from './typescriptGenerator';

const defaultOptions: GenerateTypescriptOptions = {
    tabSpaces: 2
};

export const generateTypeScriptTypes = async (schema: GraphQLSchema, outputPath: string, options: GenerateTypescriptOptions = defaultOptions) => {
    const tsGenerator = new TypeScriptGenerator(options);
    const typeDefs = await tsGenerator.generate(schema);
    fs.writeFileSync(outputPath, typeDefs, 'utf-8');
};