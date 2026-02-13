declare module 'sql.js' {
  interface QueryExecResult {
    columns: string[];
    values: unknown[][];
  }

  interface Statement {
    bind(params?: unknown[] | Record<string, unknown>): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): void;
  }

  interface Database {
    run(sql: string, params?: unknown[] | Record<string, unknown>): Database;
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    getRowsModified(): number;
    export(): Uint8Array;
    close(): void;
  }

  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }

  interface InitSqlJsOptions {
    locateFile?: (file: string) => string;
  }

  export type { Database, Statement, QueryExecResult, SqlJsStatic };
  export default function initSqlJs(options?: InitSqlJsOptions): Promise<SqlJsStatic>;
}
