export interface Error {
  field: string;
  message: string;
  rule: string;
}

export interface ErrorResponse {
  errors: Error[];
}

export const isErrorResponse = (r: unknown): r is ErrorResponse => (
  (r as ErrorResponse).errors !== undefined
);
