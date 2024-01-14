import { ErrorWithStatusCode } from "../ErrorHandler";

export class CourtAlreadyExistError extends ErrorWithStatusCode {
  statusCode: number = 409;
  constructor() {
    super("Court Already Exist");
    this.name = "CourtAlreadyExist";
  }
}

export class NoCourtExistError extends ErrorWithStatusCode {
  statusCode: number = 404;
  constructor() {
    super("No Court Exist");
    this.name = "NoCourtExist";
  }
}
