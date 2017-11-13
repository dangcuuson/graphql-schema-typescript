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

## Usage

```javascript
import { generateTypeScriptTypes } from 'graphql-schema-typescript';

generateTypeScriptTypes(schema, myGQLSchema, options)
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


## TODO
- [ ] Generate resolver types
- [ ] More detailed API Documentation
- [ ] Integrate with Travis CI

## Change log
* v1.0.2: 
    * Change default prefix from `GQL_` to `GQL`
    * Add config options: allow to generate types under a global or namespace declaration