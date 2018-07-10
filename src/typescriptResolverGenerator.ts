import { GenerateTypescriptOptions } from './types';
import {
    isBuiltinType,
    gqlScalarToTS,
    createFieldRef,
    toUppercaseFirst
} from './utils';
import {
    IntrospectionScalarType,
    IntrospectionObjectType,
    IntrospectionInterfaceType,
    IntrospectionUnionType
} from 'graphql';
import { IntrospectionQuery } from 'graphql/utilities/introspectionQuery';

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
        this.contextType = options.contextType || 'any';
        if (options.importStatements) {
            this.importHeader.push(...options.importStatements);
        }
    }

    public async generate(introspectionResult: IntrospectionQuery): Promise<GenerateResolversResult> {

        const gqlTypes = introspectionResult.__schema.types.filter(type => !isBuiltinType(type));

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

        gqlTypes.forEach(type => {
            const isSubscription = introspectionResult.__schema.subscriptionType ?
                introspectionResult.__schema.subscriptionType.name === type.name
                : false;

            switch (type.kind) {
                case 'SCALAR': {
                    this.generateCustomScalarResolver(type);
                    break;
                }

                case 'OBJECT': {
                    this.generateObjectResolver(type, isSubscription);
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
        this.resolverObject.push(`${scalarType.name}${this.getModifier()}: GraphQLScalarType;`);
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
            `${type.name}${this.getModifier()}: {`,
            `__resolveType: ${interfaceName}`,
            '};',
            ''
        ]);
    }

    // optional or required
    private getModifier() {
        return this.options.requireResolverTypes ? '' : '?';
    }

    private generateObjectResolver(objectType: IntrospectionObjectType, isSubscription: boolean = false) {
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
                    const argFieldNameAndType = createFieldRef(arg, this.options.typePrefix, false);
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

            const fieldResolverTypeDef = !isSubscription
                ? [
                    `export interface ${fieldResolverName}<TParent = any, TResult = any> {`,
                    // TODO: some strategy to support parent type and return type
                    `(parent: TParent, args: ${argsType}, context: ${this.contextType}, info: GraphQLResolveInfo): TResult;`,
                    '}',
                    ''
                ]
                : [
                    `export interface ${fieldResolverName}<TParent = any, TResult = any> {`,
                    // tslint:disable-next-line:max-line-length
                    `resolve${this.getModifier()}: (parent: TParent, args: ${argsType}, context: ${this.contextType}, info: GraphQLResolveInfo) => TResult;`,
                    `subscribe: (parent: TParent, args: ${argsType}, context: ${this.contextType}, info: GraphQLResolveInfo) => TResult;`,
                    '}',
                    ''
                ];

            fieldResolversTypeDefs.push(...fieldResolverTypeDef);

            typeResolverBody.push(...[
                `${field.name}${this.getModifier()}: ${fieldResolverName}<TParent>;`
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
            `${objectType.name}${this.getModifier()}: ${typeResolverName};`
        ]);
    }
}
