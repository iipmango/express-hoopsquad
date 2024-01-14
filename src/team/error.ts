import { ErrorWithStatusCode } from "../ErrorHandler";

export class TeamNotFoundError extends ErrorWithStatusCode {
  statusCode: number = 404;
  constructor() {
    super("Team Not Found");
    this.name = "TeamNotFoundError";
  }
}

export class NotAdminError extends ErrorWithStatusCode {
  statusCode: number = 401;
  constructor() {
    super("Not Admin");
    this.name = "NotAdmin";
  }
}
export class UserAlreadyAdminError extends ErrorWithStatusCode {
  statusCode: number = 400;
  constructor() {
    super("Already Already Admin To Team");
    this.name = "AlreadyAlreadyAdminToTeam";
  }
}
export class UserAlreadyInTeamError extends ErrorWithStatusCode {
  statusCode: number = 400;
  constructor() {
    super("User Already In Team");
    this.name = "UserAlreadyInTeam";
  }
}
export class AlreadyParticipateError extends ErrorWithStatusCode {
  statusCode: number = 400;
  constructor() {
    super("Already Participate To Team");
    this.name = "AlreadyParticipateToTeam";
  }
}

export class TeamAdminLeaveError extends ErrorWithStatusCode {
  statusCode: number = 400;
  constructor() {
    super("Team Admin Cannot Leave Team");
    this.name = "TeamAdminLeave";
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
