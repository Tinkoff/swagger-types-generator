import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import mergeDeep from '@tinkoff/utils/object/mergeDeep';
import objectPath from '@tinkoff/utils/object/path';
import YAML from 'yamljs';
import superAgent from 'superagent';
import debug from 'debug';
import { Config } from './types';
import { processingProperties, processingAllOf, processingEnum } from './utils/parse';
import { generateTypes, generatingActionsTypes } from './utils/generate';
import map from './utils/map';
import getTypeAlias from './utils/getTypeAlias';

const log = debug('swagger_types_generator:generator:info');

export default function generator() {
    const [, , pathToConfig] = process.argv;

    if (!pathToConfig) {
        // tslint:disable-next-line:no-console
        console.log('Path to config required!');
        return;
    }

    const sourceConfig = require(join(process.cwd(), pathToConfig));
    const config: Config = sourceConfig.default || sourceConfig;

    const { isActionsEnable } = config;

    getSchemas(config)
        .then(parseSchemas)
        .then(({ types, methods }) => {
            log('Generating types…');
            generateTypes({ types, config });

            if (isActionsEnable) {
                log('Generating actions types…');
                generatingActionsTypes({ types, methods, config });
            }

            log('Done!');
        });
}

function getSchemas(config: Config) {
    const { schemas, projectDir, isCachingEnable } = config;
    log(`Get schemas, total ${schemas.length}, caching: ${isCachingEnable}`);

    return Promise.all(
        schemas.map(({ url, namespace, fileName, format }) => {
            const cacheFilePath = join(projectDir, fileName);

            return (isCachingEnable
                ? getCachedSchema(cacheFilePath).then((schema) => ({ namespace, schema }))
                : Promise.reject()
            ).catch(() => {
                log(`Request schema, url: ${url}`);
                return superAgent
                    .get(url)
                    .then((response) => (format === 'yaml' ? YAML.parse(response.text) : response.body))
                    .then((schema) => {
                        if (isCachingEnable) {
                            writeFileSync(cacheFilePath, JSON.stringify(schema));
                        }

                        return { schema, namespace };
                    });
            });
        })
    );
}

function getCachedSchema(path) {
    log(`Read cached schema, path: ${path}`);
    try {
        return Promise.resolve(JSON.parse(readFileSync(path, 'utf-8')));
    } catch {
        return Promise.reject();
    }
}

function parseSchemas(schemas: { schema: any; namespace?: string }[]) {
    const syntheticTypes = {};
    const types = {};
    let methods = {};

    log('Parse schemas…');
    schemas.forEach(({ schema, namespace = 'default' }) => {
        syntheticTypes[namespace] = syntheticTypes[namespace] || {};

        types[namespace] = {
            ...types[namespace],
            ...map((sourceName, { properties: sourceProperties, required, allOf, ...rest }: any) => {
                if (allOf) {
                    return processingAllOf({
                        allOf,
                    });
                }

                if (rest.enum) {
                    return processingEnum(rest.enum)
                }

                return processingProperties({
                    sourceName,
                    sourceProperties,
                    required,
                    isCamelCase: Boolean(schema.definitions),
                    registerSyntheticType: (type) => {
                        syntheticTypes[namespace] = {
                            ...syntheticTypes[namespace],
                            ...type,
                        };
                    },
                });
            }, schema.definitions || schema.components.schemas),
        };

        methods = {
            ...methods,
            ...map((methodName, { post, get, put, delete: deleteMethod }: any) => {
                const responseDescription = post || get || put || deleteMethod;
                if (!responseDescription) {
                    return;
                }

                const { parameters: sourceParameters = [], responses: sourceResponses } = responseDescription;

                const result = {} as any;

                const parameters = objectPath(['schema'], sourceParameters.find(({ name }) => name === 'payload'));
                if (parameters) {
                    const type = parameters.type || (parameters.$ref && parameters.$ref.split('/').pop());

                    result.parameters = { type: getTypeAlias(type) };
                }
                const responses = objectPath(['schema'], sourceResponses[200]);
                if (responses) {
                    const type = responses.type || (responses.$ref && responses.$ref.split('/').pop());

                    result.responses = { type: getTypeAlias(type) };
                }

                return result;
            }, schema.paths),
        };
    });

    return { methods, types: mergeDeep(types, syntheticTypes) };
}
