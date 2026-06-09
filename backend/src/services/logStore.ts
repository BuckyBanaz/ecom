export type LogLevel = "info" | "warn" | "error";
export type LogType = "request" | "error" | "system";

export interface AppLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  type: LogType;
  message: string;
  method?: string;
  url?: string;
  statusCode?: number;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

const MAX_LOGS = 1000;
const logs: AppLogEntry[] = [];
let logCounter = 0;

function createId(): string {
  logCounter += 1;
  return `${Date.now()}-${logCounter}`;
}

export function addLog(entry: Omit<AppLogEntry, "id" | "timestamp"> & { timestamp?: string }) {
  const record: AppLogEntry = {
    id: createId(),
    timestamp: entry.timestamp ?? new Date().toISOString(),
    level: entry.level,
    type: entry.type,
    message: entry.message,
    method: entry.method,
    url: entry.url,
    statusCode: entry.statusCode,
    durationMs: entry.durationMs,
    meta: entry.meta,
  };

  logs.unshift(record);
  if (logs.length > MAX_LOGS) {
    logs.length = MAX_LOGS;
  }

  return record;
}

export function getLogs(options: {
  limit?: number;
  offset?: number;
  level?: LogLevel;
  type?: LogType;
  search?: string;
}) {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);
  const search = options.search?.trim().toLowerCase();

  let filtered = logs;

  if (options.level) {
    filtered = filtered.filter((log) => log.level === options.level);
  }

  if (options.type) {
    filtered = filtered.filter((log) => log.type === options.type);
  }

  if (search) {
    filtered = filtered.filter((log) => {
      const haystack = [
        log.message,
        log.method,
        log.url,
        log.statusCode?.toString(),
        JSON.stringify(log.meta ?? {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  return {
    total: filtered.length,
    limit,
    offset,
    logs: filtered.slice(offset, offset + limit),
  };
}

export function getLogStats() {
  const lastHour = Date.now() - 60 * 60 * 1000;
  const recent = logs.filter((log) => new Date(log.timestamp).getTime() >= lastHour);

  return {
    totalStored: logs.length,
    maxStored: MAX_LOGS,
    lastHour: {
      total: recent.length,
      errors: recent.filter((log) => log.level === "error").length,
      warnings: recent.filter((log) => log.level === "warn").length,
      requests: recent.filter((log) => log.type === "request").length,
      avgDurationMs:
        recent
          .filter((log) => typeof log.durationMs === "number")
          .reduce((sum, log) => sum + (log.durationMs ?? 0), 0) /
          Math.max(recent.filter((log) => typeof log.durationMs === "number").length, 1),
    },
    latest: logs[0] ?? null,
  };
}

export function clearLogs() {
  logs.length = 0;
}
