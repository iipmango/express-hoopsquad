import express from "express";
import { LoginKakao, LoginGoogle } from "../auth/oAuth";
import { Login, Register } from "../auth/auth";
import { UserDelete } from "../auth/userDelete";
import { Validation } from "../auth/validate";
import {
  NotProvidedError,
  PasswordNotMatchError,
  TokenNotMatchError,
  TokenNotProvidedError,
  UserAlreadyExistError,
  UserNotExistError,
} from "../auth/error";
import { handleErrors } from "../ErrorHandler";

const authRouter = express.Router();

authRouter.post("/register", async (req, res) => {
  try {
    const result = await Register(req);
    res.status(201);
    res.send(result);
  } catch (err) {
    if (err instanceof NotProvidedError) {
      handleErrors<NotProvidedError>(err, res);
    } else if (err instanceof UserAlreadyExistError) {
      handleErrors<UserAlreadyExistError>(err, res);
    } else if (err instanceof Error) {
      handleErrors<Error>(err, res);
    }
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const result = await Login(req);
    res.status(200);
    res.send(result);
  } catch (err) {
    if (err instanceof NotProvidedError) {
      handleErrors<NotProvidedError>(err, res);
    } else if (err instanceof UserNotExistError) {
      handleErrors<UserNotExistError>(err, res);
    } else if (err instanceof PasswordNotMatchError) {
      handleErrors<PasswordNotMatchError>(err, res);
    } else if (err instanceof Error) {
      handleErrors<Error>(err, res);
    }
  }
});

authRouter.get("/google/register", async (req, res) => {
  try {
    const result = await LoginGoogle(req.query.code);
    res.header("Authorization", `Bearer ${result.Token}`);
    res.header("User-Id", result.Id);
    res.status(200);
    res.end();
  } catch (err) {
    if (err instanceof Error) {
      handleErrors(err, res);
    }
  }
});

authRouter.get("/kakao/register", async (req, res) => {
  try {
    const result = await LoginKakao(req.query.code);
    res.header("Access-Token", result.Token);
    res.header("User-Id", result.Id);
    res.status(200);
    res.end();
  } catch (err) {
    if (err instanceof Error) {
      handleErrors(err, res);
    }
  }
});

authRouter.post("/validation", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.slice(7);
    const result = await Validation(token);
    if (result?.access_token) res.status(201); //Created
    else res.status(200); //OK
    res.send(result);
  } catch (err) {
    if (err instanceof TokenNotProvidedError) {
      handleErrors(err, res);
    } else if (err instanceof TokenNotMatchError) {
      handleErrors(err, res);
    } else if (err instanceof Error) {
      handleErrors(err, res);
    }
  }
});

authRouter.post("/delete", async (req, res) => {
  try {
    const result = await UserDelete(req);
    res.status(200);
    res.send(result);
  } catch (err) {
    if (err instanceof UserNotExistError) {
      handleErrors(err, res);
    }
    if (err instanceof Error) {
      handleErrors(err, res);
    }
  }
});

export default authRouter;
