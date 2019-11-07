import { dirname, join } from 'path';
import mkdirp from 'mkdirp';
import { writeFileSync, readFileSync } from 'fs';
import isObject from '@tinkoff/utils/is/object';
import map from './map';
import getTypeAlias from './getTypeAlias';
import { Config } from '../types';
import Mustache from 'mustache';
import dirTree from './dirTree';
import { allOfTypesSymbol } from './parse';

export function generateTypes({ types, config }: { types: Record<string, any>; config: Config }) {
    const { projectDir } = config;

    writeFile(join(projectDir, 'types/domain.d.ts'), `${Object.values(map(stringifyNamespace, types)).join('')}\n`);
}

export function generatingActionsTypes({
    methods,
    types,
    config,
}: {
    methods: Record<string, any>;
    types: Record<string, any>;
    config: Config;
}) {
    const { projectDir } = config;
    const available = new Set(Object.keys(methods));

    const typesDir = join(projectDir, `types`);
    dirTree(typesDir)
        .children.filter(({ name }) => /\.template\./.test(name))
        .forEach((x) => {
            const template = readFileSync(join(typesDir, x.path))
                .toString()
                .replace(/\$(\w+)\$/g, '/*?{$1}?*/');

            const output = Mustache.render(
                template,
                {
                    methods: [...available].map((method) => {
                        const { responses, parameters } = methods[method];

                        return {
                            method,
                            responses: responses && responses.type,
                            parameters: parameters && parameters.type,
                        };
                    }),
                },
                undefined,
                ['/*?', '?*/']
            );

            writeFile(join(typesDir, x.name.replace('.template', '')), output);
        });
}

function writeFile(path, contents) {
    mkdirp(dirname(path), (err) => {
        if (err) {
            // tslint:disable-next-line:no-console
            console.log(`Can't mkdirp for ${path}`);
            return;
        }

        writeFileSync(path, contents);
    });
}

function stringifyNamespace(name, keys) {
    const body = Object.values(map(stringifyType, keys));

    if (name === 'default') {
        return body.filter(Boolean).join('\n\n');
    }

    if (!body) {
        return `declare namespace ${name} {}`;
    }

    return `declare namespace ${name} {\n    ${body
        .join('\n\n    ')
        .replace(/;\n/g, ';\n    ')
        .replace(/{\n/g, '{\n    ')}\n}`;
}

function escapeNumbers(name) {
    return /\d/.test(name[0]) ? `'${name}'` : name;
}

function stringifyType(name, keys, isInnerType = false) {
    const allOfTypes = keys[allOfTypesSymbol];

    if (allOfTypes) {
        const allOfTypesString = allOfTypes.join(' & ');

        if (isInnerType) {
            return `${name} = ${allOfTypesString};`;
        }

        return `export type ${name} = ${allOfTypesString};`;
    }

    const body = Object.values(
        map((prop, type) => {
            if (isObject(type)) {
                return stringifyType(prop, type, true);
            }

            return `${escapeNumbers(propAlias(prop))}${getTypeAlias(type)};`;
        }, keys)
    ).join(`\n    ${isInnerType ? '    ' : ''}`);

    if (isInnerType) {
        if (!body) {
            return `${name}: {};`;
        }

        return `${name}: {\n        ${body}\n    };`;
    }

    if (!body) {
        return `export type ${name} = {};`;
    }

    return `export type ${name} = {\n    ${body}\n};`;
}

function propAlias(prop) {
    if (/^\d+.*/.test(prop)) {
        return `'${prop}'`;
    }
    return prop;
}
