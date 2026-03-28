import { promises as fs } from "node:fs";
import path from "node:path";
import {
  type LocalDataFile,
  type LocalResourceSnapshot,
  type SyncJob,
  type SyncMeta,
  type SyncResource,
  SYNC_RESOURCES,
} from "./_syncTypes";
import * as sqlStore from "./_syncStoreSqlServer";

const STORE_DIR = path.join(process.cwd(), ".ts-api-sync");
const LOCAL_DATA_FILE = path.join(STORE_DIR, "local-data.json");
const SYNC_JOBS_FILE = path.join(STORE_DIR, "sync-jobs.json");
const SYNC_META_FILE = path.join(STORE_DIR, "sync-meta.json");

const EMPTY_SNAPSHOT = (resource: SyncResource): LocalResourceSnapshot => ({
  resource,
  updatedAt: null,
  count: 0,
  rows: [],
});

const EMPTY_META = (): SyncMeta => ({
  lastSyncAt: null,
  lastSuccessAt: null,
  lastJobId: null,
  lastStatus: null,
  message: null,
  resources: Object.fromEntries(
    SYNC_RESOURCES.map((resource) => [resource, { updatedAt: null, count: 0 }])
  ) as SyncMeta["resources"],
});

let jobCache = new Map<string, SyncJob>();

function isSqlServerProvider(): boolean {
  return process.env.SYNC_STORAGE_PROVIDER?.trim().toLowerCase() === "sqlserver";
}

async function ensureStoreDir(): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await ensureStoreDir();
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildEmptyDataFile(): LocalDataFile {
  return {
    updatedAt: null,
    resources: Object.fromEntries(SYNC_RESOURCES.map((resource) => [resource, EMPTY_SNAPSHOT(resource)])) as LocalDataFile["resources"],
  };
}

async function loadLocalDataFile(): Promise<LocalDataFile> {
  const fallback = buildEmptyDataFile();
  const file = await readJson<LocalDataFile>(LOCAL_DATA_FILE, fallback);
  if (!file.resources) return fallback;
  return {
    updatedAt: file.updatedAt ?? null,
    resources: Object.fromEntries(
      SYNC_RESOURCES.map((resource) => [
        resource,
        file.resources[resource] ?? EMPTY_SNAPSHOT(resource),
      ])
    ) as LocalDataFile["resources"],
  };
}

async function saveLocalDataFile(file: LocalDataFile): Promise<void> {
  await writeJson(LOCAL_DATA_FILE, file);
}

async function loadMetaFile(): Promise<SyncMeta> {
  return readJson<SyncMeta>(SYNC_META_FILE, EMPTY_META());
}

async function saveMetaFile(meta: SyncMeta): Promise<void> {
  await writeJson(SYNC_META_FILE, meta);
}

async function loadJobsFile(): Promise<SyncJob[]> {
  const jobs = await readJson<SyncJob[]>(SYNC_JOBS_FILE, []);
  if (!Array.isArray(jobs)) return [];
  return jobs;
}

async function saveJobsFile(jobs: SyncJob[]): Promise<void> {
  await writeJson(SYNC_JOBS_FILE, jobs);
}

export async function readLocalData(resource: SyncResource): Promise<LocalResourceSnapshot> {
  if (isSqlServerProvider()) {
    return sqlStore.readLocalData(resource);
  }
  const data = await loadLocalDataFile();
  return data.resources[resource] ?? EMPTY_SNAPSHOT(resource);
}

export async function readAllLocalData(): Promise<LocalDataFile> {
  if (isSqlServerProvider()) {
    return sqlStore.readAllLocalData();
  }
  return loadLocalDataFile();
}

export async function writeLocalResource(
  resource: SyncResource,
  rows: Record<string, unknown>[],
  syncTime = new Date().toISOString()
): Promise<LocalResourceSnapshot> {
  if (isSqlServerProvider()) {
    return sqlStore.writeLocalResource(resource, rows, syncTime);
  }

  const data = await loadLocalDataFile();
  const snapshot: LocalResourceSnapshot = {
    resource,
    updatedAt: syncTime,
    count: rows.length,
    rows,
  };

  data.resources[resource] = snapshot;
  data.updatedAt = syncTime;
  await saveLocalDataFile(data);

  const meta = await loadMetaFile();
  meta.lastSyncAt = syncTime;
  meta.resources[resource] = { updatedAt: syncTime, count: rows.length };
  await saveMetaFile(meta);

  return snapshot;
}

export async function getLastSyncInfo(): Promise<SyncMeta> {
  if (isSqlServerProvider()) {
    return sqlStore.getLastSyncInfo();
  }
  return loadMetaFile();
}

export async function updateSyncMeta(partial: Partial<SyncMeta>): Promise<SyncMeta> {
  if (isSqlServerProvider()) {
    return sqlStore.updateSyncMeta(partial);
  }

  const current = await loadMetaFile();
  const next: SyncMeta = {
    ...current,
    ...partial,
    resources: {
      ...current.resources,
      ...(partial.resources ?? {}),
    },
  };
  await saveMetaFile(next);
  return next;
}

export async function getSyncJob(jobId: string): Promise<SyncJob | null> {
  if (isSqlServerProvider()) {
    return sqlStore.getSyncJob(jobId);
  }

  if (jobCache.has(jobId)) return jobCache.get(jobId) ?? null;
  const jobs = await loadJobsFile();
  const job = jobs.find((entry) => entry.id === jobId) ?? null;
  if (job) jobCache.set(jobId, job);
  return job;
}

export async function listSyncJobs(limit = 20): Promise<SyncJob[]> {
  if (isSqlServerProvider()) {
    return sqlStore.listSyncJobs(limit);
  }

  const jobs = await loadJobsFile();
  return jobs
    .slice()
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, Math.max(1, limit));
}

export async function saveSyncJob(job: SyncJob): Promise<SyncJob> {
  if (isSqlServerProvider()) {
    return sqlStore.saveSyncJob(job);
  }

  const normalizedJob: SyncJob = {
    ...job,
    updatedAt: new Date().toISOString(),
  };
  const jobs = await loadJobsFile();
  const index = jobs.findIndex((entry) => entry.id === normalizedJob.id);
  if (index >= 0) {
    jobs[index] = normalizedJob;
  } else {
    jobs.unshift(normalizedJob);
  }
  jobCache.set(normalizedJob.id, normalizedJob);
  await saveJobsFile(jobs);
  return normalizedJob;
}

export async function patchSyncJob(jobId: string, patch: Partial<SyncJob>): Promise<SyncJob | null> {
  if (isSqlServerProvider()) {
    return sqlStore.patchSyncJob(jobId, patch);
  }

  const current = await getSyncJob(jobId);
  if (!current) return null;
  const next: SyncJob = { ...current, ...patch };
  await saveSyncJob(next);
  return next;
}

export function clearJobCache(): void {
  jobCache = new Map<string, SyncJob>();
  sqlStore.clearJobCache();
}
