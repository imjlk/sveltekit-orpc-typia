import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

type Group = 'content' | 'meta' | 'none';

type Options = {
  name: string;
  table: string;
  group: Group;
  dryRun: boolean;
  force: boolean;
  noDb: boolean;
};

type Operation =
  | { kind: 'write'; path: string; mode: 'create' | 'overwrite' }
  | { kind: 'modify'; path: string };

const root = resolve(import.meta.dir, '..');

const die = (message: string): never => {
  console.error(`[scaffold-domain] ${message}`);
  process.exit(1);
};

const usage = () => `
Usage:
  bun scripts/scaffold-domain.ts --name <name> --table <table> --group <content|meta|none> [--dry-run] [--force] [--no-db]

Examples:
  bun scripts/scaffold-domain.ts --name widget --table widgets --group content --dry-run
  bun scripts/scaffold-domain.ts --name widget --table widgets --group content
`.trim();

const parseArgs = (argv: string[]): Options => {
  const out: Partial<Options> = {
    dryRun: false,
    force: false,
    noDb: false,
  };

  const takeValue = (i: number, flag: string) => {
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) die(`Missing value for ${flag}\n\n${usage()}`);
    return value;
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;

    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }

    if (arg === '--dry-run') {
      out.dryRun = true;
      continue;
    }
    if (arg === '--force') {
      out.force = true;
      continue;
    }
    if (arg === '--no-db') {
      out.noDb = true;
      continue;
    }

    if (arg === '--name') {
      out.name = takeValue(i, '--name');
      i++;
      continue;
    }
    if (arg.startsWith('--name=')) {
      out.name = arg.slice('--name='.length);
      continue;
    }

    if (arg === '--table') {
      out.table = takeValue(i, '--table');
      i++;
      continue;
    }
    if (arg.startsWith('--table=')) {
      out.table = arg.slice('--table='.length);
      continue;
    }

    if (arg === '--group') {
      out.group = takeValue(i, '--group') as Group;
      i++;
      continue;
    }
    if (arg.startsWith('--group=')) {
      out.group = arg.slice('--group='.length) as Group;
      continue;
    }

    die(`Unknown arg: ${arg}\n\n${usage()}`);
  }

  if (!out.name || !out.table || !out.group) {
    die(`Missing required args: --name, --table, --group\n\n${usage()}`);
  }

  if (!/^[a-z][a-z0-9]*$/.test(out.name)) {
    die(`Invalid --name "${out.name}". Expected ^[a-z][a-z0-9]*$`);
  }

  if (!/^[a-z][a-z0-9_]*$/.test(out.table)) {
    die(`Invalid --table "${out.table}". Expected ^[a-z][a-z0-9_]*$`);
  }

  if (out.group !== 'content' && out.group !== 'meta' && out.group !== 'none') {
    die(`Invalid --group "${out.group}". Expected content|meta|none`);
  }

  return out as Options;
};

const toPascalCase = (value: string) =>
  value
    .split(/[^a-zA-Z0-9]+/g)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join('');

const toCamelCaseFromSnake = (value: string) => {
  const parts = value.split('_').filter(Boolean);
  const [first, ...rest] = parts;
  if (!first) return value;
  return first + rest.map((p) => p.slice(0, 1).toUpperCase() + p.slice(1)).join('');
};

const ensureDir = (path: string) => mkdirSync(path, { recursive: true });

const readText = (path: string) => readFileSync(path, 'utf8');

const writeText = (path: string, text: string) => {
  ensureDir(dirname(path));
  writeFileSync(path, text, 'utf8');
};

const upsertFile = (ops: Operation[], path: string, text: string, opts: Options) => {
  const exists = existsSync(path);

  if (exists && !opts.force) {
    die(`Refusing to overwrite existing file (use --force): ${path}`);
  }

  if (opts.dryRun) {
    ops.push({ kind: 'write', path, mode: exists ? 'overwrite' : 'create' });
    return;
  }

  ops.push({ kind: 'write', path, mode: exists ? 'overwrite' : 'create' });
  writeText(path, text);
};

