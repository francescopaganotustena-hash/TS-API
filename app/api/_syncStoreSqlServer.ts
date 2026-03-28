import mssql from "mssql";
import type { LocalDataFile, LocalResourceSnapshot, SyncJob, SyncMeta, SyncResource } from "./_syncTypes";

type SqlModule = typeof mssql;
type SqlPool = mssql.ConnectionPool;
type SqlRequest = mssql.Request;
type BulkCellValue = string | number | boolean | Date | Buffer | null;

type ResourceConfig = {
  resource: SyncResource;
  tableName: string;
  ddlColumns: string[];
  indexStatements: string[];
  bulkColumns: Array<{
    name: string;
    type: (sql: SqlModule) => mssql.ISqlTypeFactoryWithNoParams | mssql.ISqlType;
    nullable?: boolean;
    maxLength?: number;
  }>;
  normalizeRow: (row: Record<string, unknown>, syncTime: string) => Record<string, unknown>;
};

const SQLSERVER_CONNECTION_STRING = process.env.SQLSERVER_CONNECTION_STRING?.trim() ?? "";
const SQLSERVER_SCHEMA = sanitizeIdentifier(process.env.SQLSERVER_SCHEMA?.trim() ?? "dbo") ?? "dbo";
const RESOURCE_ORDER: SyncResource[] = ["clienti", "fornitori", "articoli", "ordini", "righeOrdine"];

