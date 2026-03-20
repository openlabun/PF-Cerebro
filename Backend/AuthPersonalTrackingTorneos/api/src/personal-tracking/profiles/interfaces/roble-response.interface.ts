// src/personalTracking/profiles/interfaces/roble-response.interface.ts
export interface InsertResponse<T> {
  inserted: T[];
  skipped: { index: number; reason: string }[];
}
