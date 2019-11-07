export default function typeAlias(type) {
    switch (type) {
        case 'integer':
            return 'number';
        case 'array':
        case 'file':
        case 'object':
            return 'any';
        default:
            return type;
    }
}