const modifyFile = (
  ops: Operation[],
  path: string,
  updater: (text: string) => string,
  opts: Options,
) => {
  if (!existsSync(path)) die(`Missing file to modify: ${path}`);
  const before = readText(path);
  const after = updater(before);

  if (before === after) return;

  if (opts.dryRun) {
    ops.push({ kind: 'modify', path });
    return;
  }

  ops.push({ kind: 'modify', path });
  writeText(path, after);
};

const insertBefore = (text: string, marker: string, insert: string) => {
  const idx = text.indexOf(marker);
  if (idx === -1) die(`Marker not found: ${marker}`);
  return text.slice(0, idx) + insert + text.slice(idx);
};

const insertAfterLastImport = (text: string, importLine: string) => {
  if (text.includes(importLine)) return text;

  const matches = [...text.matchAll(/^import .*;$/gm)];
  if (matches.length === 0) return `${importLine}\n${text}`;

  const last = matches[matches.length - 1]!;
  const insertPos = last.index! + last[0].length;
  return text.slice(0, insertPos) + `\n${importLine}` + text.slice(insertPos);
};

const addRouterContractImportAndEntry = (text: string, opts: { name: string }) => {
  const importLine = `import { ${opts.name}Contract } from '../modules/${opts.name}/contract';`;
  text = insertAfterLastImport(text, importLine);

  const keyLine = `  ${opts.name}: ${opts.name}Contract,`;
  if (text.includes(keyLine)) return text;

  const marker = `} as const;`;
  return insertBefore(text, marker, `${keyLine}\n`);
};

const addOpenApiTagDefinition = (text: string, opts: { name: string; description: string }) => {
  const entry = `  { name: '${opts.name}', description: '${opts.description}' },`;
  if (text.includes(entry)) return text;

  const marker = `] as const;`;
  return insertBefore(text, marker, `${entry}\n`);
};

const addToServiceGroup = (text: string, group: Exclude<Group, 'none'>, routerName: string) => {
  const re = new RegExp(`(${group}: \\[)([^\\]]*)(\\])`);
  const match = text.match(re);
  if (!match) die(`Failed to find SERVICE_GROUPS.${group} array`);

  const raw = match[2] ?? '';
  const items = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);

  if (items.includes(routerName)) return text;

  items.push(routerName);
  const rebuilt = items.map((v) => `'${v}'`).join(', ');

  return text.replace(re, `$1${rebuilt}$3`);
};

const addServiceContract = (text: string, opts: { name: string; Name: string }) => {
  const constName = `${opts.name}ServiceContract`;
  if (text.includes(`export const ${constName} =`)) return text;

  const block = `
export const ${constName} = populateContractRouterPaths(
  oc.router({
    ${opts.name}: ROUTER_CONTRACTS.${opts.name},
  }),
);

export type ${opts.Name}ServiceContract = typeof ${constName};
`;

  return insertBefore(text, `export const contentServiceContract`, block);
};

const addIndexExports = (text: string, opts: { name: string; Name: string }) => {
  const typesLine = `export type { ${opts.Name} } from './modules/${opts.name}/types';`;
  if (text.includes(`./modules/${opts.name}/types`)) return text;

  const addition =
    `export type { ${opts.Name}, Create${opts.Name}Input, Delete${opts.Name}Input, Get${opts.Name}Input, Update${opts.Name}Input } from './modules/${opts.name}/types';\n` +
    `export * from './modules/${opts.name}/schema';\n` +
    `export * from './modules/${opts.name}/errors';\n` +
    `export * from './modules/${opts.name}/contract';\n`;

  // Insert before contracts exports (so module exports stay grouped above contract composition exports).
  const marker = `export * from './contracts/app';`;
  if (!text.includes(marker)) {
    return text.trimEnd() + `\n` + addition;
  }

  return insertBefore(text, marker, addition);
};

