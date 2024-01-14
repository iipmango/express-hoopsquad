import express from "express";
import { handleErrors } from "../ErrorHandler";
import { SetProfileLocation, SetTeamLocation } from "../Location/setLocation";

const locationRouter = express.Router();

locationRouter.post("/", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.slice(7);
    const result = await SetProfileLocation(
      token!!,
      req.body.Location1,
      req.body.Location2,
    );
    res.status(201);
    res.send();
  } catch (err) {
    if (err instanceof Error) {
      handleErrors<Error>(err, res);
    }
  }
});
locationRouter.post("/:id", async (req, res) => {
  try {
    if (!req.body.Location) throw new Error();
    const result = await SetTeamLocation(+req.params.id, req.body.Location);
    res.status(201);
    res.send();
  } catch (err) {
    if (err instanceof Error) {
      handleErrors<Error>(err, res);
    }
  }
});

export default locationRouter;
