import * as fs from 'fs';
import * as path from 'path';
import { makeExecutableSchema } from 'graphql-tools';
import { GraphQLSchema, introspectionQuery, graphql } from 'graphql';

const gqlFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.gql') || f.endsWith('.graphql'));

const typeDefs = gqlFiles.map(filePath => fs.readFileSync(path.join(__dirname, filePath), 'utf-8'));

export const testSchema: GraphQLSchema = makeExecutableSchema({
    typeDefs: typeDefs
});