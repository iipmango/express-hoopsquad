import express from "express";
import { getCourt, addCourt, reportCourt } from "../court/court";
import { CourtAlreadyExistError, NoCourtExistError } from "../court/error";
import { handleErrors } from "../ErrorHandler";
const courtRouter = express.Router();

courtRouter.get("/", async (_req, res) => {
  try {
    const result = await getCourt();
    res.json(result);
  } catch (err) {
    if (err instanceof NoCourtExistError) {
      handleErrors<NoCourtExistError>(err, res);
    } else if (err instanceof Error) {
      handleErrors<Error>(err, res);
    }
  }
});

courtRouter.get("/:id", async (req, res) => {
  try {
    const result = await getCourt(+req.params.id);
    res.json(result);
  } catch (err) {
    if (err instanceof NoCourtExistError) {
      handleErrors<NoCourtExistError>(err, res);
    } else if (err instanceof Error) {
      handleErrors<Error>(err, res);
    }
  }
});

courtRouter.post("/", async (req, res) => {
  try {
    const result = await addCourt(req.body);
    res.json(result);
  } catch (err) {
    if (err instanceof CourtAlreadyExistError) {
      handleErrors<CourtAlreadyExistError>(err, res);
    } else if (err instanceof Error) {
      handleErrors<Error>(err, res);
    }
  }
});

courtRouter.delete("/:id", async (req, res) => {
  try {
    await reportCourt(+req.params.id);
    res.status(202).send();
  } catch (err) {
    if (err instanceof NoCourtExistError) {
      handleErrors(err, res);
    } else if (err instanceof Error) {
      handleErrors(err, res);
    }
  }
});

export default courtRouter;