const RESOURCE_CONFIGS: Record<SyncResource, ResourceConfig> = {
  clienti: {
    resource: "clienti",
    tableName: "cache_clienti",
    ddlColumns: [
      "row_id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY",
      "cli_for INT NULL",
      "id_cli_for INT NULL",
      "ragione_sociale NVARCHAR(255) NULL",
      "piva NVARCHAR(40) NULL",
      "citta NVARCHAR(120) NULL",
      "flg_attivo BIT NULL",
      "updated_at DATETIME2 NULL",
      "raw_json NVARCHAR(MAX) NOT NULL",
    ],
    indexStatements: [
      "CREATE INDEX IX_cache_clienti_clifor ON {table}(cli_for);",
      "CREATE INDEX IX_cache_clienti_ragione_sociale ON {table}(ragione_sociale);",
    ],
    bulkColumns: [
      { name: "cli_for", type: (sql) => sql.Int, nullable: true },
      { name: "id_cli_for", type: (sql) => sql.Int, nullable: true },
      { name: "ragione_sociale", type: (sql) => sql.NVarChar(255), nullable: true, maxLength: 255 },
      { name: "piva", type: (sql) => sql.NVarChar(40), nullable: true, maxLength: 40 },
      { name: "citta", type: (sql) => sql.NVarChar(120), nullable: true, maxLength: 120 },
      { name: "flg_attivo", type: (sql) => sql.Bit, nullable: true },
      { name: "updated_at", type: (sql) => sql.DateTime2, nullable: true },
      { name: "raw_json", type: (sql) => sql.NVarChar(sql.MAX), nullable: false },
    ],
    normalizeRow: (row, syncTime) => ({
      cli_for: toNullableInt(getFirstValue(row, "cli_for", "cliFor", "id_cli_for", "idCliFor")),
      id_cli_for: toNullableInt(getFirstValue(row, "id_cli_for", "idCliFor")),
      ragione_sociale: toNullableString(getFirstValue(row, "ragione_sociale", "ragioneSociale", "ragione", "descrizione")),
      piva: toNullableString(getFirstValue(row, "piva", "partitaIva", "vatNumber")),
      citta: toNullableString(getFirstValue(row, "citta", "cittaResidenza", "city")),
      flg_attivo: toNullableBoolean(getFirstValue(row, "flg_attivo", "attivo", "isActive")),
      updated_at: toSqlDate(syncTime),
      raw_json: safeJsonStringify(row),
    }),
  },
  fornitori: {
    resource: "fornitori",
    tableName: "cache_fornitori",
    ddlColumns: [
      "row_id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY",
      "cli_for INT NULL",
      "id_cli_for INT NULL",
      "ragione_sociale NVARCHAR(255) NULL",
      "piva NVARCHAR(40) NULL",
      "citta NVARCHAR(120) NULL",
      "flg_attivo BIT NULL",
      "updated_at DATETIME2 NULL",
      "raw_json NVARCHAR(MAX) NOT NULL",
    ],
    indexStatements: [
      "CREATE INDEX IX_cache_fornitori_clifor ON {table}(cli_for);",
      "CREATE INDEX IX_cache_fornitori_ragione_sociale ON {table}(ragione_sociale);",
    ],
    bulkColumns: [
      { name: "cli_for", type: (sql) => sql.Int, nullable: true },
      { name: "id_cli_for", type: (sql) => sql.Int, nullable: true },
      { name: "ragione_sociale", type: (sql) => sql.NVarChar(255), nullable: true, maxLength: 255 },
      { name: "piva", type: (sql) => sql.NVarChar(40), nullable: true, maxLength: 40 },
      { name: "citta", type: (sql) => sql.NVarChar(120), nullable: true, maxLength: 120 },
      { name: "flg_attivo", type: (sql) => sql.Bit, nullable: true },
      { name: "updated_at", type: (sql) => sql.DateTime2, nullable: true },
      { name: "raw_json", type: (sql) => sql.NVarChar(sql.MAX), nullable: false },
    ],
    normalizeRow: (row, syncTime) => ({
      cli_for: toNullableInt(getFirstValue(row, "cli_for", "cliFor", "id_cli_for", "idCliFor")),
      id_cli_for: toNullableInt(getFirstValue(row, "id_cli_for", "idCliFor")),
      ragione_sociale: toNullableString(getFirstValue(row, "ragione_sociale", "ragioneSociale", "ragione", "descrizione")),
      piva: toNullableString(getFirstValue(row, "piva", "partitaIva", "vatNumber")),
      citta: toNullableString(getFirstValue(row, "citta", "cittaResidenza", "city")),
      flg_attivo: toNullableBoolean(getFirstValue(row, "flg_attivo", "attivo", "isActive")),
      updated_at: toSqlDate(syncTime),
      raw_json: safeJsonStringify(row),
    }),
  },
  articoli: {
    resource: "articoli",
    tableName: "cache_articoli",
    ddlColumns: [
      "row_id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY",
      "codice_articolo NVARCHAR(80) NULL",
      "descrizione NVARCHAR(400) NULL",
      "ditta INT NULL",
      "flg_esaurito BIT NULL",
      "updated_at DATETIME2 NULL",
      "raw_json NVARCHAR(MAX) NOT NULL",
    ],
    indexStatements: [
      "CREATE INDEX IX_cache_articoli_codice ON {table}(codice_articolo);",
      "CREATE INDEX IX_cache_articoli_descrizione ON {table}(descrizione);",
    ],
    bulkColumns: [
      { name: "codice_articolo", type: (sql) => sql.NVarChar(80), nullable: true, maxLength: 80 },
      { name: "descrizione", type: (sql) => sql.NVarChar(400), nullable: true, maxLength: 400 },
      { name: "ditta", type: (sql) => sql.Int, nullable: true },
      { name: "flg_esaurito", type: (sql) => sql.Bit, nullable: true },
      { name: "updated_at", type: (sql) => sql.DateTime2, nullable: true },
      { name: "raw_json", type: (sql) => sql.NVarChar(sql.MAX), nullable: false },
    ],
    normalizeRow: (row, syncTime) => ({
      codice_articolo: toNullableString(getFirstValue(row, "codice_articolo", "codiceArticolo", "cod_articolo", "codice")),
      descrizione: toNullableString(getFirstValue(row, "descrizione", "description", "desc")),
      ditta: toNullableInt(getFirstValue(row, "ditta", "azienda")),
      flg_esaurito: toNullableBoolean(getFirstValue(row, "flg_esaurito", "esaurito")),
      updated_at: toSqlDate(syncTime),
      raw_json: safeJsonStringify(row),
    }),
  },
  ordini: {
    resource: "ordini",
    tableName: "cache_ordini",
    ddlColumns: [
      "row_id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY",
      "num_reg BIGINT NULL",
      "num_doc NVARCHAR(60) NULL",
      "tipo_doc NVARCHAR(40) NULL",
      "sez_doc NVARCHAR(20) NULL",
      "cli_for_fatt INT NULL",
      "cli_for_dest INT NULL",
      "data_doc DATETIME2 NULL",
      "updated_at DATETIME2 NULL",
      "raw_json NVARCHAR(MAX) NOT NULL",
    ],
    indexStatements: [
      "CREATE INDEX IX_cache_ordini_numreg ON {table}(num_reg);",
      "CREATE INDEX IX_cache_ordini_tipodoc ON {table}(tipo_doc);",
      "CREATE INDEX IX_cache_ordini_cliforfatt ON {table}(cli_for_fatt);",
    ],
    bulkColumns: [
      { name: "num_reg", type: (sql) => sql.BigInt, nullable: true },
      { name: "num_doc", type: (sql) => sql.NVarChar(60), nullable: true, maxLength: 60 },
      { name: "tipo_doc", type: (sql) => sql.NVarChar(40), nullable: true, maxLength: 40 },
      { name: "sez_doc", type: (sql) => sql.NVarChar(20), nullable: true, maxLength: 20 },
      { name: "cli_for_fatt", type: (sql) => sql.Int, nullable: true },
      { name: "cli_for_dest", type: (sql) => sql.Int, nullable: true },
      { name: "data_doc", type: (sql) => sql.DateTime2, nullable: true },
      { name: "updated_at", type: (sql) => sql.DateTime2, nullable: true },
      { name: "raw_json", type: (sql) => sql.NVarChar(sql.MAX), nullable: false },
    ],
    normalizeRow: (row, syncTime) => ({
      num_reg: toNullableBigInt(getFirstValue(row, "num_reg", "numReg", "numeroRegistro")),
      num_doc: toNullableString(getFirstValue(row, "num_doc", "numDoc", "numeroDocumento")),
      tipo_doc: toNullableString(getFirstValue(row, "tipo_doc", "tipoDoc", "tipoDocumento")),
      sez_doc: toNullableString(getFirstValue(row, "sez_doc", "sezDoc", "sezione")),
      cli_for_fatt: toNullableInt(getFirstValue(row, "cli_for_fatt", "cliForFatt")),
      cli_for_dest: toNullableInt(getFirstValue(row, "cli_for_dest", "cliForDest")),
      data_doc: toSqlDate(getFirstValue(row, "data_doc", "dataDoc", "datadoc") ?? syncTime),
      updated_at: toSqlDate(syncTime),
      raw_json: safeJsonStringify(row),
    }),
  },
  righeOrdine: {
    resource: "righeOrdine",
    tableName: "cache_righe_ordine",
    ddlColumns: [
      "row_id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY",
      "num_reg BIGINT NULL",
      "progr_riga INT NULL",
      "cod_articolo NVARCHAR(80) NULL",
      "descrizione NVARCHAR(400) NULL",
      "quantita DECIMAL(18, 6) NULL",
      "updated_at DATETIME2 NULL",
      "raw_json NVARCHAR(MAX) NOT NULL",
    ],
    indexStatements: [
      "CREATE INDEX IX_cache_righe_numreg ON {table}(num_reg);",
      "CREATE INDEX IX_cache_righe_codart ON {table}(cod_articolo);",
    ],
    bulkColumns: [
      { name: "num_reg", type: (sql) => sql.BigInt, nullable: true },
      { name: "progr_riga", type: (sql) => sql.Int, nullable: true },
      { name: "cod_articolo", type: (sql) => sql.NVarChar(80), nullable: true, maxLength: 80 },
      { name: "descrizione", type: (sql) => sql.NVarChar(400), nullable: true, maxLength: 400 },
      { name: "quantita", type: (sql) => sql.Decimal(18, 6), nullable: true },
      { name: "updated_at", type: (sql) => sql.DateTime2, nullable: true },
      { name: "raw_json", type: (sql) => sql.NVarChar(sql.MAX), nullable: false },
    ],
    normalizeRow: (row, syncTime) => ({
      num_reg: toNullableBigInt(getFirstValue(row, "num_reg", "numReg", "numeroRegistro")),
      progr_riga: toNullableInt(getFirstValue(row, "progr_riga", "progrRiga", "progressivoRiga")),
      cod_articolo: toNullableString(getFirstValue(row, "cod_articolo", "codArticolo", "codice_articolo", "codiceArticolo")),
      descrizione: toNullableString(getFirstValue(row, "descrizione", "description", "desc")),
      quantita: toNullableNumber(getFirstValue(row, "quantita", "qta", "qty")),
      updated_at: toSqlDate(syncTime),
      raw_json: safeJsonStringify(row),
    }),
  },
};

