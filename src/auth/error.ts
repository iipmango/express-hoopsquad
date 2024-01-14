import { ErrorWithStatusCode } from "../ErrorHandler";

export class NotProvidedError extends ErrorWithStatusCode {
  statusCode: number = 400;
  constructor(resource?: string) {
    let message: string;
    if (resource) {
      message = `${resource} Not Provided`;
    } else message = "Not Provided";
    super(message);
    this.name = "NotProvided";
  }
}

export class TokenNotProvidedError extends ErrorWithStatusCode {
  statusCode: number = 401;
  constructor() {
    super("Token Not Provided");
    this.name = "TokenNotProvided";
  }
}

export class UserAlreadyExistError extends ErrorWithStatusCode {
  statusCode: number = 409;
  constructor() {
    super("User Already Exist");
    this.name = "UserAlreadyExist";
  }
}

export class UserNotExistError extends ErrorWithStatusCode {
  statusCode: number = 404;
  constructor() {
    super("User Not Exist");
    this.name = "UserNotExist";
  }
}

export class PasswordNotMatchError extends ErrorWithStatusCode {
  statusCode: number = 401;
  constructor() {
    super("Password Not Match");
    this.name = "PasswordNotMatch";
  }
}

export class RefreshTokenNotValidateError extends ErrorWithStatusCode {
  statusCode: number = 401;
  constructor() {
    super("Refresh Token Not Validate");
    this.name = "RefreshTokenNotValidate";
  }
}

export class TokenNotMatchError extends ErrorWithStatusCode {
  statusCode: number = 401;
  constructor() {
    super("Token Not Match");
    this.name = "TokenNotMatch";
  }
}