const addApiRouterImport = (text: string, opts: { name: string; Name: string }) => {
  const importLine = `import { create${opts.Name}Router } from './modules/${opts.name}/router';`;
  return insertAfterLastImport(text, importLine);
};

const addApiRouterEntry = (text: string, opts: { name: string; Name: string; routerVar: string }) => {
  const entry = `    ${opts.name}: create${opts.Name}Router(db),`;
  if (text.includes(entry)) return text;

  const marker = `  });`;
  return insertBefore(text, marker, `${entry}\n`);
};

const addApiRoutersImport = (text: string, opts: { name: string; Name: string }) => {
  const importLine = `import { create${opts.Name}Router } from './modules/${opts.name}/router';`;
  return insertAfterLastImport(text, importLine);
};

const addApiRoutersEntry = (text: string, opts: { name: string; Name: string; group: Group }) => {
  const entry = `    ${opts.name}: create${opts.Name}Router(db),`;

  if (opts.group === 'none') return text;

  if (opts.group === 'content') {
    if (text.includes(entry)) return text;
    const marker = `  });\n\nexport type ContentRouter`;
    if (!text.includes(marker)) die(`Failed to find createContentRouter block`);
    return insertBefore(text, marker, `${entry}\n`);
  }

  // meta
  if (text.includes(entry)) return text;
  const marker = `  });\n\nexport type MetaRouter`;
  if (!text.includes(marker)) die(`Failed to find createMetaRouter block`);
  return insertBefore(text, marker, `${entry}\n`);
};

const scaffoldDb = (ops: Operation[], options: Options, vars: { table: string; tableVar: string; Name: string }) => {
  const schemaPath = resolve(root, 'packages/db/src/schema.ts');
  modifyFile(
    ops,
    schemaPath,
    (text) => {
      if (text.includes(`sqliteTable(\n  "${vars.table}",`)) return text;
      if (text.includes(`export const ${vars.tableVar} = sqliteTable`)) return text;

      const tableBlock = `
export const ${vars.tableVar} = sqliteTable(
  "${vars.table}",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql\`(unixepoch())\`),
  },
);

`;

      text = insertBefore(text, `export const categoriesRelations`, tableBlock);

      const relationsConst = `${vars.tableVar}Relations`;
      if (!text.includes(`export const ${relationsConst} = relations(`)) {
        text = text.trimEnd() + `\n\nexport const ${relationsConst} = relations(${vars.tableVar}, () => ({}));\n`;
      }

      return text;
    },
    options,
  );

  const schemaTypesPath = resolve(root, 'packages/db/src/schema-types.ts');
  modifyFile(
    ops,
    schemaTypesPath,
    (text) => {
      const importRe = /^import \{([^}]+)\} from "\.\/schema";$/m;
      const m = text.match(importRe);
      if (!m) die(`Failed to find schema import in ${schemaTypesPath}`);

      const raw = m[1] ?? '';
      const names = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (!names.includes(vars.tableVar)) {
        names.push(vars.tableVar);
        const replaced = `import { ${names.join(', ')} } from "./schema";`;
        text = text.replace(importRe, replaced);
      }

      const rowType = `${vars.Name}Row`;
      const insertType = `${vars.Name}InsertRow`;
      if (!text.includes(`export type ${rowType} =`)) {
        text =
          text.trimEnd() +
          `\n\nexport type ${rowType} = InferSelectModel<typeof ${vars.tableVar}>;\n` +
          `export type ${insertType} = InferInsertModel<typeof ${vars.tableVar}>;\n`;
      }

      return text;
    },
    options,
  );
};

