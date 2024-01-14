import express, { Request } from "express";
import { getUserProfile, setUserProfile } from "../profile/User";
import path from "path";
import multer from "multer";
import fs from "fs";
import sanitize from "sanitize-filename";
import { NotFoundError, TypeNotBooleanError } from "../profile/error";
import { handleErrors } from "../ErrorHandler";

const parentDirectory = path.join(__dirname, "../../.."); // __dirname == 이 코드 파일이 있는 절대 주소 ~~~/HOOPSQUAD-BACKEND/src/routes, "../../.." == 상위 폴더로 이동
const uploadsDirectory = path.join(parentDirectory, "image/user"); // ~~~/image/match 주소. 해당 변수는 주소에 대한 값(?)을 저장하는 것
const storage = multer.memoryStorage();
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      //저장 위치: ../../../image/user
      cb(null, uploadsDirectory);
    },
    filename(req, file, cb) {
      //파일 이름: {이름}{시간}.{확장자}
      const ext = path.extname(file.originalname);
      cb(null, path.basename(file.originalname, ext) + Date.now() + ext);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 파일 크기 제한 5mb
});

const profileRouter = express.Router();

profileRouter.get("/user/:id", async (req, res) => {
  try {
    const result = await getUserProfile(+req.params.id!!);
    if (!result) throw new Error("Profile Not Found");
    res.status(200);
    res.send(result);
  } catch (err) {
    if (err instanceof Error) {
      handleErrors(err, res);
    }
  }
});
type profile = {
  Height: string;
  Weight: string;
  Year: string;
  Introduce: string;
  One: string;
  Three: string;
  Five: string;
};
profileRouter.post("/user", upload.single("Image"), async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.slice(7);
    if (!req.body) throw new Error("Body Not Exists");
    const result = await setUserProfile(req, token!!);
    if (!result) throw new Error("Profile Not Found");
    res.status(201);
    res.send(result);
  } catch (err) {
    if (req.file) {
      const filePath = sanitize(path.join(uploadsDirectory, req.file.filename)); // 업로드 폴더의 파일 지정
      fs.unlink(filePath, (unlinkErr: any) => {
        // 해당 파일 삭제
        if (unlinkErr) {
          console.error("Error deleting file:", unlinkErr);
        }
      });
    }
    if (err instanceof NotFoundError) {
      handleErrors<NotFoundError>(err, res);
    } else if (err instanceof TypeNotBooleanError) {
      handleErrors<TypeNotBooleanError>(err, res);
    } else if (err instanceof Error) {
      handleErrors<Error>(err, res);
    }
  }
});

export default profileRouter;
