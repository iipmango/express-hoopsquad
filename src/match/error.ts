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
export class TypeNotBooleanError extends ErrorWithStatusCode {
  statusCode: number = 400;
  constructor() {
    super("Type Not Boolean Error");
    this.name = "TypeNotBooleanError";
  }
}
export class UserNotWriterError extends ErrorWithStatusCode {
  statusCode: number = 401;
  constructor() {
    super("User Not Writer");
    this.name = "UserNotWriterError";
  }
}
export class MatchJoinError extends ErrorWithStatusCode {
  statusCode: number = 400;
  constructor() {
    super("Match Join Error");
    this.name = "Match Join Error";
  }
}

export class UserAlreadyJoinError extends ErrorWithStatusCode {
  statusCode: number = 400;
  constructor() {
    super("User Already Join");
    this.name = "UserAlreadyJoin";
  }
}
