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

    /** Config for generating resolvers */
    resolver?: {
        /** Name of your graphql context type. Default to `any` if not specified */
        contextType?: string;

        /**
         * You can either make the graphql context type public, or provide an
         * import statement to be injected via this option
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