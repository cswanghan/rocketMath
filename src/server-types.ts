// Structural subset of the Pages/D1 binding used by the native API handlers.
// Keeping this explicit lets the existing Node tests type-check without loading
// the entire Workers ambient runtime alongside the Web application's DOM types.
export interface D1Result<T = Record<string, unknown>> {
  success: boolean;
  results: T[];
  meta?: { last_row_id?: number };
}
export interface PreparedStatement {
  bind(...values: unknown[]): PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}
export interface Database {
  prepare(sql: string): PreparedStatement;
  batch<T = Record<string, unknown>>(statements: PreparedStatement[]): Promise<D1Result<T>[]>;
}
export type PagesHandler<Env> = (context: { request: Request; env: Env }) => Promise<Response>;
