export enum SchemaFormat {
    YAML = 'yaml',
    JSON = 'json',
}

export interface SwaggerSchema {
    fileName: string;
    url: string;
    format?: SchemaFormat;
    namespace?: string;
}

export interface Config {
    schemas: SwaggerSchema[];
    projectDir: string;
    isCachingEnable?: boolean;
    isActionsEnable?: boolean;
}
