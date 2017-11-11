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
import { generateTypeScriptTypes } from 'graphql-schema-typescript'

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

* `schema`: your graphql schema
* `outputPath`: where the types is generated
* `options`: see [GenerateTypescriptOptions](./src/types.ts)


## TODO

- [ ] Write tests
- [ ] Generate resolver types