function EMPTY_META(): SyncMeta {
  return {
    lastSyncAt: null,
    lastSuccessAt: null,
    lastJobId: null,
    lastStatus: null,
    message: null,
    resources: createEmptyResourceMeta(),
  };
}

let pool: SqlPool | null = null;
let poolPromise: Promise<SqlPool> | null = null;
let ensureSchemaPromise: Promise<void> | null = null;
let jobCache = new Map<string, SyncJob>();

function getSql(): SqlModule {
  return mssql;
}

function sanitizeIdentifier(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalized)) return null;
  return normalized;
}

function parseConnectionString(connectionString: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of connectionString.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim().toLowerCase();
    const value = trimmed.slice(idx + 1).trim();
    if (!value) continue;
    out[key] = value;
  }
  return out;
}

function toBool(value?: string, fallback = false): boolean {
  if (!value) return fallback;
  return ["1", "true", "yes", "y"].includes(value.toLowerCase());
}

function buildSqlConfig(connectionString: string): mssql.config {
  const parsed = parseConnectionString(connectionString);
  const server = parsed.server ?? parsed["data source"] ?? "localhost";
  const database = parsed.database ?? parsed["initial catalog"];
  const user = parsed["user id"] ?? parsed.uid ?? parsed.user;
  const password = parsed.password ?? parsed.pwd;
  const port = parsed.port ? Number(parsed.port) : 1433;

  const config: mssql.config = {
    server,
    database,
    options: {
      encrypt: toBool(parsed.encrypt, false),
      trustServerCertificate: toBool(parsed.trustservercertificate, true),
    },
  };

  if (Number.isFinite(port)) {
    config.port = port;
  }
  if (user && password) {
    config.user = user;
    config.password = password;
  }

  return config;
}

