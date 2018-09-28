import { GenerateTypescriptOptions } from './types';
import { versionMajorMinor as TSVersion } from 'typescript';
import {
    isBuiltinType,
    descriptionToJSDoc,
    createFieldRef,
} from './utils';
import {
    IntrospectionType,
    IntrospectionScalarType,
    IntrospectionEnumType,
    IntrospectionObjectType,
    IntrospectionUnionType,
    IntrospectionInputObjectType,
    IntrospectionInterfaceType,
    IntrospectionQuery,
    IntrospectionField,
    IntrospectionInputValue
} from 'graphql';

export class TypeScriptGenerator {

    constructor(
        protected options: GenerateTypescriptOptions,
        protected introspectResult: IntrospectionQuery
    ) { }

    public async generate(): Promise<string[]> {
        const { introspectResult } = this;
        const gqlTypes = introspectResult.__schema.types.filter(type => !isBuiltinType(type));

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
                        typeScriptDefs = typeScriptDefs.concat(this.generateObjectType(gqlType, gqlTypes));
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
        if (!this.isStringEnumSupported() || this.options.noStringEnum) {
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

    private generateObjectType(
        objectType: IntrospectionObjectType | IntrospectionInputObjectType | IntrospectionInterfaceType,
        allGQLTypes: IntrospectionType[]
    ): string[] {
        let fields: (IntrospectionInputValue | IntrospectionField)[]
            = objectType.kind === 'INPUT_OBJECT' ? objectType.inputFields : objectType.fields;

        const extendTypes: string[] = objectType.kind === 'OBJECT'
            ? objectType.interfaces.map(i => i.name)
            : [];

        const extendGqlTypes = allGQLTypes.filter(t => extendTypes.indexOf(t.name) !== -1) as IntrospectionInterfaceType[];
        const extendFields = extendGqlTypes.reduce<string[]>(
            (prevFieldNames, gqlType) => {
                return prevFieldNames.concat(gqlType.fields.map(f => f.name));
            },
            []
        );

        const objectFields = fields.reduce<string[]>(
            (prevTypescriptDefs, field, index) => {

                if (extendFields.indexOf(field.name) !== -1 && this.options.minimizeInterfaceImplementation) {
                    return prevTypescriptDefs;
                }

                let fieldJsDoc = descriptionToJSDoc(field);
                const { fieldName, fieldType } = createFieldRef(field, this.options.typePrefix, this.options.strictNulls);
                const fieldNameAndType = `${fieldName}: ${fieldType};`;
                let typescriptDefs = [...fieldJsDoc, fieldNameAndType];

                if (fieldJsDoc.length > 0) {
                    typescriptDefs = ['', ...typescriptDefs];
                }

                return prevTypescriptDefs.concat(typescriptDefs);

            },
            []
        );

        const possibleTypeNames: string[] = [];
        const possibleTypeNamesMap: string[] = [];
        if (objectType.kind === 'INTERFACE') {
            possibleTypeNames.push(...[
                '',
                `/** Use this to resolve interface type ${objectType.name} */`,
                ...this.createUnionType(
                    `Possible${objectType.name}TypeNames`,
                    objectType.possibleTypes.map(pt => `'${pt.name}'`)
                )
            ]);

            possibleTypeNamesMap.push(...[
                '',
                `export interface ${this.options.typePrefix}${objectType.name}NameMap {`,
                `${objectType.name}: ${this.options.typePrefix}${objectType.name};`,
                ...objectType.possibleTypes.map(pt => {
                    return `${pt.name}: ${this.options.typePrefix}${pt.name};`;
                }),
                '}'
            ]);
        }

        const extendStr = extendTypes.length === 0
            ? ''
            : `extends ${extendTypes.map(t => this.options.typePrefix + t).join(', ')} `;
        return [
            `export interface ${this.options.typePrefix}${objectType.name} ${extendStr}{`,
            ...objectFields,
            '}',
            ...possibleTypeNames,
            ...possibleTypeNamesMap
        ];
    }

    private generateUnionType(unionType: IntrospectionUnionType): string[] {
        const { typePrefix } = this.options;
        const possibleTypesNames = [
            '',
            `/** Use this to resolve union type ${unionType.name} */`,
            ...this.createUnionType(
                `Possible${unionType.name}TypeNames`,
                unionType.possibleTypes.map(pt => `'${pt.name}'`)
            )
        ];
        const possibleTypeNamesMap = [
            '',
            `export interface ${this.options.typePrefix}${unionType.name}NameMap {`,
            `${unionType.name}: ${this.options.typePrefix}${unionType.name};`,
            ...unionType.possibleTypes.map(pt => {
                return `${pt.name}: ${this.options.typePrefix}${pt.name};`;
            }),
            '}'
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
            ...possibleTypesNames,
            ...possibleTypeNamesMap
        ];
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