const scaffoldSharedModule = (
  ops: Operation[],
  options: Options,
  vars: { name: string; Name: string },
) => {
  const dir = resolve(root, `packages/shared/src/modules/${vars.name}`);
  ensureDir(dir);

  const typesPath = resolve(dir, 'types.ts');
  const schemaPath = resolve(dir, 'schema.ts');
  const contractPath = resolve(dir, 'contract.ts');
  const errorsPath = resolve(dir, 'errors.ts');

  const typesText = `import type { SerializeForTransport } from '../../transport/serialize';

type ${vars.Name}Row = import('@repo/db/schema-types').${vars.Name}Row;

export type ${vars.Name} = SerializeForTransport<${vars.Name}Row>;

export type Create${vars.Name}Input = Record<never, never>;
export type Get${vars.Name}Input = { id: ${vars.Name}Row['id'] };
export type Update${vars.Name}Input = { id: ${vars.Name}Row['id'] };
export type Delete${vars.Name}Input = { id: ${vars.Name}Row['id'] };

export type { SerializeForTransport };
`;

  const schemaText = `import typia from 'typia';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { Create${vars.Name}Input, Delete${vars.Name}Input, Get${vars.Name}Input, ${vars.Name}, Update${vars.Name}Input } from './types';
import { serializeForTransport } from '../../transport/serialize';
import { typiaMappedSchema, typiaSchema } from '../../transport/typia';

type ${vars.Name}Row = import('@repo/db/schema-types').${vars.Name}Row;

export const create${vars.Name}Schema = typiaSchema(
  typia.createValidate<Create${vars.Name}Input>(),
  typia.json.schema<Create${vars.Name}Input>(),
);

export const get${vars.Name}InputSchema = typiaSchema(
  typia.createValidate<Get${vars.Name}Input>(),
  typia.json.schema<Get${vars.Name}Input>(),
);

export const update${vars.Name}InputSchema = typiaSchema(
  typia.createValidate<Update${vars.Name}Input>(),
  typia.json.schema<Update${vars.Name}Input>(),
);

export const delete${vars.Name}InputSchema = typiaSchema(
  typia.createValidate<Delete${vars.Name}Input>(),
  typia.json.schema<Delete${vars.Name}Input>(),
);

const ${vars.name}DtoSchema = typiaSchema(typia.createValidate<${vars.Name}>(), typia.json.schema<${vars.Name}>());
export const ${vars.name}Schema: StandardSchemaV1<${vars.Name}Row, ${vars.Name}> = typiaMappedSchema(
  ${vars.name}DtoSchema,
  serializeForTransport,
);

const ${vars.name}ListDtoSchema = typiaSchema(
  typia.createValidate<${vars.Name}[]>(),
  typia.json.schema<${vars.Name}[]>(),
);
export const ${vars.name}ListSchema: StandardSchemaV1<${vars.Name}Row[], ${vars.Name}[]> = typiaMappedSchema(
  ${vars.name}ListDtoSchema,
  serializeForTransport,
);
`;

  const contractText = `import { oc, type as orpcType } from '@orpc/contract';
import {
  create${vars.Name}Schema,
  delete${vars.Name}InputSchema,
  get${vars.Name}InputSchema,
  ${vars.name}ListSchema,
  ${vars.name}Schema,
  update${vars.Name}InputSchema,
} from './schema';
import { commonErrors, notFoundErrors } from '../../errors/common';

export const ${vars.name}Contract = oc.tag('${vars.name}').errors(commonErrors).router({
  create: oc
    .input(create${vars.Name}Schema)
    .output(${vars.name}Schema)
    .route({
      summary: 'Create ${vars.name}',
      description: 'Creates a ${vars.name}. Returns the created ${vars.name} (all dates are serialized to ISO strings).',
    }),
  list: oc
    .input(orpcType<void>())
    .output(${vars.name}ListSchema)
    .route({
      method: 'GET',
      summary: 'List ${vars.name}s',
      description: 'Returns all ${vars.name}s.',
    }),
  get: oc
    .input(get${vars.Name}InputSchema)
    .output(${vars.name}Schema)
    .route({
      method: 'GET',
      summary: 'Get ${vars.name}',
      description: 'Returns a ${vars.name} by id.',
    })
    .errors(notFoundErrors),
  update: oc
    .input(update${vars.Name}InputSchema)
    .output(${vars.name}Schema)
    .route({
      method: 'PATCH',
      summary: 'Update ${vars.name}',
      description: 'Updates a ${vars.name} by id.',
    })
    .errors(notFoundErrors),
  delete: oc
    .input(delete${vars.Name}InputSchema)
    .output(${vars.name}Schema)
    .route({
      method: 'DELETE',
      summary: 'Delete ${vars.name}',
      description: 'Deletes a ${vars.name} by id.',
    })
    .errors(notFoundErrors),
});

export type ${vars.Name}Contract = typeof ${vars.name}Contract;
`;

  const errorsText = `export class Invalid${vars.Name}DataError extends Error {
  code = 'BAD_REQUEST' as const;

  constructor(message = 'Invalid ${vars.name} data') {
    super(message);
  }
}

export class ${vars.Name}NotFoundError extends Error {
  code = 'NOT_FOUND' as const;

  constructor(message = '${vars.Name} not found') {
    super(message);
  }
}
`;

  upsertFile(ops, typesPath, typesText, options);
  upsertFile(ops, schemaPath, schemaText, options);
  upsertFile(ops, contractPath, contractText, options);
  upsertFile(ops, errorsPath, errorsText, options);
};