function q(identifier: string): string {
  return `[${identifier.replace(/]/g, "]]")}]`;
}

function qualifiedName(schema: string, name: string): string {
  return `${q(schema)}.${q(name)}`;
}

function createEmptyResourceMeta(): SyncMeta["resources"] {
  return Object.fromEntries(RESOURCE_ORDER.map((resource) => [resource, { updatedAt: null, count: 0 }])) as SyncMeta["resources"];
}

function safeJsonStringify(value: unknown): string {
  try {
    const json = JSON.stringify(value);
    return json ?? "null";
  } catch {
    return "{}";
  }
}

function normalizeBulkCellValue(value: unknown): BulkCellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value;
  if (Buffer.isBuffer(value)) return value;
  return JSON.stringify(value);
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function truncateString(value: string, maxLength?: number): string {
  if (!maxLength || value.length <= maxLength) return value;
  return value.slice(0, maxLength);
}

function toNullableInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function toNullableBigInt(value: unknown): number | null {
  return toNullableInt(value);
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function toNullableBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value).trim().toLowerCase();
  if (["1", "true", "t", "yes", "y", "s", "si"].includes(text)) return true;
  if (["0", "false", "f", "no", "n", "x"].includes(text)) return false;
  return null;
}

function toSqlDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toNullableDateIso(value: unknown): string | null {
  const date = toSqlDate(value);
  return date ? date.toISOString() : null;
}

function canonicalKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getFirstValue(row: Record<string, unknown>, ...keys: string[]): unknown {
  const lookup = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) {
    lookup.set(canonicalKey(key), value);
  }
  for (const key of keys) {
    const found = lookup.get(canonicalKey(key));
    if (found !== undefined) return found;
  }
  return undefined;
}

function getResourceConfig(resource: SyncResource): ResourceConfig {
  return RESOURCE_CONFIGS[resource];
}

function getTableName(resource: SyncResource): string {
  return getResourceConfig(resource).tableName;
}

function extractIndexName(statement: string): string {
  const match = statement.match(/CREATE INDEX\s+([^\s]+)\s+ON/i);
  return match?.[1] ?? "IDX_UNKNOWN";
}

function buildResourceTableDefinition(resource: SyncResource, schema: string): string {
  const config = getResourceConfig(resource);
  const qualifiedTable = qualifiedName(schema, config.tableName);
  const columns = config.ddlColumns.map((line) => `    ${line}`).join(",\n");
  const indexes = config.indexStatements
    .map((statement) => statement.replace("{table}", qualifiedTable))
    .map((statement) => [
      `IF NOT EXISTS (`,
      `  SELECT 1 FROM sys.indexes WHERE name = N'${extractIndexName(statement)}' AND object_id = OBJECT_ID(N'${schema}.${config.tableName}')`,
      `)`,
      "BEGIN",
      `  ${statement}`,
      "END;",
    ].join("\n"))
    .join("\n\n");

  return [
    `IF OBJECT_ID(N'${schema}.${config.tableName}', N'U') IS NULL`,
    "BEGIN",
    `  CREATE TABLE ${qualifiedTable} (`,
    columns,
    "  );",
    "END;",
    "",
    indexes,
  ].join("\n");
}

