# A GraphQL utility to generate Typescript from Schema Definition

This project is inspired by Apollo-codegen. Currently apollo-codegen 
only generate TypeScripts for GraphQL Client. 
The shape of the generated type is based on the client's query strings.

This module aim to do the Server counterpart: from a Schema Definition, generate the 
types to make it type-safed when developing GraphQL server (mainly resolvers)

## Features

### Generate Typescript from Schema Definition
### Support [Typescript string enum](https://github.com/Microsoft/TypeScript/wiki/What's-new-in-TypeScript#typescript-25) with fallback to string union (fallback not tested yet)
### Convert GraphQL description into JSDoc
### Also add deprecated field and reason into JSDoc
### [Generate TypeScripts to support writing resolvers](#type-resolvers)

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

## Type Resolvers
The file generated will have some types that can make it type-safed when writing resolver:

* Args type in your resolve function is now type-safed
* Parent type and resolve result is still `any`, but could be overwritten in your code

For example, if you schema is like this:
```
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

## TODO
- [ ] More detailed API Documentation
- [ ] Integrate with Travis CI

## Change log
* v1.0.6:
    * Generate TypeScript for resolvers. See [Type Resolvers](#type-resolvers)
* v1.0.4: 
    * If types is generated under global scope, use string union instead of string enum

* v1.0.2: 
    * Change default prefix from `GQL_` to `GQL`
    * Add config options: allow to generate types under a global or namespace declaration
