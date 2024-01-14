import express, { Request } from "express";
import { getWeather } from "../weather/weather";
import { getMatchPlayers, setUserReview } from "../review/review";
import { handleErrors } from "../ErrorHandler";
import { NotFoundError } from "../review/error";

const reviewRouter = express.Router();
export interface CreateReviewType {
  Receiver_id: number;
  isPositive: boolean;
  isJoin: boolean;
  Comment: string;
}

reviewRouter.get(
  "/:id",
  async (req: Request<{ id: number }, {}, {}, { userId: number }>, res) => {
    try {
      const result = await getMatchPlayers(+req.params.id, +req.query.userId);
      res.status(200);
      res.send(result);
    } catch (err) {
      if (err instanceof NotFoundError) {
        handleErrors<NotFoundError>(err, res);
      } else if (err instanceof Error) {
        handleErrors<Error>(err, res);
      }
    }
  },
);

reviewRouter.post("/", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.slice(7);
    const result = setUserReview(req.body, token!!);
    res.status(201);
    res.send(result);
  } catch (err) {
    if (err instanceof Error) {
      handleErrors<Error>(err, res);
    }
  }
});

export default reviewRouter;