function buildSyncSchemaSql(schema: string): string {
  const schemaLiteral = schema.replace(/'/g, "''");
  const resourceBlocks = RESOURCE_ORDER.flatMap((resource) => [
    `IF NOT EXISTS (SELECT 1 FROM ${qualifiedName(schema, "sync_resource_meta")} WHERE resource = N'${resource}')`,
    "BEGIN",
    `  INSERT INTO ${qualifiedName(schema, "sync_resource_meta")} (resource, updated_at, row_count, updated_on) VALUES (N'${resource}', NULL, 0, SYSUTCDATETIME());`,
    "END;",
    "",
    buildResourceTableDefinition(resource, schema),
    "",
  ]);

  return [
    `IF SCHEMA_ID(N'${schemaLiteral}') IS NULL`,
    "BEGIN",
    `  EXEC(N'CREATE SCHEMA ${q(schema)}');`,
    "END;",
    "",
    `IF OBJECT_ID(N'${schema}.sync_jobs', N'U') IS NULL`,
    "BEGIN",
    `  CREATE TABLE ${qualifiedName(schema, "sync_jobs")} (`,
    "    id NVARCHAR(80) NOT NULL PRIMARY KEY,",
    "    status NVARCHAR(20) NOT NULL,",
    "    phase NVARCHAR(50) NOT NULL,",
    "    progress_pct INT NOT NULL DEFAULT 0,",
    "    processed INT NOT NULL DEFAULT 0,",
    "    inserted INT NOT NULL DEFAULT 0,",
    "    updated INT NOT NULL DEFAULT 0,",
    "    errors INT NOT NULL DEFAULT 0,",
    "    started_at DATETIME2 NOT NULL,",
    "    updated_at DATETIME2 NULL,",
    "    ended_at DATETIME2 NULL,",
    "    message NVARCHAR(4000) NULL",
    "  );",
    "END;",
    "",
    `IF OBJECT_ID(N'${schema}.sync_meta', N'U') IS NULL`,
    "BEGIN",
    `  CREATE TABLE ${qualifiedName(schema, "sync_meta")} (`,
    "    id INT NOT NULL PRIMARY KEY CHECK (id = 1),",
    "    last_sync_at DATETIME2 NULL,",
    "    last_success_at DATETIME2 NULL,",
    "    last_job_id NVARCHAR(80) NULL,",
    "    last_status NVARCHAR(20) NULL,",
    "    message NVARCHAR(4000) NULL,",
    "    updated_at DATETIME2 NULL",
    "  );",
    "END;",
    "",
    `IF NOT EXISTS (SELECT 1 FROM ${qualifiedName(schema, "sync_meta")} WHERE id = 1)`,
    "BEGIN",
    `  INSERT INTO ${qualifiedName(schema, "sync_meta")} (id, updated_at) VALUES (1, SYSUTCDATETIME());`,
    "END;",
    "",
    `IF OBJECT_ID(N'${schema}.sync_resource_meta', N'U') IS NULL`,
    "BEGIN",
    `  CREATE TABLE ${qualifiedName(schema, "sync_resource_meta")} (`,
    "    resource NVARCHAR(50) NOT NULL PRIMARY KEY,",
    "    updated_at DATETIME2 NULL,",
    "    row_count INT NOT NULL DEFAULT 0,",
    "    updated_on DATETIME2 NULL",
    "  );",
    "END;",
    "",
    ...resourceBlocks,
    `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_sync_jobs_status_started' AND object_id = OBJECT_ID(N'${schema}.sync_jobs'))`,
    "BEGIN",
    `  CREATE INDEX IX_sync_jobs_status_started ON ${qualifiedName(schema, "sync_jobs")}(status, started_at DESC);`,
    "END;",
    "",
  ].join("\n");
}

async function getPool(): Promise<SqlPool> {
  if (!SQLSERVER_CONNECTION_STRING) throw new Error("SQLSERVER_CONNECTION_STRING non configurata");
  if (pool) return pool;
  if (poolPromise) return poolPromise;

  poolPromise = (async () => {
    const sql = getSql();
    const nextPool = new sql.ConnectionPool(buildSqlConfig(SQLSERVER_CONNECTION_STRING));
    pool = await nextPool.connect();
    return pool;
  })().catch((error) => {
    pool = null;
    poolPromise = null;
    throw error;
  });

  return poolPromise;
}

async function ensureSchema(): Promise<void> {
  if (ensureSchemaPromise) return ensureSchemaPromise;

  ensureSchemaPromise = (async () => {
    const connection = await getPool();
    await connection.request().batch(buildSyncSchemaSql(SQLSERVER_SCHEMA));
  })().catch((error) => {
    ensureSchemaPromise = null;
    throw error;
  });

  return ensureSchemaPromise;
}

async function withReadyDb<T>(callback: (pool: SqlPool) => Promise<T>): Promise<T> {
  await ensureSchema();
  const connection = await getPool();
  return callback(connection);
}

function inferSqlType(sql: SqlModule, value: unknown): mssql.ISqlTypeFactoryWithNoParams | mssql.ISqlType {
  if (typeof value === "number") {
    return Number.isInteger(value) ? sql.Int : (sql.Decimal(18, 6) as mssql.ISqlType);
  }
  if (typeof value === "boolean") return sql.Bit;
  if (value instanceof Date) return sql.DateTime2;
  return sql.NVarChar(sql.MAX) as mssql.ISqlType;
}

async function runQuery<T = Record<string, unknown>>(query: string, params?: Record<string, unknown>): Promise<T[]> {
  return withReadyDb(async (connection) => {
    const sql = getSql();
    const request: SqlRequest = connection.request();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        request.input(key, inferSqlType(sql, value), value ?? null);
      }
    }
    const result = await request.query(query);
    return (result.recordset ?? []) as T[];
  });
}

async function runExecute(callback: (request: SqlRequest, sql: SqlModule) => Promise<void>): Promise<void> {
  await withReadyDb(async (connection) => {
    const sql = getSql();
    await callback(connection.request(), sql);
  });
}

