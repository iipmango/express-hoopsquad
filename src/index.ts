import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import http from "http";
import rateLimit from "express-rate-limit";
import SocketIO from "socket.io";

let limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 5분간
  max: 100, // 100개 request 가능
});

const app = express();
app.set("trust proxy", true);

app.use(cors());
app.use(bodyParser.json());
app.use(limiter);

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

const httpServer = http.createServer(app);
import teamRouter from "./routes/teamRouter";
import authRouter from "./routes/authRouter";
import courtRouter from "./routes/courtRouter";
import chatServerHandler from "./routes/chatRouter";
import matchRouter from "./routes/matchRouter";
import profileRouter from "./routes/profileRouter";
import imageRouter from "./routes/imageRouter";
import weatherRouter from "./routes/weatherRouter";
import reviewRouter from "./routes/reviewRouter";
import notificationRouter from "./routes/notificationRouter";
import locationRouter from "./routes/locationRouter";

app.use("/auth", authRouter);
app.use("/court", courtRouter);
app.use("/team", teamRouter);
app.use("/match", matchRouter);
app.use("/profile", profileRouter);
app.use("/image", imageRouter);
app.use("/weather", weatherRouter);
app.use("/review", reviewRouter);
app.use("/notification", notificationRouter);
app.use("/location", locationRouter);
app.use(
  bodyParser.raw({
    type: "image/jpeg",
    limit: "10mb",
  }),
);

const chatServer = new SocketIO.Server(httpServer, {
  cors: {
    origin: "*",
  },
});

chatServerHandler(chatServer);

app.get("/", async (_req, res) => {
  try {
    res.json({ connect: "OK" });
  } catch (err) {
    res.json(err);
    return console.error(err);
  }
});

httpServer.listen(3000, () => {
  console.log("Server started on Port 3000");
});
