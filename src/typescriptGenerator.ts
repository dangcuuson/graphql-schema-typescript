import { GenerateTypescriptOptions } from './types';
import { versionMajorMinor as TSVersion } from 'typescript';
import { introspectSchema, isBuiltinType, descriptionToJSDoc, getFieldType } from './utils';
import { TSResolverGenerator } from './typescriptResolverGenerator';
import {
    GraphQLSchema,
    IntrospectionScalarType,
    IntrospectionEnumType,
    IntrospectionObjectType,
    IntrospectionUnionType,
    IntrospectionInputObjectType,
    IntrospectionInterfaceType
} from 'graphql';

export class TypeScriptGenerator {
    protected resolverGenerator: TSResolverGenerator;

    constructor(protected options: GenerateTypescriptOptions) {
        this.resolverGenerator = new TSResolverGenerator(options);
    }

    public async generate(schema: GraphQLSchema): Promise<string[]> {

        const { __schema } = await introspectSchema(schema);
        const gqlTypes = __schema.types.filter(type => !isBuiltinType(type));

        return gqlTypes.reduce<string[]>(
            (prevTypescriptDefs, gqlType) => {

                const jsDoc = descriptionToJSDoc({ description: gqlType.description });
                let typeScriptDefs: string[] = [].concat(jsDoc);

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

                return prevTypescriptDefs.concat(typeScriptDefs);

            },
            []
        );

    }

    private generateCustomScalarType(scalarType: IntrospectionScalarType): string[] {
        const customScalarType = this.options.customScalarType || {};
        if (customScalarType[scalarType.name]) {
            return [`export type ${this.options.typePrefix}${scalarType.name} = ${customScalarType[scalarType.name]};`];
        }

        return [`export type ${this.options.typePrefix}${scalarType.name} = any;`];
    }

    private isStringEnumSupported(): boolean {
        const [major, minor] = TSVersion.split('.').map(v => +v);
        return (major === 2 && minor >= 5) || major > 2;
    }

    private generateEnumType(enumType: IntrospectionEnumType): string[] {

        // if using old typescript, which doesn't support string enum: convert enum to string union
        if (!this.isStringEnumSupported()) {
            return this.createUnionType(enumType.name, enumType.enumValues.map(v => `'${v.name}'`));
        }

        // if generate as global, don't generate string enum as it requires import
        if (this.options.global) {
            return [
                ...this.createUnionType(enumType.name, enumType.enumValues.map(v => `'${v.name}'`)),
                `// NOTE: enum ${enumType.name} is generate as string union instead of string enum because the types is generated under global scope`
            ];
        }

        let enumBody = enumType.enumValues.reduce<string[]>(
            (prevTypescriptDefs, enumValue, index) => {
                let typescriptDefs: string[] = [];
                const enumValueJsDoc = descriptionToJSDoc(enumValue);

                const isLastEnum = index === enumType.enumValues.length - 1;

                if (!isLastEnum) {
                    typescriptDefs = [...enumValueJsDoc, `${enumValue.name} = '${enumValue.name}',`];
                } else {
                    typescriptDefs = [...enumValueJsDoc, `${enumValue.name} = '${enumValue.name}'`];
                }

                if (enumValueJsDoc.length > 0) {
                    typescriptDefs = ['', ...typescriptDefs];
                }

                return prevTypescriptDefs.concat(typescriptDefs);

            },
            []
        );

        return [
            `export enum ${this.options.typePrefix}${enumType.name} {`,
            ...enumBody,
            '}'
        ];
    }

    private generateObjectType(objectType: IntrospectionObjectType | IntrospectionInputObjectType | IntrospectionInterfaceType): string[] {
        let fields = objectType.kind === 'INPUT_OBJECT' ? objectType.inputFields : objectType.fields;

        const objectFields = fields.reduce<string[]>(
            (prevTypescriptDefs, field, index) => {

                let fieldJsDoc = descriptionToJSDoc(field);
                let fieldNameAndType = '';

                let { refKind, refName, fieldModifier } = getFieldType(field);

                if (refKind === 'SCALAR') {
                    refName = this.gqlScalarToTypescript(refName);
                } else if (!isBuiltinType({ name: refName, kind: refKind })) {
                    refName = this.options.typePrefix + refName;
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

                    case 'LIST NON_NULL LIST NON_NULL': {
                        fieldNameAndType = `${field.name}?: ${refName}[][];`;
                        break;
                    }

                    case 'NON_NULL LIST NON_NULL LIST NON_NULL': {
                        fieldNameAndType = `${field.name}: ${refName}[][];`;
                        break;
                    }

                    // TODO: make it to handle any generic case

                    default: {
                        throw new Error(`We are reaching the fieldModifier level that should not exists: ${fieldModifier}`);
                    }
                }

                let typescriptDefs = [...fieldJsDoc, fieldNameAndType];

                if (fieldJsDoc.length > 0) {
                    typescriptDefs = ['', ...typescriptDefs];
                }

                return prevTypescriptDefs.concat(typescriptDefs);

            },
            []
        );

        let possibleTypeNames: string[] = [];
        if (objectType.kind === 'INTERFACE') {
            possibleTypeNames = [
                '',
                `/** Use this to resolve interface type ${objectType.name} */`,
                ...this.createUnionType(
                    `Possible${objectType.name}TypeNames`,
                    objectType.possibleTypes.map(pt => `'${pt.name}'`)
                )
            ];
        }

        return [
            `export interface ${this.options.typePrefix}${objectType.name} {`,
            ...objectFields,
            '}',
            ...possibleTypeNames
        ];
    }

    private generateUnionType(unionType: IntrospectionUnionType): string[] {
        const { typePrefix } = this.options;
        let possibleTypesNames = [
            '',
            `/** Use this to resolve union type ${unionType.name} */`,
            ...this.createUnionType(
                `Possible${unionType.name}TypeNames`,
                unionType.possibleTypes.map(pt => `'${pt.name}'`)
            )
        ];

        const unionTypeTSDefs = this.createUnionType(unionType.name, unionType.possibleTypes.map(type => {
            if (isBuiltinType(type)) {
                return type.name;
            } else {
                return typePrefix + type.name;
            }
        }));

        return [
            ...unionTypeTSDefs,
            ...possibleTypesNames
        ];
    }

    private gqlScalarToTypescript = (scalarName: string): string => {
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
                return this.options.typePrefix + scalarName;
        }
    }

    /**
     * Create a union type e.g: type Color = 'Red' | 'Green' | 'Blue' | ...
     * Also, if the type is too long to fit in one line, split them info multiple lines
     * => type Color = 'Red'
     *      | 'Green'
     *      | 'Blue'
     *      | ...
     */
    private createUnionType(typeName: string, possibleTypes: string[]): string[] {
        let result = `export type ${this.options.typePrefix}${typeName} = ${possibleTypes.join(' | ')};`;
        if (result.length <= 80) {
            return [result];
        }

        let [firstLine, rest] = result.split('=');

        return [
            firstLine + '=',
            ...rest
                .replace(/ \| /g, ' |\n')
                .split('\n')
                .map(line => line.trim())
        ];
    }
}