function serializeJob(job: SyncJob): Record<string, unknown> {
  return {
    id: job.id,
    status: job.status,
    phase: job.phase,
    progress_pct: job.progressPct,
    processed: job.processed,
    inserted: job.inserted,
    updated: job.updated,
    errors: job.errors,
    started_at: toSqlDate(job.startedAt) ?? new Date(job.startedAt),
    updated_at: toSqlDate(job.updatedAt ?? null),
    ended_at: toSqlDate(job.endedAt ?? null),
    message: job.message ?? null,
  };
}

function deserializeJob(row: Record<string, unknown>): SyncJob {
  return {
    id: String(row.id),
    status: (toNullableString(row.status) as SyncJob["status"]) ?? "queued",
    phase: (toNullableString(row.phase) as SyncJob["phase"]) ?? "idle",
    progressPct: toNullableInt(row.progress_pct) ?? 0,
    processed: toNullableInt(row.processed) ?? 0,
    inserted: toNullableInt(row.inserted) ?? 0,
    updated: toNullableInt(row.updated) ?? 0,
    errors: toNullableInt(row.errors) ?? 0,
    startedAt: toNullableDateIso(row.started_at) ?? new Date().toISOString(),
    updatedAt: toNullableDateIso(row.updated_at) ?? undefined,
    endedAt: toNullableDateIso(row.ended_at) ?? undefined,
    message: toNullableString(row.message) ?? undefined,
  };
}
async function getSyncMetaRow(): Promise<SyncMeta> {
  const connection = await getPool();
  const metaResult = await connection.request().query(
    `SELECT TOP (1) id, last_sync_at, last_success_at, last_job_id, last_status, message
     FROM ${qualifiedName(SQLSERVER_SCHEMA, "sync_meta")} WITH (UPDLOCK, HOLDLOCK)
     WHERE id = 1`
  );

  const row = metaResult.recordset?.[0] ?? null;
  const resourceRows = await connection.request().query(
    `SELECT resource, updated_at, row_count
     FROM ${qualifiedName(SQLSERVER_SCHEMA, "sync_resource_meta")}
     ORDER BY resource ASC`
  );

  const resources = createEmptyResourceMeta();
  for (const resourceRow of resourceRows.recordset ?? []) {
    const resource = String(resourceRow.resource) as SyncResource;
    if (!Object.prototype.hasOwnProperty.call(resources, resource)) continue;
    resources[resource] = {
      updatedAt: toNullableDateIso(resourceRow.updated_at),
      count: toNullableInt(resourceRow.row_count) ?? 0,
    };
  }

  return {
    lastSyncAt: toNullableDateIso(row?.last_sync_at),
    lastSuccessAt: toNullableDateIso(row?.last_success_at),
    lastJobId: toNullableString(row?.last_job_id),
    lastStatus: (toNullableString(row?.last_status) as SyncMeta["lastStatus"]) ?? null,
    message: toNullableString(row?.message),
    resources,
  };
}

async function upsertSyncMeta(meta: SyncMeta): Promise<void> {
  await runExecute(async (request, sql) => {
    const payload = {
      last_sync_at: toSqlDate(meta.lastSyncAt),
      last_success_at: toSqlDate(meta.lastSuccessAt),
      last_job_id: toNullableString(meta.lastJobId),
      last_status: toNullableString(meta.lastStatus),
      message: toNullableString(meta.message),
    };

    request.input("id", sql.Int, 1);
    const existing = await request.query(`SELECT 1 AS present FROM ${qualifiedName(SQLSERVER_SCHEMA, "sync_meta")} WHERE id = @id`);

    request.input("last_sync_at", sql.DateTime2, payload.last_sync_at);
    request.input("last_success_at", sql.DateTime2, payload.last_success_at);
    request.input("last_job_id", sql.NVarChar(80), payload.last_job_id);
    request.input("last_status", sql.NVarChar(20), payload.last_status);
    request.input("message", sql.NVarChar(4000), payload.message);
    request.input("updated_at", sql.DateTime2, new Date());

    if ((existing.recordset?.length ?? 0) > 0) {
      await request.query(
        `UPDATE ${qualifiedName(SQLSERVER_SCHEMA, "sync_meta")}
         SET last_sync_at = @last_sync_at,
             last_success_at = @last_success_at,
             last_job_id = @last_job_id,
             last_status = @last_status,
             message = @message,
             updated_at = @updated_at
         WHERE id = 1`
      );
      return;
    }

    await request.query(
      `INSERT INTO ${qualifiedName(SQLSERVER_SCHEMA, "sync_meta")}
       (id, last_sync_at, last_success_at, last_job_id, last_status, message, updated_at)
       VALUES (1, @last_sync_at, @last_success_at, @last_job_id, @last_status, @message, @updated_at)`
    );
  });
}

