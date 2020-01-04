export interface GenerateTypescriptOptions {
    /**
     * A map from custom gql scalar type to its corresponding typescript type
     */
    customScalarType?: {
        [scalarName: string]: string;
    };

    /** Tab format, default to 2 */
    tabSpaces?: number;

    /** A prefix to every generated types. Default to GQL */
    typePrefix?: string;

    /** Generate types as global */
    global?: boolean;

    /** Add types under a namespace */
    namespace?: string;

    /**
     * By default, GQL types that implement interfaces will copy all interface field
     * E.g:
     *  interface A { keyA: String! }
     *  type B implements interface A { keyA: String! keyB: Int! }
     * The generated TypeScript of type B will have both keyA and keyB
     * Set this option to true to ignore the copy of keyA
     */
    minimizeInterfaceImplementation?: boolean;

    /** Name of your graphql context type. Default to `any` if not specified */
    contextType?: string;

    /** Name of your graphql rootValue type, Default to `undefined` if not specified */
    rootValueType?: string;

    /**
     * Import statements at the top of the generated file
     * that import your custom scalar type and context type
     */
    importStatements?: string[];

    /**
     * Set optional properties as nullable instead of undefined
     * E.g:
     * withoutStrict?: string
     * withStrict: string|null;
     */
    strictNulls?: boolean;

    /**
     * This option is for resolvers
     * If true, the lib will try to guest the most appropriate 
     * default TResult type of resolvers (instead of default to 'any')
     * 
     * e.g: 
     * schema { query: Query }
     * type Query { users: [Users!] }
     * type User { username: String! }
     * 
     * =>   interface QueryToUsersResolver<TParent = any, TResult = User[] | null> { ... }
     *      interface UserToUsernameResolver<TParent = any, TResult = string> { ... }
     */
    smartTResult?: boolean;

    /**
     * This option is for resolvers
     * If true, the lib will try to guest the most appropriate 
     * default TParent type of resolvers (instead of default to 'any')
     * 
     * e.g: 
     * schema { query: Query }
     * type Query { users: [Users!] }
     * type User { username: String! }
     * 
     * =>   interface QueryToUsersResolver<TParent = rootValueType, TResult = any> { ... }
     *      interface UserToUsernameResolver<TParent = User, TResullt = any> { ... }
     */
    smartTParent?: boolean;

    /**
     * This option is for resolvers
     * If true, set return type of resolver to `TResult | Promise<TResult>`
     * If 'awalys', set return type of resolver to `Promise<TResult>`
     * 
     * e.g: interface QueryToUsersResolver<TParent = any, TResult = any> {
     *  (parent: TParent, args: {}, context: any, info): TResult extends Promise ? TResult : TResult | Promise<TResult>
     * }
     */
    asyncResult?: boolean | 'always';

    /**
     * If true, field resolver of each type will be required, instead of optional
     * Useful if you want to ensure all fields are resolved
     */
    requireResolverTypes?: boolean;

    /**
     * If true, generate enum type as string union instead of TypeScript's string enum
     */
    noStringEnum?: boolean;

    /**
     * If true resolver info arguements will be marked as optional
     */
    optionalResolverInfo?: boolean;

    /**
     * If true, enum values are converted to PascalCase.
     */
    enumsAsPascalCase?: boolean;
}

export const defaultOptions: GenerateTypescriptOptions = {
    tabSpaces: 2,
    typePrefix: 'GQL',
    contextType: 'any',
    rootValueType: 'undefined',
    strictNulls: false,
};