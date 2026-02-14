import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { AnyContractProcedure, AnyContractRouter, AnySchema, OpenAPI } from '@orpc/contract';
import { isContractProcedure } from '@orpc/contract';
import { OpenAPIGenerator, toOpenAPISchema, type ConditionalSchemaConverter } from '@orpc/openapi';
import type { JSONSchema } from 'json-schema-typed/draft-2020-12';

import { appContract, getOpenApiUnit } from '@repo/shared';

// packages/api/scripts -> repo root is 3 levels up
const repoRoot = resolve(import.meta.dir, '../../..');
const outDir = resolve(repoRoot, 'apps/web/static/openapi');

const OPENAPI_VERSION = '3.1.1' as const;

const stringify = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
const deepEqualJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const collectComponentsFromSchema = (schema: AnySchema | undefined, into: Record<string, JSONSchema>) => {
  const unit = getOpenApiUnit<any>(schema);
  if (!unit) return;

  const schemas = (unit.components as unknown as { schemas?: Record<string, unknown> } | undefined)?.schemas;
  if (!schemas) return;

  for (const [key, value] of Object.entries(schemas)) {
    const json = value as JSONSchema;
    const existing = into[key];
    if (!existing) {
      into[key] = json;
      continue;
    }
    if (!deepEqualJson(existing, json)) {
      throw new Error(`OpenAPI component schema collision for "${key}"`);
    }
  }
};

const traverseContract = (router: AnyContractRouter, visit: (proc: AnyContractProcedure) => void) => {
  if (isContractProcedure(router)) {
    visit(router);
    return;
  }
  for (const value of Object.values(router)) {
    traverseContract(value as AnyContractRouter, visit);
  }
};

const typiaUnitConverter: ConditionalSchemaConverter = {
  condition(schema) {
    return !!getOpenApiUnit(schema);
  },
  async convert(schema, _options) {
    const unit = getOpenApiUnit<any>(schema);
    if (!unit) return [false, {} as JSONSchema];
    return [true, unit.schema as unknown as JSONSchema];
  },
};

const buildRpcWrappedSchema = (inner: JSONSchema, required: boolean): JSONSchema => {
  const properties: Record<string, JSONSchema> = {
    json: inner,
    meta: {
      type: 'array',
      items: {},
    } as JSONSchema,
  };

  return {
    type: 'object',
    properties,
    required: required ? ['json'] : [],
  } as JSONSchema;
};

const generateApiSpec = async () => {
  const generator = new OpenAPIGenerator({
    schemaConverters: [typiaUnitConverter],
  });

  const components: Record<string, JSONSchema> = {};
  traverseContract(appContract as unknown as AnyContractRouter, (proc) => {
    const def = (proc as unknown as { ['~orpc']: { inputSchema?: AnySchema; outputSchema?: AnySchema; errorMap: any } })[
      '~orpc'
    ];
    collectComponentsFromSchema(def.inputSchema, components);
    collectComponentsFromSchema(def.outputSchema, components);
    for (const errorItem of Object.values(def.errorMap ?? {})) {
      collectComponentsFromSchema((errorItem as { data?: AnySchema } | undefined)?.data, components);
    }
  });

  const doc = await generator.generate(appContract as never, {
    info: { title: 'sveltekit-orpc-typia', version: process.env.APP_VERSION ?? '0.0.0' },
    servers: [{ url: '/api' }],
  });

  doc.openapi = OPENAPI_VERSION;
  doc.components ??= {};
  doc.components.schemas ??= {};

  for (const [key, schema] of Object.entries(components)) {
    doc.components.schemas[key] = toOpenAPISchema(schema);
  }

  return doc;
};

const generateRpcSpec = async () => {
  const doc: OpenAPI.Document = {
    openapi: OPENAPI_VERSION,
    info: { title: 'sveltekit-orpc-typia (Standard RPC)', version: process.env.APP_VERSION ?? '0.0.0' },
    servers: [{ url: '/rpc' }],
    components: { schemas: {} },
    paths: {},
  };

  const components: Record<string, JSONSchema> = {};

  traverseContract(appContract as unknown as AnyContractRouter, (proc) => {
    const def = (proc as unknown as { ['~orpc']: { inputSchema?: AnySchema; outputSchema?: AnySchema; errorMap: any } })[
      '~orpc'
    ];
    collectComponentsFromSchema(def.inputSchema, components);
    collectComponentsFromSchema(def.outputSchema, components);
    for (const errorItem of Object.values(def.errorMap ?? {})) {
      collectComponentsFromSchema((errorItem as { data?: AnySchema } | undefined)?.data, components);
    }
  });

  for (const [key, schema] of Object.entries(components)) {
    doc.components!.schemas![key] = toOpenAPISchema(schema);
  }

  traverseContract(appContract as unknown as AnyContractRouter, (proc) => {
    const def = (proc as unknown as { ['~orpc']: { route: any; inputSchema?: AnySchema; outputSchema?: AnySchema } })[
      '~orpc'
    ];

    const httpPath = def.route.path as string | undefined;
    if (!httpPath) return;
    const method = ((def.route.method ?? 'POST') as string).toLowerCase() as keyof OpenAPI.PathItemObject;

    const op: OpenAPI.OperationObject = {
      operationId: def.route.operationId,
      summary: def.route.summary,
      description: def.route.description,
      deprecated: def.route.deprecated,
      tags: def.route.tags?.map((t: string) => t),
      responses: {},
    };

    const input = getOpenApiUnit<any>(def.inputSchema);
    if (input) {
      const wrapped = buildRpcWrappedSchema(input.schema as unknown as JSONSchema, true);
      op.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: toOpenAPISchema(wrapped),
          },
        },
      };
    }

    const output = getOpenApiUnit<any>(def.outputSchema);
    const outputSchema = output ? buildRpcWrappedSchema(output.schema as unknown as JSONSchema, true) : ({} as JSONSchema);
    op.responses!['200'] = {
      description: def.route.successDescription ?? 'OK',
      content: {
        'application/json': {
          schema: toOpenAPISchema(outputSchema),
        },
      },
    };

    op.responses!['4XX'] = { description: 'oRPC error' };
    op.responses!['5XX'] = { description: 'oRPC error' };

    doc.paths![httpPath] ??= {};
    (doc.paths![httpPath] as any)[method] = op;
  });

  return doc;
};

const main = async () => {
  await mkdir(outDir, { recursive: true });

  const apiDoc = await generateApiSpec();
  const rpcDoc = await generateRpcSpec();

  const apiOut = resolve(outDir, 'openapi.api.json');
  const rpcOut = resolve(outDir, 'openapi.rpc.json');

  await writeFile(apiOut, stringify(apiDoc), 'utf8');
  await writeFile(rpcOut, stringify(rpcDoc), 'utf8');

  // eslint-disable-next-line no-console
  console.log('wrote:', apiOut);
  // eslint-disable-next-line no-console
  console.log('wrote:', rpcOut);
};

await main();