async function upsertResourceMeta(resource: SyncResource, updatedAt: string | null, count: number): Promise<void> {
  await runExecute(async (request, sql) => {
    request.input("resource", sql.NVarChar(50), resource);
    request.input("updated_at", sql.DateTime2, toSqlDate(updatedAt));
    request.input("row_count", sql.Int, count);
    request.input("updated_on", sql.DateTime2, new Date());
    await request.query(
      `IF EXISTS (SELECT 1 FROM ${qualifiedName(SQLSERVER_SCHEMA, "sync_resource_meta")} WHERE resource = @resource)
       BEGIN
         UPDATE ${qualifiedName(SQLSERVER_SCHEMA, "sync_resource_meta")}
         SET updated_at = @updated_at,
             row_count = @row_count,
             updated_on = @updated_on
         WHERE resource = @resource
       END
       ELSE
       BEGIN
         INSERT INTO ${qualifiedName(SQLSERVER_SCHEMA, "sync_resource_meta")}
         (resource, updated_at, row_count, updated_on)
         VALUES (@resource, @updated_at, @row_count, @updated_on)
       END`
    );
  });
}

async function readResourceRows(resource: SyncResource): Promise<Record<string, unknown>[]> {
  const tableName = getTableName(resource);
  const rows = await runQuery<Record<string, unknown>>(
    `SELECT row_id, updated_at, raw_json
     FROM ${qualifiedName(SQLSERVER_SCHEMA, tableName)}
     ORDER BY row_id ASC`
  );

  return rows.map((row) => {
    const rawJson = toNullableString(row.raw_json);
    if (rawJson) {
      try {
        const parsed = JSON.parse(rawJson) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // Fall through to the fallback below.
      }
    }

    const fallback = { ...row };
    delete (fallback as Record<string, unknown>).row_id;
    delete (fallback as Record<string, unknown>).raw_json;
    return fallback as Record<string, unknown>;
  });
}

