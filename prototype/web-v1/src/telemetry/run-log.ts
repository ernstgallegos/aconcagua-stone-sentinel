import type { RunLogRecord } from '../types/domain.js';

export function appendRunSummary(records: RunLogRecord[]): RunLogRecord[] {
  if (!records.length) return [];
  return records;
}
