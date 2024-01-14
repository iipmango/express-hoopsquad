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
export class UserNotFoundError extends ErrorWithStatusCode {
  statusCode: number = 400;
  constructor() {
    super("User Not Found");
    this.name = "UserNotFoundError";
  }
}
export class ProfileNotFoundError extends ErrorWithStatusCode {
  statusCode: number = 400;
  constructor() {
    super("Profile Not Found");
    this.name = "ProfileNotFoundError";
  }
}
export class TypeNotBooleanError extends ErrorWithStatusCode {
  statusCode: number = 400;
  constructor() {
    super("Type Not Boolean Error");
    this.name = "TypeNotBooleanError";
  }
}
export class NameDuplicateError extends ErrorWithStatusCode {
  statusCode: number = 400;
  constructor(resource?: string) {
    let message: string;
    if (resource) message = `Name ${resource} Duplicate Error`;
    else message = `Name Duplicate Error`;
    super(message);
    this.name = "NameDuplicateError";
  }
}