async function replaceResourceRows(resource: SyncResource, rows: Record<string, unknown>[], syncTime: string): Promise<void> {
  const config = getResourceConfig(resource);
  const sql = getSql();

  await withReadyDb(async (connection) => {
    const transaction = new sql.Transaction(connection);
    await transaction.begin();

    try {
      await transaction.request().query(`DELETE FROM ${qualifiedName(SQLSERVER_SCHEMA, config.tableName)}`);

      if (rows.length > 0) {
        const bulkTable = new sql.Table(qualifiedName(SQLSERVER_SCHEMA, config.tableName));
        bulkTable.create = false;
        for (const column of config.bulkColumns) {
          bulkTable.columns.add(column.name, column.type(sql), { nullable: column.nullable ?? false });
        }

        for (const row of rows) {
          const normalized = config.normalizeRow(row, syncTime);
          const values: BulkCellValue[] = config.bulkColumns.map((column) => {
            const value = normalized[column.name];
            if (typeof value === "string" && column.maxLength) {
              return normalizeBulkCellValue(truncateString(value, column.maxLength));
            }
            return normalizeBulkCellValue(value);
          });
          bulkTable.rows.add(...values);
        }

        await transaction.request().bulk(bulkTable);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback().catch(() => undefined);
      throw error;
    }
  });
}

async function readResourceMeta(resource: SyncResource): Promise<{ updatedAt: string | null; count: number }> {
  const rows = await runQuery<Record<string, unknown>>(
    `SELECT updated_at, row_count
     FROM ${qualifiedName(SQLSERVER_SCHEMA, "sync_resource_meta")}
     WHERE resource = @resource`,
    { resource }
  );
  const row = rows[0];
  return {
    updatedAt: row ? toNullableDateIso(row.updated_at) : null,
    count: row ? toNullableInt(row.row_count) ?? 0 : 0,
  };
}

export async function readLocalData(resource: SyncResource): Promise<LocalResourceSnapshot> {
  const rows = await readResourceRows(resource);
  const meta = await readResourceMeta(resource);
  return {
    resource,
    updatedAt: meta.updatedAt ?? extractLatestUpdatedAt(rows),
    count: meta.count || rows.length,
    rows,
  };
}

export async function readAllLocalData(): Promise<LocalDataFile> {
  const snapshots = await Promise.all(RESOURCE_ORDER.map(async (resource) => [resource, await readLocalData(resource)] as const));
  const resources = Object.fromEntries(snapshots) as LocalDataFile["resources"];
  const updatedAt = snapshots.reduce<string | null>((latest, [, snapshot]) => {
    if (!snapshot.updatedAt) return latest;
    if (!latest || snapshot.updatedAt > latest) return snapshot.updatedAt;
    return latest;
  }, null);

  return { updatedAt, resources };
}

export async function writeLocalResource(resource: SyncResource, rows: Record<string, unknown>[], syncTime = new Date().toISOString()): Promise<LocalResourceSnapshot> {
  await replaceResourceRows(resource, rows, syncTime);
  await upsertResourceMeta(resource, syncTime, rows.length);

  const currentMeta = await getLastSyncInfo();
  await upsertSyncMeta({ ...currentMeta, lastSyncAt: syncTime });

  return { resource, updatedAt: syncTime, count: rows.length, rows };
}

export async function getLastSyncInfo(): Promise<SyncMeta> {
  try {
    return await withReadyDb(async () => getSyncMetaRow());
  } catch {
    return EMPTY_META();
  }
}

export async function updateSyncMeta(partial: Partial<SyncMeta>): Promise<SyncMeta> {
  const current = await getLastSyncInfo();
  const next: SyncMeta = {
    ...current,
    ...partial,
    resources: {
      ...current.resources,
      ...(partial.resources ?? {}),
    },
  };

  await upsertSyncMeta(next);

  if (partial.resources) {
    for (const [resource, value] of Object.entries(partial.resources) as Array<[SyncResource, { updatedAt: string | null; count: number }]>) {
      await upsertResourceMeta(resource, value.updatedAt, value.count);
    }
  }

  return next;
}

export async function getSyncJob(jobId: string): Promise<SyncJob | null> {
  if (jobCache.has(jobId)) return jobCache.get(jobId) ?? null;

  const rows = await runQuery<Record<string, unknown>>(
    `SELECT id, status, phase, progress_pct, processed, inserted, updated, errors, started_at, updated_at, ended_at, message
     FROM ${qualifiedName(SQLSERVER_SCHEMA, "sync_jobs")}
     WHERE id = @jobId`,
    { jobId }
  );

  const job = rows[0] ? deserializeJob(rows[0]) : null;
  if (job) jobCache.set(jobId, job);
  return job;
}

export async function listSyncJobs(limit = 20): Promise<SyncJob[]> {
  const safeLimit = Math.max(1, Math.floor(limit));
  const rows = await runQuery<Record<string, unknown>>(
    `SELECT TOP (@limit) id, status, phase, progress_pct, processed, inserted, updated, errors, started_at, updated_at, ended_at, message
     FROM ${qualifiedName(SQLSERVER_SCHEMA, "sync_jobs")}
     ORDER BY started_at DESC, updated_at DESC, id DESC`,
    { limit: safeLimit }
  );
  return rows.map((row) => deserializeJob(row));
}

export async function saveSyncJob(job: SyncJob): Promise<SyncJob> {
  const normalizedJob: SyncJob = { ...job, updatedAt: new Date().toISOString() };

  await runExecute(async (request, sql) => {
    const values = serializeJob(normalizedJob);
    request.input("id", sql.NVarChar(80), values.id);
    request.input("status", sql.NVarChar(20), values.status);
    request.input("phase", sql.NVarChar(50), values.phase);
    request.input("progress_pct", sql.Int, values.progress_pct);
    request.input("processed", sql.Int, values.processed);
    request.input("inserted", sql.Int, values.inserted);
    request.input("updated", sql.Int, values.updated);
    request.input("errors", sql.Int, values.errors);
    request.input("started_at", sql.DateTime2, values.started_at);
    request.input("updated_at", sql.DateTime2, values.updated_at);
    request.input("ended_at", sql.DateTime2, values.ended_at);
    request.input("message", sql.NVarChar(4000), values.message);

    await request.query(
      `IF EXISTS (SELECT 1 FROM ${qualifiedName(SQLSERVER_SCHEMA, "sync_jobs")} WHERE id = @id)
       BEGIN
         UPDATE ${qualifiedName(SQLSERVER_SCHEMA, "sync_jobs")}
         SET status = @status,
             phase = @phase,
             progress_pct = @progress_pct,
             processed = @processed,
             inserted = @inserted,
             updated = @updated,
             errors = @errors,
             started_at = @started_at,
             updated_at = @updated_at,
             ended_at = @ended_at,
             message = @message
         WHERE id = @id
       END
       ELSE
       BEGIN
         INSERT INTO ${qualifiedName(SQLSERVER_SCHEMA, "sync_jobs")}
         (id, status, phase, progress_pct, processed, inserted, updated, errors, started_at, updated_at, ended_at, message)
         VALUES (@id, @status, @phase, @progress_pct, @processed, @inserted, @updated, @errors, @started_at, @updated_at, @ended_at, @message)
       END`
    );
  });

  jobCache.set(normalizedJob.id, normalizedJob);
  return normalizedJob;
}

export async function patchSyncJob(jobId: string, patch: Partial<SyncJob>): Promise<SyncJob | null> {
  const current = await getSyncJob(jobId);
  if (!current) return null;
  return saveSyncJob({ ...current, ...patch });
}

export function clearJobCache(): void {
  jobCache = new Map<string, SyncJob>();
}

function extractLatestUpdatedAt(rows: Record<string, unknown>[]): string | null {
  let latest: string | null = null;
  for (const row of rows) {
    const value = toNullableDateIso(getFirstValue(row, "updated_at", "updatedAt"));
    if (!value) continue;
    if (!latest || value > latest) latest = value;
  }
  return latest;
}
