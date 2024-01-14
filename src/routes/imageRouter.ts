import express from "express";
import path from "path";

const parentDirectory = path.join(__dirname, "../../..");
const imageDirectory = path.join(parentDirectory, "image");
const imageRouter = express.Router();

// 이미지가 저장된 폴더를 노출하는 코드. url을 통해 해당 폴더에 접근할 수 있다라고 생각하면 편할듯?
imageRouter.use("/match", express.static(path.join(imageDirectory, "match")));
imageRouter.use("/user", express.static(path.join(imageDirectory, "user")));
imageRouter.use("/team", express.static(path.join(imageDirectory, "team")));

export default imageRouter;
