import { GenerateTypescriptOptions } from './types';
import { 
    introspectSchema, 
    isBuiltinType, 
    getFieldRef, 
    gqlScalarToTS, 
    createFieldRef,
    toUppercaseFirst
} from './utils';
import {
    GraphQLSchema,
    IntrospectionSchema,
    IntrospectionScalarType,
    IntrospectionObjectType,
    IntrospectionInputObjectType,
    IntrospectionInterfaceType,
    IntrospectionUnionType
} from 'graphql';

const resolveResult = [
    'type ResolveResult<T> = {',
    '[K in keyof T]?: T[K] | ResolveResult<T[K]> | NestedFieldResolver<T[K>;',
    '}'
];

const nestedFieldResolver = (contextType: string) => {
    return [
        'interface NestedFieldResolver<T> {',
        `(args: any, context: ${contextType}, info: GraphQLResolveInfo): T`,
        '}'
    ];
};

export interface GenerateResolversResult {
    importHeader: string[];
    body: string[];
}

export class TSResolverGenerator {
    protected importHeader: string[] = [];
    protected resolverInterfaces: string[] = [];
    protected resolverObject: string[] = [];
    protected contextType: string;

    constructor(protected options: GenerateTypescriptOptions) {
        if (options.resolver) {
            this.contextType = options.resolver.contextType;
            if (options.resolver.importContext) {
                this.importHeader.push(options.resolver.importContext);
            }
        } else {
            this.contextType = 'any';
        }
    }

    public async generate(schema: GraphQLSchema): Promise<GenerateResolversResult> {

        const { __schema } = await introspectSchema(schema);
        const gqlTypes = __schema.types.filter(type => !isBuiltinType(type));

        const hasCustomScalar = !!gqlTypes.find(type => type.kind === 'SCALAR');
        if (hasCustomScalar) {
            this.importHeader.push(`import { GraphQLResolveInfo, GraphQLScalarType } from 'graphql';`);
        } else {
            this.importHeader.push(`import { GraphQLResolveInfo } from 'graphql';`);
        }

        this.resolverObject = [
            '/**',
            ' * This interface define the shape of your resolver',
            ' * Note that this type is designed to be compatible with graphql-tools resolvers',
            ' * However, you can still use other generated interfaces to make your resolver type-safed',
            ' */',
            `export interface ${this.options.typePrefix}Resolver {`
        ];

        gqlTypes.map(type => {
            switch (type.kind) {
                case 'SCALAR': {
                    this.generateCustomScalarResolver(type);
                    break;
                }

                case 'OBJECT': {
                    this.generateObjectResolver(type);
                    break;
                }

                case 'INTERFACE':
                case 'UNION': {
                    this.generateTypeResolver(type);
                    break;
                }

                case 'INPUT_OBJECT':
                default: {
                    break;
                }
            }
        });

        this.resolverObject.push('}');

        return {
            importHeader: this.importHeader,
            body: [...this.resolverObject, ...this.resolverInterfaces]
        };
    }

    private generateCustomScalarResolver(scalarType: IntrospectionScalarType) {
        this.resolverObject.push(`${scalarType.name}?: GraphQLScalarType;`);
    }

    private generateTypeResolver(type: IntrospectionUnionType | IntrospectionInterfaceType) {
        const possbileTypes = type.possibleTypes.map(pt => `'${pt.name}'`);
        const interfaceName = `${this.options.typePrefix}${type.name}TypeResolver`;

        this.resolverInterfaces.push(...[
            `export interface ${interfaceName}<TParent = any> {`,
            `(parent: TParent, context: ${this.contextType}, info: GraphQLResolveInfo): ${possbileTypes.join(' | ')};`,
            '}'
        ]);

        this.resolverObject.push(...[
            `${type.name}?: {`,
            `__resolveType: ${interfaceName}`,
            '};',
            ''
        ]);
    }

    private generateObjectResolver(objectType: IntrospectionObjectType) {
        const options = this.options;

        const typeResolverName = `${this.options.typePrefix}${objectType.name}TypeResolver`;
        const typeResolverBody: string[] = [];
        const fieldResolversTypeDefs: string[] = [];

        objectType.fields.forEach(field => {
            // generate args type
            let argsType = '{}';

            let uppercaseFisrtFieldName = toUppercaseFirst(field.name);

            if (field.args.length > 0) {
                argsType = `${objectType.name}To${uppercaseFisrtFieldName}Args`;
                const argsBody: string[] = [];
                field.args.forEach(arg => {
                    const argRefField = getFieldRef(arg);

                    let argRefName = argRefField.refName;

                    if (argRefField.refKind === 'SCALAR') {
                        argRefName = gqlScalarToTS(argRefName, this.options.typePrefix);
                    } else if (!isBuiltinType({ name: argRefName, kind: argRefField.refKind })) {
                        argRefName = this.options.typePrefix + argRefName;
                    }

                    const argFieldNameAndType = createFieldRef(arg.name, argRefName, argRefField.fieldModifier);
                    argsBody.push(argFieldNameAndType);
                });

                fieldResolversTypeDefs.push(...[
                    `export interface ${argsType} {`,
                    ...argsBody,
                    '}'
                ]);
            }

            // generate field type
            const fieldResolverName = `${objectType.name}To${uppercaseFisrtFieldName}Resolver`;

            fieldResolversTypeDefs.push(...[
                `export interface ${fieldResolverName}<TParent = any, TResult = any> {`,
                // TODO: some strategy to support parent type and return type
                `(parent: TParent, args: ${argsType}, context: ${this.contextType}, info: GraphQLResolveInfo): TResult;`,
                '}',
                ''
            ]);

            typeResolverBody.push(...[
                `${field.name}?: ${fieldResolverName}<TParent>;`
            ]);
        });

        this.resolverInterfaces.push(...[
            `export interface ${typeResolverName}<TParent = any> {`,
            ...typeResolverBody,
            '}',
            '',
            ...fieldResolversTypeDefs
        ]);

        // add the type resolver to resolver object
        this.resolverObject.push(...[
            `${objectType.name}?: ${typeResolverName};`
        ]);
    }
}