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
    IntrospectionInputValue
} from 'graphql';

/**
 * Send introspection query to a graphql schema
 */
export const introspectSchema = async (schema: GraphQLSchema): Promise<IntrospectionQuery> => {
    const { data, errors } = await graphql(schema, introspectionQuery);

    if (errors) {
        throw errors;
    }

    return data as IntrospectionQuery;
};

async function introspectSchemaStr(schemaStr: string): Promise<IntrospectionQuery> {
    const schema = buildASTSchema(parse(schemaStr));
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
    const files = klawSync(path, /\.(graphql|gql)$/);
    const allTypeDefs = files.map(filePath => fs.readFileSync(filePath, 'utf-8')).join('\n');
    return await introspectSchemaStr(allTypeDefs);
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
    fieldType: any;
    refName: string;
    refKind: string;
    fieldModifier: string;
}

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

const gqlScalarToTS = (scalarName: string, typePrefix: string): string => {
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

const getTypeToTS = (field: any, prefix: string, nonNullable: boolean = false): string => {
    let tsType = '';

    if (field.kind === 'NON_NULL') {
        return getTypeToTS(field.ofType, prefix, true);
    }

    if (field.kind === 'LIST') {
        tsType = getTypeToTS(field.ofType, prefix, false);
        tsType = `Array<${tsType}>`;
    } else {
        tsType = gqlScalarToTS(field.name, prefix);
    }

    if (!nonNullable) {
        tsType = `${tsType} | null`;
    }

    return tsType;
};

export const createFieldRef = (
    field: IntrospectionField | IntrospectionInputValue,
    prefix: string,
    strict: boolean
): { fieldName: string; fieldType: string; } => {
    const nullable = field.type.kind !== 'NON_NULL';
    let fieldName = '';
    let fieldType = '';

    if (!strict && nullable) {
        fieldName = `${field.name}?`;
        fieldType = getTypeToTS(field.type, prefix, true);
    } else {
        fieldName = `${field.name}`;
        fieldType = getTypeToTS(field.type, prefix, false);
    }
    return { fieldName, fieldType };
};

export const toUppercaseFirst = (value: string): string => {
    return value.charAt(0).toUpperCase() + value.slice(1);
};
