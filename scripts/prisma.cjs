// Prisma's version-pinned JavaScript generator and WASM schema engine avoid
// the CLI's eager native-engine download. npm lockfile integrity remains enabled.
require("dotenv/config");
const fs = require("node:fs");
const path = require("node:path");
const { getGenerators } = require("@prisma/internals");
const { PrismaClientJsGenerator } = require("@prisma/client-generator-js");
async function generate() {
  const generators = await getGenerators({
    schemaPath: path.resolve("prisma/schema.prisma"),
    registry: {
      "prisma-client-js": {
        type: "in-process",
        generator: new PrismaClientJsGenerator({ cliCommand: "prisma" }),
      },
    },
    skipDownload: true,
    cliCommand: "prisma",
  });
  try {
    for (const generator of generators) await generator.generate();
  } finally {
    for (const generator of generators) generator.stop();
  }
  console.log("Prisma client generated.");
}
async function push() {
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  const {
    bindMigrationAwareSqlAdapterFactory,
  } = require("@prisma/driver-adapter-utils");
  const runtime = await import("@prisma/schema-engine-wasm/schema_engine_bg");
  const wasmPath = path.join(
    path.dirname(require.resolve("@prisma/schema-engine-wasm")),
    "schema_engine_bg.wasm",
  );
  const module = new WebAssembly.Module(fs.readFileSync(wasmPath));
  const instance = new WebAssembly.Instance(module, {
    "./schema_engine_bg.js": runtime,
  });
  runtime.__wbg_set_wasm(instance.exports);
  instance.exports.__wbindgen_start();
  const schemaPath = path.resolve("prisma/schema.prisma");
  const schema = fs.readFileSync(schemaPath, "utf8");
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  });
  const engine = await runtime.SchemaEngine.new(
    { datamodels: [[schemaPath, schema]] },
    () => {},
    bindMigrationAwareSqlAdapterFactory(adapter),
  );
  try {
    const result = await engine.schemaPush({
      force: false,
      schema: { files: [{ path: schemaPath, content: schema }] },
      filters: { externalTables: [], externalEnums: [] },
    });
    if (result.unexecutable.length || result.warnings.length)
      throw new Error(JSON.stringify(result));
    console.log(`SQLite schema ready (${result.executedSteps} steps).`);
  } finally {
    engine.free();
  }
}
// The WASM engine retains an event-loop handle after free(); exit only after
// the awaited schema operation and client generation have completed.
(process.argv[2] === "push" ? push() : generate())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
