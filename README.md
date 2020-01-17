# swagger-types-generator

Генератор typescript типов по swagger-схемам

## Установка
```
# yarn
yarn add --dev @tinkoff/swagger-types-generator

# npm
npm install --save-dev @tinkoff/swagger-types-generator
```

## Пример
```
swagger-types-generator ./config.json
```
`config.json`:
```json
{
    "schemas": [
        {
            "url": "https://tinkoffcreditsystems.github.io/invest-openapi/swagger-ui/swagger.yaml",
            "format": "yaml"
        }
    ],
    "projectDir": "./path/to/your/project"
}
```

### Config
| Свойство        | Описание                                                                                     | Обязательность |
|-----------------|----------------------------------------------------------------------------------------------|----------------|
| schemas         | Массив SwaggerSchema[]                                                                       | +              |
| projectDir      | Директория проекта                                                                           | +              |
| isCachingEnable | Флаг "Сохранять ли скаченные swagger-схема в директории проекта?",  используется для отладки | -              |
| isActionsEnable | Флаг "Попытаться сгенерировать ts-описание для action'ов"                                    | -              |

### SwaggerSchema
| Свойство    | Описание                                       | Обязательность  |
|-------------|------------------------------------------------|-----------------|
| url         | Адрес swagger-схемы                            | +               |
| namespace   | Пространство имён для типов                    | -               |
| fileName    | Имя файла, сохраняемого при кешировании        | -               |
| format      | Формат схемы, yaml или json, по-умолчанию json | -               |
