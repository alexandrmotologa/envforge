import { ParityMatrixRow, InferredType } from '../types/index.js';

export function generateJsonSchema(rows: ParityMatrixRow[]): string {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const row of rows) {
    const isOptional = Object.values(row.environments).some((c) => c.status === 'MISSING');
    if (!isOptional && !row.suggestedDefault) {
      required.push(row.key);
    }

    const propDef: Record<string, any> = {
      type: mapTypeToJsonSchemaType(row.inferredType),
    };

    if (row.description) {
      propDef.description = row.description;
    }

    if (row.suggestedDefault) {
      propDef.default = row.suggestedDefault;
    }

    if (row.inferredType === 'port') {
      propDef.minimum = 1;
      propDef.maximum = 65535;
    } else if (row.inferredType === 'url') {
      propDef.format = 'uri';
    } else if (row.inferredType === 'email') {
      propDef.format = 'email';
    } else if (row.inferredType === 'uuid') {
      propDef.format = 'uuid';
    }

    properties[row.key] = propDef;
  }

  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'EnvironmentConfiguration',
    description: 'Auto-generated environment variables schema by EnvForge',
    type: 'object',
    properties,
    required,
    additionalProperties: true,
  };

  return JSON.stringify(schema, null, 2) + '\n';
}

function mapTypeToJsonSchemaType(type: InferredType): string {
  switch (type) {
    case 'port':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'json':
      return 'object';
    case 'string':
    case 'url':
    case 'email':
    case 'uuid':
    case 'enum':
    default:
      return 'string';
  }
}
