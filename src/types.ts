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
}

export const defaultOptions: GenerateTypescriptOptions = {
    tabSpaces: 2,
    typePrefix: 'GQL',
    contextType: 'any',
    strictNulls: false,
};
