export interface GenerateTypescriptOptions {
    /**
     * A map from custom gql scalar type to its corresponding typescript type
     */
    customScalarType?: {
        [scalarName: string]: string;
    };

    /** Tab format, default to 2 */
    tabSpaces?: number;
}

export const defaultGenerateTypescriptOptions: GenerateTypescriptOptions = {
    customScalarType: {},
    tabSpaces: 2
};