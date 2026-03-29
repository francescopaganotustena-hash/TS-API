import type { LocalDataFile, LocalResourceSnapshot, SyncJob, SyncMeta, SyncResource } from "./_syncTypes";
import * as sqlStore from "./_syncStoreSqlServer";

export interface LocalQueryResult {
  resource: SyncResource;
  count: number;
  updatedAt: string | null;
  data: Record<string, unknown>[];
}

function assertSqlServerProvider(): void {
  const provider = process.env.SYNC_STORAGE_PROVIDER?.trim().toLowerCase();
  if (provider && provider !== "sqlserver") {
    throw new Error("Storage provider non supportato: usare SYNC_STORAGE_PROVIDER=sqlserver");
  }
}

export async function readLocalData(resource: SyncResource): Promise<LocalResourceSnapshot> {
  assertSqlServerProvider();
  return sqlStore.readLocalData(resource);
}

export async function queryLocalResource(
  resource: SyncResource,
  filters: Record<string, string>,
  pageNumber: number,
  pageSize: number
): Promise<LocalQueryResult> {
  assertSqlServerProvider();
  return sqlStore.queryLocalResource(resource, filters, pageNumber, pageSize);
}

export async function readAllLocalData(): Promise<LocalDataFile> {
  assertSqlServerProvider();
  return sqlStore.readAllLocalData();
}

export async function writeLocalResource(
  resource: SyncResource,
  rows: Record<string, unknown>[],
  syncTime = new Date().toISOString()
): Promise<LocalResourceSnapshot> {
  assertSqlServerProvider();
  return sqlStore.writeLocalResource(resource, rows, syncTime);
}

export async function getLastSyncInfo(): Promise<SyncMeta> {
  assertSqlServerProvider();
  return sqlStore.getLastSyncInfo();
}

export async function updateSyncMeta(partial: Partial<SyncMeta>): Promise<SyncMeta> {
  assertSqlServerProvider();
  return sqlStore.updateSyncMeta(partial);
}

export async function getSyncJob(jobId: string): Promise<SyncJob | null> {
  assertSqlServerProvider();
  return sqlStore.getSyncJob(jobId);
}

export async function listSyncJobs(limit = 20): Promise<SyncJob[]> {
  assertSqlServerProvider();
  return sqlStore.listSyncJobs(limit);
}

export async function listActiveSyncJobs(limit = 20): Promise<SyncJob[]> {
  assertSqlServerProvider();
  const jobs = await sqlStore.listSyncJobs(limit);
  return jobs.filter((job) => job.status === "running" || job.status === "queued");
}

export async function saveSyncJob(job: SyncJob): Promise<SyncJob> {
  assertSqlServerProvider();
  return sqlStore.saveSyncJob(job);
}

export async function patchSyncJob(jobId: string, patch: Partial<SyncJob>): Promise<SyncJob | null> {
  assertSqlServerProvider();
  return sqlStore.patchSyncJob(jobId, patch);
}

export function clearJobCache(): void {
  sqlStore.clearJobCache();
}
