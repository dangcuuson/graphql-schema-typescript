import { isBuiltinType } from './utils';
import { GenerateTypescriptOptions } from './types';
import {
    IntrospectionSchema,
    IntrospectionScalarType,
    IntrospectionObjectType,
    IntrospectionInputObjectType,
    IntrospectionInterfaceType,
    IntrospectionUnionType
} from 'graphql';

export class TSResolverGenerator {

    constructor(protected options: GenerateTypescriptOptions) {

    }

    private importHeader: string[] = [];
    private resolverInterfaces: string[] = [];
    private resolverRootObject: string[] = [];

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
        this.resolverRootObject.push(' '.repeat(this.options.tabSpaces) + `${this.options.typePrefix}${scalarType.name}: GraphQLScalarType`);
    }

    private generateTypeResolver(type: IntrospectionUnionType | IntrospectionInterfaceType) {
        const possbileTypes = type.possibleTypes.map(pt => this.options.typePrefix + pt.name);
        const interfaceName = `${this.options.typePrefix}${type.name}TypeResolver`;

        this.resolverInterfaces.push(...[
            `export interface ${interfaceName} {`,
            ' '.repeat(this.options.tabSpaces) + `(value: any, context: any, info: GraphQLResolveInfo): ${possbileTypes.join(' | ')}`,
            '}'
        ]);

        this.resolverRootObject.push(...[
            `${this.options.typePrefix}${type.name}: {`,
            ' '.repeat(this.options.tabSpaces) + `__resolveType: ${interfaceName}`
        ]);
    }

    private generateObjectResolver(objectType: IntrospectionObjectType | IntrospectionInputObjectType) {
        const options = this.options;
        const fields = objectType.kind === 'INPUT_OBJECT' ? objectType.inputFields : objectType.fields;

        fields.forEach(field => {
            const topLevelFieldResolverName = `${options.typePrefix}${objectType.name}${field.name}TopLevelResolver`;
            const nestedFieldResolverName = `${options.typePrefix}${objectType.name}${field.name}NestedResolver`;
        });

        this.resolverInterfaces.push(...[
            `export int`
        ]);

        this.resolverRootObject.push(...[
            `${this.options.typePrefix}${objectType.name}?: any`
        ]);
    }
}