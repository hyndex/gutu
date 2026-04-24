export interface ListQuery {
  page?: number;
  pageSize?: number;
  sort?: { field: string; dir: "asc" | "desc" };
  search?: string;
  filters?: Record<string, unknown>;
}

export interface ListResult<T = Record<string, unknown>> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** The framework-facing resource contract. Adapters (REST, GraphQL, mock)
 *  all implement this shape. */
export interface ResourceAdapter {
  list(resource: string, query: ListQuery): Promise<ListResult>;
  get(resource: string, id: string): Promise<Record<string, unknown> | null>;
  create(resource: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(
    resource: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  delete(resource: string, id: string): Promise<void>;
}
