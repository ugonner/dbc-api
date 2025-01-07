export interface IQueryResult<T> {
    total: number;
    limit: number;
    page: number;
    data: T[];
}