const scaffoldSharedRegistryAndExports = (
  ops: Operation[],
  options: Options,
  vars: { name: string; Name: string; group: Group },
) => {
  const registryPath = resolve(root, 'packages/shared/src/contracts/registry.ts');
  modifyFile(
    ops,
    registryPath,
    (text) => {
      // Import
      const importLine = `import { ${vars.name}Contract } from '../modules/${vars.name}/contract';`;
      text = insertAfterLastImport(text, importLine);

      // ROUTER_CONTRACTS entry
      const routerEntry = `  ${vars.name}: ${vars.name}Contract,`;
      if (!text.includes(routerEntry)) {
        text = insertBefore(text, `} as const;`, `${routerEntry}\n`);
      }

      // SERVICE_GROUPS update
      if (vars.group !== 'none') {
        text = addToServiceGroup(text, vars.group, vars.name);
      }

      // OPENAPI_TAG_DEFINITIONS entry
      text = addOpenApiTagDefinition(text, {
        name: vars.name,
        description: `${vars.Name} domain procedures.`,
      });

      return text;
    },
    options,
  );

  const servicesPath = resolve(root, 'packages/shared/src/contracts/services.ts');
  modifyFile(
    ops,
    servicesPath,
    (text) => {
      text = addServiceContract(text, { name: vars.name, Name: vars.Name });
      return text;
    },
    options,
  );

  const indexPath = resolve(root, 'packages/shared/src/index.ts');
  modifyFile(
    ops,
    indexPath,
    (text) => addIndexExports(text, { name: vars.name, Name: vars.Name }),
    options,
  );
};

