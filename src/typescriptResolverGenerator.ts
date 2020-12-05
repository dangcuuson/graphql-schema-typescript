import { GenerateTypescriptOptions } from './types';
import {
    isBuiltinType,
    createFieldRef,
    toUppercaseFirst
} from './utils';
import {
    IntrospectionScalarType,
    IntrospectionObjectType,
    IntrospectionInterfaceType,
    IntrospectionUnionType,
    IntrospectionNamedTypeRef,
    IntrospectionQuery,
    IntrospectionField
} from 'graphql';

export interface GenerateResolversResult {
    importHeader: string[];
    body: string[];
}

export class TSResolverGenerator {
    protected importHeader: string[] = [];
    protected resolverInterfaces: string[] = [];
    protected resolverObject: string[] = [];
    protected resolverResult: {
        [name: string]: string[]
    } = {};
    protected contextType: string;

    protected queryType?: IntrospectionNamedTypeRef;
    protected mutationType?: IntrospectionNamedTypeRef;
    protected subscriptionType?: IntrospectionNamedTypeRef;

    constructor(
        protected options: GenerateTypescriptOptions,
        protected introspectionResult: IntrospectionQuery
    ) {
        this.contextType = options.contextType || 'any';
        if (options.importStatements) {
            this.importHeader.push(...options.importStatements);
        }
    }

    public async generate(): Promise<GenerateResolversResult> {
        const { introspectionResult } = this;
        const gqlTypes = introspectionResult.__schema.types.filter(type => !isBuiltinType(type));
        this.queryType = introspectionResult.__schema.queryType;
        this.mutationType = introspectionResult.__schema.mutationType;
        this.subscriptionType = introspectionResult.__schema.subscriptionType;

        this.importHeader.push('/* tslint:disable */');
        this.importHeader.push('/* eslint-disable */');

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
            body: [
                ...this.resolverObject,
                ...this.resolverInterfaces,
                ...Object.values(this.resolverResult).map(v => v.join('\n'))
            ]
        };
    }

    private generateCustomScalarResolver(scalarType: IntrospectionScalarType) {
        this.resolverObject.push(`${scalarType.name}${this.getModifier()}: GraphQLScalarType;`);
    }

    private generateTypeResolver(type: IntrospectionUnionType | IntrospectionInterfaceType) {
        const possbileTypes = type.possibleTypes.map(pt => `'${pt.name}'`);
        const interfaceName = `${this.options.typePrefix}${type.name}TypeResolver`;
        const infoModifier = this.options.optionalResolverInfo ? '?' : '';

        this.resolverInterfaces.push(...[
            `export interface ${interfaceName}<TParent = ${this.guessTParent(type.name)}> {`,
            // tslint:disable-next-line:max-line-length
            `(parent: TParent, context: ${this.contextType}, info${infoModifier}: GraphQLResolveInfo): ${possbileTypes.join(' | ')} | Promise<${possbileTypes.join(' | ')}>;`,
            '}'
        ]);

        this.resolverObject.push(...[
            `${type.name}${this.getModifier()}: {`,
            `__resolveType: ${interfaceName}`,
            '};',
            ''
        ]);
    }

    private generateObjectResolver(objectType: IntrospectionObjectType, isSubscription: boolean = false) {
        const typeResolverName = `${this.options.typePrefix}${objectType.name}TypeResolver`;
        const typeResolverBody: string[] = [];
        const fieldResolversTypeDefs: string[] = [];

        objectType.fields.forEach(field => {
            // generate args type
            let argsType = '{}';

            let uppercaseFirstFieldName = toUppercaseFirst(field.name);

            if (field.args.length > 0) {
                argsType = `${objectType.name}To${uppercaseFirstFieldName}Args`;
                const argsBody: string[] = [];
                field.args.forEach(arg => {
                    const { fieldName, fieldType } = createFieldRef(arg, this.options.typePrefix, false);
                    argsBody.push(`${fieldName}: ${fieldType};`);
                });

                fieldResolversTypeDefs.push(...[
                    `export interface ${argsType} {`,
                    ...argsBody,
                    '}'
                ]);
            }

            // generate field type
            const fieldResolverName = `${objectType.name}To${uppercaseFirstFieldName}Resolver`;

            const TParent = this.guessTParent(objectType.name);
            const TResult = this.guessTResult(field);
            const infoModifier = this.options.optionalResolverInfo ? '?' : '';
            const returnType =
                this.options.asyncResult === 'always'
                    ? 'Promise<TResult>'
                    : !!this.options.asyncResult
                        ? 'TResult | Promise<TResult>'
                        : 'TResult';
            const subscriptionReturnType =
                this.options.asyncResult ? 'AsyncIterator<TResult> | Promise<AsyncIterator<TResult>>' : 'AsyncIterator<TResult>';
            const fieldResolverTypeDef = !isSubscription
                ? [
                    `export interface ${fieldResolverName}<TParent = ${TParent}, TResult = ${TResult}> {`,
                    `(parent: TParent, args: ${argsType}, context: ${this.contextType}, info${infoModifier}: GraphQLResolveInfo): ${returnType};`,
                    '}',
                    ''
                ]
                : [
                    `export interface ${fieldResolverName}<TParent = ${TParent}, TResult = ${TResult}> {`,
                    // tslint:disable-next-line:max-line-length
                    `resolve${this.getModifier()}: (parent: TParent, args: ${argsType}, context: ${this.contextType}, info${infoModifier}: GraphQLResolveInfo) => ${returnType};`,
                    // tslint:disable-next-line:max-line-length
                    `subscribe: (parent: TParent, args: ${argsType}, context: ${this.contextType}, info${infoModifier}: GraphQLResolveInfo) => ${subscriptionReturnType};`,
                    '}',
                    ''
                ];

            fieldResolversTypeDefs.push(...fieldResolverTypeDef);

            typeResolverBody.push(...[
                `${field.name}${this.getModifier()}: ${fieldResolverName}<TParent>;`
            ]);
        });

        this.resolverInterfaces.push(...[
            `export interface ${typeResolverName}<TParent = ${this.guessTParent(objectType.name)}> {`,
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

    // optional or required
    private getModifier() {
        return this.options.requireResolverTypes ? '' : '?';
    }

    private guessTParent(parentTypeName: string) {
        if (!this.options.smartTParent) {
            return 'any';
        }
        if (this.isRootType(parentTypeName)) {
            return this.options.rootValueType;
        }
        return `${this.options.typePrefix}${parentTypeName}`;
    }

    private guessTResult(field: IntrospectionField) {
        if (!this.options.smartTResult) {
            return 'any';
        }

        // e.g: GQLUserResult
        // TODO: this is an attempt to implement #8
        // it's not done yet (this.resolverResult is always empty)
        const TResultName = `${this.options.typePrefix}${field.name}Result`;

        if (this.resolverResult[TResultName]) {
            return TResultName;
        }

        // TODO: build TResult
        // set strict-nulls to always true so that fieldType could possibly null;
        const { fieldType } = createFieldRef(field, this.options.typePrefix, true);
        return fieldType;
    }

    private isRootType(typeName: string) {
        return !![
            this.queryType, this.mutationType, this.subscriptionType
        ].find(type => !!type && type.name === typeName);
    }
}
