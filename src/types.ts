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

    /** Add __typeName field to object types */
    addTypeName?: boolean;

    /**
     * By default, GQL types that implement interfaces will copy all interface field
     * E.g:
     *  interface A { keyA: String! }
     *  type B implements interface A { keyA: String! keyB: Int! }
     * The generated TypeScript of type B will have both keyA and keyB
     * Set this option to true to ignore the copy of keyA
     */
    minimizeInterfaceImplementation?: boolean;

    /** Config for generating resolvers */
    resolver?: {
        /** Name of your graphql context type. Default to `any` if not specified */
        contextType?: string;

        /**
         * You can either make your graphql context type global, so that the generated file can link to it,
         * or provide an import statement to be injected via this option
         */
        importContext?: string;
    };
}

export const defaultOptions: GenerateTypescriptOptions = {
    tabSpaces: 2,
    typePrefix: 'GQL',
    resolver: {
        contextType: 'any'
    }
};