const scaffoldApiModule = (
  ops: Operation[],
  options: Options,
  vars: { name: string; Name: string; tableVar: string; group: Group },
) => {
  const dir = resolve(root, `packages/api/src/modules/${vars.name}`);
  ensureDir(dir);

  const routerPath = resolve(dir, 'router.ts');

  const routerText = `import { ${vars.tableVar} } from '@repo/db';
import { ORPCError, implement } from '@orpc/server';
import { ${vars.name}Contract } from '@repo/shared';
import { eq } from 'drizzle-orm';
import { internalError, notFound } from '../../lib/errors';
import type { DbClient } from '../../types';

const ${vars.name} = implement(${vars.name}Contract);

export const create${vars.Name}Router = (db: DbClient) =>
  ${vars.name}.router({
    create: ${vars.name}.create.handler(async () => {
      try {
        const createdRows = await db.insert(${vars.tableVar}).values({}).returning();
        const row = createdRows[0];

        if (!row) {
          throw internalError('${vars.Name} creation failed');
        }

        return row;
      } catch (error) {
        if (error instanceof ORPCError) {
          throw error;
        }

        throw internalError('Failed to create ${vars.name}', error);
      }
    }),
    list: ${vars.name}.list.handler(async () => {
      return db.select().from(${vars.tableVar}).all();
    }),
    get: ${vars.name}.get.handler(async ({ input }) => {
      const row = await db.query.${vars.tableVar}.findFirst({
        where: (${vars.tableVar}Table, { eq }) => eq(${vars.tableVar}Table.id, input.id),
      });

      if (!row) {
        throw notFound('${vars.name}', input.id, '${vars.Name} not found');
      }

      return row;
    }),
    update: ${vars.name}.update.handler(async ({ input }) => {
      const existing = await db.query.${vars.tableVar}.findFirst({
        where: (${vars.tableVar}Table, { eq }) => eq(${vars.tableVar}Table.id, input.id),
      });

      if (!existing) {
        throw notFound('${vars.name}', input.id, '${vars.Name} not found');
      }

      // TODO: Apply update fields to the DB row.
      return existing;
    }),
    delete: ${vars.name}.delete.handler(async ({ input }) => {
      const deletedRows = await db.delete(${vars.tableVar}).where(eq(${vars.tableVar}.id, input.id)).returning();
      const row = deletedRows[0];

      if (!row) {
        throw notFound('${vars.name}', input.id, '${vars.Name} not found');
      }

      return row;
    }),
  });
`;

  upsertFile(ops, routerPath, routerText, options);
};

const scaffoldApiAggregators = (
  ops: Operation[],
  options: Options,
  vars: { name: string; Name: string; group: Group },
) => {
  const appRouterPath = resolve(root, 'packages/api/src/router.ts');
  modifyFile(
    ops,
    appRouterPath,
    (text) => {
      text = addApiRouterImport(text, { name: vars.name, Name: vars.Name });
      text = addApiRouterEntry(text, { name: vars.name, Name: vars.Name, routerVar: vars.name });
      return text;
    },
    options,
  );

  const routersPath = resolve(root, 'packages/api/src/routers.ts');
  modifyFile(
    ops,
    routersPath,
    (text) => {
      text = addApiRoutersImport(text, { name: vars.name, Name: vars.Name });
      text = addApiRoutersEntry(text, { name: vars.name, Name: vars.Name, group: vars.group });
      return text;
    },
    options,
  );
};

const main = () => {
  const options = parseArgs(Bun.argv.slice(2));
  const ops: Operation[] = [];

  const Name = toPascalCase(options.name);
  const tableVar = toCamelCaseFromSnake(options.table);

  if (!tableVar || !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(tableVar)) {
    die(`Derived invalid table var name from --table "${options.table}": "${tableVar}"`);
  }

  if (!options.noDb) {
    scaffoldDb(ops, options, { table: options.table, tableVar, Name });
  }

  scaffoldSharedModule(ops, options, { name: options.name, Name });
  scaffoldSharedRegistryAndExports(ops, options, { name: options.name, Name, group: options.group });
  scaffoldApiModule(ops, options, { name: options.name, Name, tableVar, group: options.group });
  scaffoldApiAggregators(ops, options, { name: options.name, Name, group: options.group });

  const opSummary = ops
    .map((op) => {
      if (op.kind === 'write') return `${op.kind}:${op.mode} ${op.path}`;
      return `${op.kind} ${op.path}`;
    })
    .join('\n');

  if (opSummary) {
    console.log(opSummary);
  } else {
    console.log('[scaffold-domain] no changes');
  }

  console.log('\nNext steps:');
  console.log('- bun run --cwd packages/db db:generate   # create SQL migrations from schema changes');
  console.log('- bun run gen:openapi                     # regenerate checked-in OpenAPI specs');
  console.log('- bun run check && bun run verify:openapi  # typecheck + ensure spec is committed');
};

main();
