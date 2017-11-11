export interface GenerateTypescriptOptions {
    /**
     * A map from custom gql scalar type to its corresponding typescript type
     */
    customScalarType?: {
        [scalarName: string]: string;
    };

    /** Tab format, default to 2 */
    tabSpaces?: number;

    /** A prefix to every generated types. Default to GQL_ */
    typePrefix?: string;
}

export const defaultOptions: GenerateTypescriptOptions = {
    tabSpaces: 2,
    typePrefix: 'GQL_'
};