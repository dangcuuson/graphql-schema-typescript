import { version } from 'typescript';
import { defaultGenerateTypescriptOptions, GenerateTypescriptOptions, CustomScalarOption } from './types';
import * as compareVersions from 'compare-versions';
import { version as TSVersion } from 'typescript';
import { introspectSchema, isBuiltinType, descriptionToJSDoc, getFieldType } from './utils';
import {
    GraphQLSchema,
    GraphQLScalarType,
    IntrospectionType,
    IntrospectionSchema,
    IntrospectionScalarType,
    IntrospectionEnumType,
    IntrospectionObjectType,
    IntrospectionField,
    IntrospectionUnionType,
    IntrospectionInputObjectType,
    IntrospectionInterfaceType
} from 'graphql';

export class TypeScriptGenerator {
    constructor(protected options: GenerateTypescriptOptions) { }

    public async generate(schema: GraphQLSchema): Promise<string> {

        const { __schema } = await introspectSchema(schema);
        const gqlTypes = __schema.types.filter(type => !isBuiltinType(type));

        return gqlTypes.reduce<string[]>((typeScriptDefs, gqlType) => {
            typeScriptDefs = typeScriptDefs.concat(descriptionToJSDoc({ description: gqlType.description }));

            switch (gqlType.kind) {
                case 'SCALAR': {
                    typeScriptDefs = typeScriptDefs.concat(this.generateCustomScalarType(gqlType));
                    break;
                }

                case 'ENUM': {
                    typeScriptDefs = typeScriptDefs.concat(this.generateEnumType(gqlType));
                    break;
                }

                case 'OBJECT':
                case 'INPUT_OBJECT':
                case 'INTERFACE': {
                    typeScriptDefs = typeScriptDefs.concat(this.generateObjectType(gqlType));
                    break;
                }

                case 'UNION': {
                    typeScriptDefs = typeScriptDefs.concat(this.generateUnionType(gqlType));
                    break;
                }
                
                default: {
                    throw new Error(`Unknown type kind ${(gqlType as any).kind}`);
                }
            }

            typeScriptDefs.push('');

            return typeScriptDefs;

        }, []).join('\n');

    }

    private generateCustomScalarType(scalarType: IntrospectionScalarType): string[] {
        const customScalarType = this.options.customScalarType || {};
        if (customScalarType[scalarType.name]) {
            return [`export type ${scalarType.name} = ${customScalarType[scalarType.name]};`];
        }

        return [`export type ${scalarType.name} = any;`];
    }

    private generateEnumType(enumType: IntrospectionEnumType): string[] {

        // if using old typescript, which doesn't support string enum: convert enum to string union
        if (compareVersions(TSVersion, '2.5.2') === -1) {
            return this.createUnionType(enumType.name, enumType.enumValues.map(v => `'${v.name}'`));
        }

        let enumBody = enumType.enumValues.reduce<string[]>((typescriptDefs, enumValue, index) => {
            const jsDoc = descriptionToJSDoc(enumValue);

            const isLastEnum = index === enumType.enumValues.length - 1;

            if (!isLastEnum) {
                typescriptDefs = typescriptDefs.concat(jsDoc, `${enumValue.name} = "${enumValue.name}",`);
            } else {
                typescriptDefs = typescriptDefs.concat(jsDoc, `${enumValue.name} = "${enumValue.name}"`);
            }

            if (jsDoc.length > 0) {
                typescriptDefs.push('');
            }

            return typescriptDefs;

        }, []);

        return [
            `export enum ${enumType.name} {`,
            ...enumBody.map(line => ' '.repeat(this.options.tabSpaces) + line),
            '}'
        ];
    };

    private generateObjectType(objectType: IntrospectionObjectType | IntrospectionInputObjectType | IntrospectionInterfaceType): string[] {
        const jsDoc = descriptionToJSDoc(objectType);

        let fields = objectType.kind === 'INPUT_OBJECT' ? objectType.inputFields : objectType.fields;

        const objectFields = fields.reduce<string[]>((typescriptDefs, field, index) => {

            let fieldJsDoc = descriptionToJSDoc(field);
            let fieldNameAndType = '';

            let { refName, isRefScalar, fieldModifier } = getFieldType(field);
            if (isRefScalar) {
                refName = this.gqlScalarToTypescript(refName);
            }

            switch (fieldModifier) {
                case '': {
                    fieldNameAndType = `${field.name}?: ${refName};`;
                    break;
                }

                case 'NON_NULL': {
                    fieldNameAndType = `${field.name}: ${refName};`;
                    break;
                }

                case 'LIST': {
                    fieldNameAndType = `${field.name}?: (${refName} | null)[];`;
                    break;
                }

                case 'LIST NON_NULL': {
                    fieldNameAndType = `${field.name}?: ${refName}[];`;
                    break;
                }

                case 'NON_NULL LIST': {
                    fieldNameAndType = `${field.name}: (${refName} | null)[];`;
                    break;
                }

                case 'NON_NULL LIST NON_NULL': {
                    fieldNameAndType = `${field.name}: ${refName}[];`;
                    break;
                }

                default: {
                    throw new Error(`We are reach the fieldModifier level that should not be exists: ${fieldModifier}`);
                }
            }

            typescriptDefs = typescriptDefs.concat(fieldJsDoc, fieldNameAndType);

            if (fieldJsDoc.length > 0) {
                typescriptDefs.push('');
            }

            return typescriptDefs;

        }, []);


        return [
            `export interface ${objectType.name} {`,
            ...objectFields.map(line => ' '.repeat(this.options.tabSpaces) + line),
            '}'
        ];
    }

    private generateUnionType(unionType: IntrospectionUnionType): string[] {
        return this.createUnionType(unionType.name, unionType.possibleTypes.map(t => t.name));
    }

    private gqlScalarToTypescript = (scalarName: string): string => {
        const customScalarType = this.options.customScalarType || {};

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
                return scalarName;
        }
    };

    /**
     * Create a union type e.g: type Color = 'Red' | 'Green' | 'Blue' | ...
     * Also, if the type is too long to fit in one line, split them info multiple lines
     * => type Color = 'Red'
     *      | 'Green'
     *      | 'Blue'
     *      | ...
     */
    private createUnionType(typeName: string, possibleTypes: string[]): string[] {
        let result = `export type ${typeName} = ${possibleTypes.join(' | ')};`;
        if (result.length <= 80) {
            return [result];
        }

        return result
            .replace(new RegExp(' | ', 'g'), ' |\n')
            .split('\n')
            .map((line, index) => {
                if (index === 0) {
                    return line;
                }

                return ' '.repeat(this.options.tabSpaces) + line;
            });
    }
}