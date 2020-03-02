import isObject from '@tinkoff/utils/is/object';
import isEmpty from '@tinkoff/utils/is/empty';
import capitalize from '@tinkoff/utils/string/capitalize';
import noop from '@tinkoff/utils/function/noop';
import convertFieldsToCamelCase from './convertFieldsToCamelCase';
import map from './map';
import getTypeAlias from './getTypeAlias';

interface GetTypeArguments {
    typeDefinition: {
        type?: string;
        $ref?: string;
        properties?: any;
        enum?: string[];
        oneOf?: any;
    };
    sourceName?: string;
    isCamelCase?: boolean;
    isRequired?: boolean;
    registerSyntheticType?(payload: any);
}

export function getType({
    typeDefinition,
    isCamelCase = true,
    registerSyntheticType = noop,
    isRequired,
    sourceName,
}: GetTypeArguments) {
    const type = typeDefinition.type || (typeDefinition.$ref && typeDefinition.$ref.split('/').pop());

    if (type === 'object' && typeDefinition.properties && sourceName) {
        const typeName = `${sourceName}Payload`;

        registerSyntheticType({
            // eslint-disable-next-line no-use-before-define
            [typeName]: processingProperties({
                sourceName,
                isCamelCase,
                registerSyntheticType,
                sourceProperties: typeDefinition.properties,
            }),
        });

        return getTypeString(isRequired, typeName);
    }

    if (!isEmpty(typeDefinition.enum)) {
        return getTypeString(isRequired, typeDefinition.enum.map((item) => `'${item}'`).join(' | '));
    }

    if (!isEmpty(typeDefinition.oneOf)) {
        return getTypeString(
            isRequired,
            typeDefinition.oneOf
                .reduce((result, item) => {
                    if (item && item.$ref) {
                        result.push(item.$ref.split('/').pop());
                    }

                    return result;
                }, [])
                .join(' | ')
        );
    }

    if (!type) {
        return getTypeString(isRequired, 'any');
    }

    return getTypeString(isRequired, getTypeAlias(type));
}

interface ProcessingPropertiesArguments {
    sourceName: string;
    sourceProperties: any;
    registerSyntheticType(payload: any);
    required?: any;
    isCamelCase?: boolean;
}

interface ProcessingAllOfPropertiesArguments {
    allOf: {
        $ref: string;
    }[];
}

export const allOfTypesSymbol = Symbol('allOfTypes');

export const processingAllOf = ({ allOf }: ProcessingAllOfPropertiesArguments) => ({
    [allOfTypesSymbol]: allOf.reduce((result, item) => {
        if (item && item.$ref) {
            result.push(item.$ref.split('/').pop());
        }

        return result;
    }, []),
});

interface ProcessingEnumArguments {
    enumValues: string[]
}

export const enumSymbol = Symbol('enum');

export const processingEnum = ({ enumValues }: ProcessingEnumArguments) => ({
    [enumSymbol]: enumValues,
});

export const processingProperties = ({
    sourceName,
    sourceProperties = {},
    isCamelCase = true,
    required = [],
    registerSyntheticType,
}: ProcessingPropertiesArguments) => {
    const properties = map((propertyName, property: any) => {
        const isRequired = required ? required.includes(propertyName) : true;

        if (property.type === 'array') {
            const arrayType = getType({
                sourceName,
                isCamelCase,
                registerSyntheticType,
                isRequired,
                typeDefinition: property.items,
            });

            if (isObject(arrayType)) {
                const typeName = capitalize(`${capitalize(propertyName)}Item`);
                registerSyntheticType({
                    [typeName]: arrayType,
                });

                return `${getTypeAlias(arrayType.type)}[]`;
            }

            return `${getTypeAlias(arrayType)}[]`;
        }

        return getType({ sourceName, isCamelCase, registerSyntheticType, isRequired, typeDefinition: property });
    }, sourceProperties);

    return isCamelCase ? properties : convertFieldsToCamelCase(properties);
};

function getTypeString(isRequired, type) {
    return `${isRequired ? '' : '?'}: ${type}`;
}
