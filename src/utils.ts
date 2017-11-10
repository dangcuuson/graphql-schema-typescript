import {
    graphql,
    introspectionQuery,
    GraphQLSchema,
    IntrospectionQuery,
    IntrospectionType,
    IntrospectionField,
    IntrospectionInputValue,
    IntrospectionEnumValue,
    IntrospectionTypeRef,
    IntrospectionListTypeRef,
    IntrospectionNamedTypeRef
} from 'graphql';

/**
 * Send introspection query to a graphql schema
 */
export const introspectSchema = async (schema: GraphQLSchema): Promise<IntrospectionQuery> => {
    const { data, errors } = await graphql({ schema: schema, source: introspectionQuery });

    if (errors) {
        throw errors;
    }

    return data as IntrospectionQuery;
};

/**
 * Check if type is a built-in graphql type
 */
export const isBuiltinType = (type: IntrospectionType): boolean => {
    const builtInScalarNames = ['Int', 'Float', 'String', 'Boolean', 'ID'];
    const builtInEnumNames = ['__TypeKind', '__DirectiveLocation'];
    const builtInObjectNames = ['__Schema', '__Type', '__Field', '__InputValue', '__Directive', '__EnumValue'];

    return type.kind === 'SCALAR' && builtInScalarNames.indexOf(type.name) !== -1
        || type.kind === 'ENUM' && builtInEnumNames.indexOf(type.name) !== -1
        || type.kind === 'OBJECT' && builtInObjectNames.indexOf(type.name) !== -1
};

export interface GraphqlDescription {
    description?: string;
    isDeprecated?: boolean;
    deprecationReason?: string;
}

/**
 * Convert description and deprecated directives into JSDoc
 */
export const descriptionToJSDoc = (description: GraphqlDescription): string[] => {
    let line = description.description || '';

    const { isDeprecated, deprecationReason } = description;
    if (isDeprecated) {
        line += '\n@deprecated';
        if (deprecationReason) {
            line += ' ' + deprecationReason;
        }
    }

    if (!line) {
        return [];
    }

    const lines = line.split('\n').map(line => ' * ' + line);
    return [
        '/**',
        ...lines,
        ' */'
    ];
};

export interface FieldType {
    fieldModifier: string;
    isRefScalar: boolean;
    refName: string;
}
export const getFieldType = (field: IntrospectionField | IntrospectionInputValue): FieldType => {
    let fieldModifier: string[] = [];

    let typeRef = field.type;
    
    while (typeRef.kind === 'NON_NULL' || typeRef.kind === 'LIST') {
        fieldModifier.push(typeRef.kind);
        typeRef = (typeRef as IntrospectionListTypeRef).ofType!
    }

    return {
        fieldModifier: fieldModifier.join(' '),
        isRefScalar: (typeRef as IntrospectionNamedTypeRef).kind === 'SCALAR',
        refName: (typeRef as IntrospectionNamedTypeRef).name
    }
};