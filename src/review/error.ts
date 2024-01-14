import { ErrorWithStatusCode } from "../ErrorHandler";

export class NotFoundError extends ErrorWithStatusCode {
  statusCode: number = 404;
  constructor(resource?: string) {
    let message: string;
    if (resource) {
      message = `${resource} Not Found`;
    } else message = "Not Found";
    super(message);
    this.name = "NotFound";
  }
}
