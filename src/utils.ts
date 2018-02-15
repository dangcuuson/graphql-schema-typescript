import * as fs from 'fs';
import { join } from 'path';
import {
    graphql,
    buildASTSchema,
    parse,
    introspectionQuery,
    GraphQLSchema,
    IntrospectionQuery,
    IntrospectionField,
    IntrospectionInputValue,
    IntrospectionListTypeRef,
    IntrospectionNamedTypeRef,
    ExecutionResult
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

export async function introspect(schemaContents: string): Promise<IntrospectionQuery> {
    const schema = buildASTSchema(parse(schemaContents));
    return introspectSchema(schema);
}

function klawSync(path: string, filterRegex: RegExp, fileNames: string[] = []) {
    const fileStat = fs.statSync(path);
    if (fileStat.isDirectory()) {
        const directory = fs.readdirSync(path);
        directory.forEach((f) => klawSync(join(path, f), filterRegex, fileNames));
    } else if (filterRegex.test(path)) {
        fileNames.push(path);
    }
    return fileNames;
}

export const introspectSchemaViaLocalFile = async (path: string): Promise<IntrospectionQuery> => {
    const files = klawSync(path, /\.gql|\.graphql$/);
    const allTypeDefs = files.map(filePath => fs.readFileSync(filePath, 'utf-8')).join('\n');
    return await introspect(allTypeDefs);
};

export interface SimpleTypeDescription {
    kind: string;
    name: string;
}
/**
 * Check if type is a built-in graphql type
 */
export const isBuiltinType = (type: SimpleTypeDescription): boolean => {
    const builtInScalarNames = ['Int', 'Float', 'String', 'Boolean', 'ID'];
    const builtInEnumNames = ['__TypeKind', '__DirectiveLocation'];
    const builtInObjectNames = ['__Schema', '__Type', '__Field', '__InputValue', '__Directive', '__EnumValue'];

    return type.kind === 'SCALAR' && builtInScalarNames.indexOf(type.name) !== -1
        || type.kind === 'ENUM' && builtInEnumNames.indexOf(type.name) !== -1
        || type.kind === 'OBJECT' && builtInObjectNames.indexOf(type.name) !== -1;
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

    const lines = line.split('\n').map(l => ' * ' + l);
    return [
        '/**',
        ...lines,
        ' */'
    ];
};

export interface FieldType {
    fieldModifier: string;
    refName: string;
    refKind: string;
}
export const getFieldRef = (field: IntrospectionField | IntrospectionInputValue): FieldType => {
    let fieldModifier: string[] = [];

    let typeRef = field.type;

    while (typeRef.kind === 'NON_NULL' || typeRef.kind === 'LIST') {
        fieldModifier.push(typeRef.kind);
        typeRef = (typeRef as IntrospectionListTypeRef).ofType!;
    }

    return {
        fieldModifier: fieldModifier.join(' '),
        refKind: (typeRef as IntrospectionNamedTypeRef).kind,
        refName: (typeRef as IntrospectionNamedTypeRef).name
    };
};

export const formatTabSpace = (lines: string[], tabSpaces: number): string[] => {
    let result: string[] = [];

    let indent = 0;
    for (let line of lines) {
        const trimmed = line.trim();

        if (trimmed.endsWith('}') || trimmed.endsWith('};')) {
            indent -= tabSpaces;
            if (indent < 0) {
                indent = 0;
            }
        }

        result.push(' '.repeat(indent) + line);

        if (trimmed.endsWith('{')) {
            indent += tabSpaces;
        }
    }

    return result;
};

export const createFieldRef = (fieldName: string, refName: string, fieldModifier: string): string => {
    switch (fieldModifier) {
        case '': {
            return `${fieldName}?: ${refName};`;
        }

        case 'NON_NULL': {
            return `${fieldName}: ${refName};`;
        }

        case 'LIST': {
            return `${fieldName}?: (${refName} | null)[];`;
        }

        case 'LIST NON_NULL': {
            return `${fieldName}?: ${refName}[];`;
        }

        case 'NON_NULL LIST': {
            return `${fieldName}: (${refName} | null)[];`;
        }

        case 'NON_NULL LIST NON_NULL': {
            return `${fieldName}: ${refName}[];`;
        }

        case 'LIST NON_NULL LIST NON_NULL': {
            return `${fieldName}?: ${refName}[][];`;
        }

        case 'NON_NULL LIST NON_NULL LIST NON_NULL': {
            return `${fieldName}: ${refName}[][];`;
        }

        // TODO: make it to handle any generic case

        default: {
            throw new Error(`We are reaching the fieldModifier level that should not exists: ${fieldModifier}`);
        }
    }
};

export const gqlScalarToTS = (scalarName: string, typePrefix: string): string => {
    switch (scalarName) {
        case 'Int':
        case 'Float':
            return 'number';

        case 'String':
        case 'ID':
            return 'string';

        case 'Boolean':
            return 'boolean';

        default:
            return typePrefix + scalarName;
    }
};

export const toUppercaseFirst = (value: string): string => {
    return value.charAt(0).toUpperCase() + value.slice(1);
};