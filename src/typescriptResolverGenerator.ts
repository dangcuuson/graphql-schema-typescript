import { isBuiltinType, getFieldRef, gqlScalarToTS, createFieldRef } from './utils';
import { GenerateTypescriptOptions } from './types';
import {
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

export class TSResolverGenerator {
    protected importHeader: string[] = [];
    protected resolverInterfaces: string[] = [];
    protected resolverRootObject: string[] = [];
    protected contextType: string;

    constructor(protected options: GenerateTypescriptOptions) {
        this.contextType = options.resolver!.contextType;
    }

    public generate(schema: IntrospectionSchema): string[] {

        const gqlTypes = schema.types.filter(type => !isBuiltinType(type));

        const hasCustomScalar = !!gqlTypes.find(type => type.kind === 'SCALAR');
        if (hasCustomScalar) {
            this.importHeader.push(`import { GraphQLResolveInfo, GraphQLScalarType } from 'graphql'`);
        } else {
            this.importHeader.push(`import { GraphQLResolveInfo } from 'graphql'`);
        }

        this.resolverRootObject = [`export interface ${this.options.typePrefix}Resolver {`];

        gqlTypes.map(type => {
            switch (type.kind) {
                case 'SCALAR': {
                    this.generateCustomScalarResolver(type);
                    break;
                }

                case 'OBJECT':
                case 'INPUT_OBJECT': {
                    break;
                }

                case 'INTERFACE':
                case 'UNION': {
                    break;
                }

                default: {
                    break;
                }
            }
        });

        this.resolverRootObject.push('}');

        return [];
    }

    private generateCustomScalarResolver(scalarType: IntrospectionScalarType) {
        this.resolverRootObject.push(`${this.options.typePrefix}${scalarType.name}: GraphQLScalarType,`);
    }

    private generateTypeResolver(type: IntrospectionUnionType | IntrospectionInterfaceType) {
        const possbileTypes = type.possibleTypes.map(pt => this.options.typePrefix + pt.name);
        const interfaceName = `${this.options.typePrefix}${type.name}TypeResolver`;

        this.resolverInterfaces.push(...[
            `export interface ${interfaceName} {`,
            `(value: any, context: ${this.contextType}, info: GraphQLResolveInfo): ${possbileTypes.join(' | ')}`,
            '}'
        ]);

        this.resolverRootObject.push(...[
            `${type.name}: {`,
            `__resolveType: ${interfaceName}`,
            '},'
        ]);
    }

    private generateObjectResolver(objectType: IntrospectionObjectType) {
        const options = this.options;

        this.resolverRootObject.push(...[
            `${objectType.name}?: {`
        ]);

        objectType.fields.forEach(field => {
            // generate args type
            const argsName = `${objectType.name}To${field.name}Args`;
            const argsBody: string[] = [];
            field.args.forEach(arg => {
                const argRefField = getFieldRef(arg);

                let argRefName = argRefField.refName;

                if (argRefField.refKind === 'SCALAR') {
                    argRefName = gqlScalarToTS(argRefName, this.options.typePrefix);
                } else if (!isBuiltinType({ name: argRefName, kind: argRefField.refKind })) {
                    argRefName = this.options.typePrefix + refName;
                }

                const argFieldNameAndType = createFieldRef(field.name, refName, fieldModifier);
                argsBody.push(argFieldNameAndType);
            });

            this.resolverInterfaces.push(...[
                `interface ${argsName} {`,
                ...argsBody,
                '}'
            ]);
            const argsType = field.args.length === 0 ? '{ }' : argsName;

            // generate field type
            const fieldResolverName = `${objectType.name}To${field.name}Resolver`;

            let { fieldModifier, refKind, refName } = getFieldRef(field);
            if (refKind === 'SCALAR') {
                refName = gqlScalarToTS(refName, this.options.typePrefix);
            } else if (!isBuiltinType({ name: refName, kind: refKind })) {
                refName = this.options.typePrefix + refName;
            }

            const fieldNameAndType = createFieldRef(field.name, refName, fieldModifier);

            this.resolverInterfaces.push(...[
                `interface ${fieldResolverName} {`,
                `(parent: any, args: ${argsType}, context: ${this.contextType}, info: GraphQLResolveInfo): any`,
                '}'
            ]);

            this.resolverRootObject.push(...[
                `${field.name}?: ${fieldResolverName}`
            ]);
        });

        this.resolverRootObject.push(...[
            '},'
        ]);
    }
}