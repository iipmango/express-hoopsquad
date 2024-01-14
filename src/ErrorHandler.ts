import { Response } from "express-serve-static-core";

export function handleErrors<T extends ErrorWithStatusCode | Error>(
  err: T,
  res: Response<any, Record<string, any>, number>,
) {
  const statusCode = err instanceof ErrorWithStatusCode ? err.statusCode : 400;
  console.error(err);
  res.status(statusCode).json({ error: err.message });
}
export class ErrorWithStatusCode extends Error {
  statusCode!: number;
}
