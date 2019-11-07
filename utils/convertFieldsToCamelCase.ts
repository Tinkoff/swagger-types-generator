import isObject from '@tinkoff/utils/is/object';
import isArray from '@tinkoff/utils/is/array';

const toCamelCase = (string: string) => string.replace(/([_][a-z])/gi, (part) => part.toUpperCase().replace('_', ''));

export default function convertFieldsToCamelCase(source: object | object[]) {
    if (isArray(source)) {
        return source.map((item) => {
            return convertFieldsToCamelCase(item);
        });
    }

    if (isObject(source)) {
        const converted = {};

        Object.keys(source).forEach((key) => {
            converted[toCamelCase(key)] = convertFieldsToCamelCase(source[key]);
        });

        return converted;
    }

    return source;
}
