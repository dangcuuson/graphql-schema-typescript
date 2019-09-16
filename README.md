# A GraphQL utility to generate Typescript from Schema Definition

This project is inspired by Apollo-codegen. Currently apollo-codegen 
only generate TypeScripts for GraphQL Client. 
The shape of the generated type is based on the client's query strings.

This module aim to do the Server counterpart: from a Schema Definition, generate the 
types to make it type-safed when developing GraphQL server (mainly resolvers)

## Features

### Generate Typescript from Schema Definition (1-1 mapping from GQL type to TypeScript)
### Convert GraphQL description into JSDoc, include deprecated directive
### [Generate TypeScripts to support writing resolvers](#type-resolvers)
### [VSCode extension](#https://github.com/liyikun/vscode-graphql-schema-typescript) (credit to [@liyikun](https://github.com/liyikun))

## Usage

```javascript
import { generateTypeScriptTypes } from 'graphql-schema-typescript';

generateTypeScriptTypes(schema, outputPath, options)
    .then(() => {
        console.log('DONE');
        process.exit(0);
    })
    .catch(err =>{
        console.error(err);
        process.exit(1);
    });

```

You can then bootstrap this script on your dev server, 
or use something like [ts-node](#https://github.com/TypeStrong/ts-node) to execute it directly

* `schema`: your graphql schema
* `outputPath`: where the types is generated
* `options`: see [GenerateTypescriptOptions](./src/types.ts)

## CLIs
* You can also use CLIs to generate your TypeScript instead of writing code
* Instead of providing a schema, you need to provide a folder that contains your type definitions,
written in .gql or .graphql extensions
* Use `graphql-schema-typescript generate-ts --help` for more details

## Type Resolvers
The file generated will have some types that can make it type-safed when writing resolver:

* Args type in your resolve function is now type-safed
* Parent type and resolve result is default to `any`, but could be overwritten in your code

For example, if you schema is like this:
```gql
schema {
    query: RootQuery
}

type RootQuery {
    Users(input: UserFilter): [User!]!
    # ... some more fields here
}

input UserFilter {
    username: [String]
}

type User {
    firstName: String!
    # ... some more fields here
}

```
Then the tools will generate TypeScripts like this:
```javascript
/**
 * This interface define the shape of your resolver
 * Note that this type is designed to be compatible with graphql-tools resolvers
 * However, you can still use other generated interfaces to make your resolver type-safed
 */
export interface GQLResolver {
  RootQuery?: GQLRootQueryTypeResolver;
  User?: GQLUserTypeResolver;
}

export interface GQLRootQueryTypeResolver {
  Users?: RootQueryToUsersResolver;
}

export interface RootQueryToUsersArgs {
  Users?: GQLUserFilter;
}

export interface RootQueryToUsersResolver<TParent = any, TResult = any> {
  (parent: TParent, args: RootQueryToUsersArgs, context: any, info: GraphQLResolveInfo): TResult;
}
```

In this example, if you are not using [graphql-tools](https://www.npmjs.com/package/graphql-tools), 
you can still use `RootQueryToUsersResolver` type to make your args type safed.

## Default TParent & TResult

In version 1.2.2, a strategy for generating default TParent and TResult has been implemented
by setting `smartTParent` and `smartTResult` options to true.

If both options are set to true, the resolver will be generated as follow:
```javascript
// smartTParent: true
// smartTResult: true
// TParent is undefined because it uses the value of 'rootValueType' in options
export interface RootQueryToUsersResolver<TParent = undefined, TResult = Array<GQLUser> {
  (parent: TParent, args: RootQueryToUsersArgs, context: any, info: GraphQLResolveInfo): TResult;
}
```

However, since `RootQueryToUsersResolver` usually will be asynchronous operation,
the default TResult would not be too helpful, as developers would most likely overwrite it to `Promise<Array<GQLUser>>`. Therefore, another option , `asyncResult`, was implemented. This option
basically allow resolver to return promises


```javascript
// smartTParent: true
// smartTResult: true
// asyncResult: true
export interface RootQueryToUsersResolver<TParent = undefined, TResult = Array<GQLUser> {
  (parent: TParent, args: RootQueryToUsersArgs, context: any, info: GraphQLResolveInfo): Promise<TResult> | TResult; // the different is here
}
```

```javascript
// in v1.12.11, asyncResult also accept string value 'always', 
// which will make returns value of resolve functions to be `Promise<TResult>`,
// due to an issue with VSCode that not showing auto completion when returns is a mix of `T | Promise<T>` (see [#17](https://github.com/dangcuuson/graphql-schema-typescript/issues/17))

// smartTParent: true
// smartTResult: true
// asyncResult: 'always'
export interface RootQueryToUsersResolver<TParent = undefined, TResult = Array<GQLUser> {
  (parent: TParent, args: RootQueryToUsersArgs, context: any, info: GraphQLResolveInfo): Promise<TResult>; // the different is here

```