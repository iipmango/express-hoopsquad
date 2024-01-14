import express, { Request, Response, Router } from "express";
import {
  createTeam,
  acceptTeamMatch,
  deleteTeam,
  enterMatchResult,
  getTeam,
  joinTeam,
  leaveTeam,
  participateTeam,
  participateTeamMatch,
  updateTeamProfile,
} from "../team/team";
import {
  NotAdminError,
  TeamNotFoundError,
  UserAlreadyInTeamError,
} from "../team/error";
import multer from "multer";
import path from "path";
import fs from "fs";
import sanitize from "sanitize-filename";
import { handleErrors } from "../ErrorHandler";

const teamRouter = express.Router();
const parentDirectory = path.join(__dirname, "../../.."); // __dirname == 이 코드 파일이 있는 절대 주소 ~~~/HOOPSQUAD-BACKEND/src/routes, "../../.." == 상위 폴더로 이동
const uploadsDirectory = path.join(parentDirectory, "image/team"); // ~~~/image/team 주소. 해당 변수는 주소에 대한 값(?)을 저장하는 것
fs.readdir(uploadsDirectory, (error) => {
  // 디렉토리를 읽어서 해당하는 디렉토리가 없으면 해당 디렉토리를 생성
  if (error) {
    fs.mkdirSync(uploadsDirectory);
  }
});
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      //저장 위치: ../../../image/team
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
export interface CreateTeamType {
  Admin_id: string;
  Name: string;
  Location1: { location: string; city: string };
  Location2?: { location: string; city: string };
  Introduce?: string;
  ActiveTime?: string;
}
//getTeam
teamRouter.get("/", async (req, res) => {
  try {
    const location = req.query.location;
    const city = req.query.city;
    const result = await getTeam(
      undefined,
      location?.toString(),
      city?.toString(),
    );
    res.status(200);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      handleErrors<Error>(err, res);
    }
  }
});
//getTeam
teamRouter.get("/:id", async (req, res) => {
  try {
    const result = await getTeam(+req.params.id, undefined);
    res.json(result);
  } catch (err) {
    if (err instanceof TeamNotFoundError) {
      handleErrors<TeamNotFoundError>(err, res);
    } else if (err instanceof Error) {
      handleErrors<Error>(err, res);
    }
  }
});
//joinTeam
teamRouter.post(
  "/:id(\\d+)",
  async (
    req: Request<{ id: number }, {}, { userId: number; isApply: boolean }, {}>,
    res,
  ) => {
    try {
      await joinTeam(+req.params.id, req.body.userId, req.body.isApply);
      res.status(201).json({ result: "success" });
    } catch (err) {
      if (err instanceof TeamNotFoundError) {
        handleErrors(err, res);
      } else if (err instanceof UserAlreadyInTeamError) {
        handleErrors(err, res);
      } else if (err instanceof Error) {
        handleErrors(err, res);
      }
    }
  },
);
//leaveTeam
teamRouter.delete(
  "/:id",
  async (req: Request<{ id: number }, {}, {}, { userId: number }>, res) => {
    try {
      await leaveTeam(+req.params.id, +req.query.userId);
      res.status(204).send();
    } catch (err) {
      if (err instanceof TeamNotFoundError) {
        handleErrors(err, res);
      } else if (err instanceof Error) {
        handleErrors(err, res);
      }
    }
  },
);
//createTeam
teamRouter.post(
  "/",
  upload.single("Image"),
  async (
    req: express.Request<
      {},
      {},
      {
        data: {
          adminId: string;
          name: string;
          location1: { location: string; city: string };
          location2?: { location: string; city: string };
          introduce?: string;
          activeTime?: string;
        };
      },
      {}
    >,
    res: express.Response,
  ) => {
    try {
      const { adminId, name, location1, location2, introduce, activeTime } =
        req.body.data;
      let file = req.file?.filename;
      await createTeam(
        {
          Admin_id: adminId,
          Name: name,
          Location1: location1,
          Location2: location2,
          Introduce: introduce,
          ActiveTime: activeTime,
        },
        file,
      );
      res.status(201).json({ result: "success" });
    } catch (err) {
      if (req.file) {
        const filePath = sanitize(
          path.join(uploadsDirectory, req.file.filename),
        ); // 업로드 폴더의 파일 지정
        fs.unlink(filePath, (unlinkErr: any) => {
          // 해당 파일 삭제
          if (unlinkErr) {
            console.error("Error deleting file:", unlinkErr);
          }
        });
      }
      if (err instanceof Error) {
        handleErrors(err, res);
      }
    }
  },
);
//deleteTeam
teamRouter.delete(
  "/",
  async (
    req: express.Request<{}, {}, {}, { teamId: number; adminId: number }>,
    res,
  ) => {
    try {
      await deleteTeam(+req.query.teamId, +req.query.adminId);
      res.send();
    } catch (err) {
      if (err instanceof TeamNotFoundError) {
        handleErrors(err, res);
      } else if (err instanceof NotAdminError) {
        handleErrors(err, res);
      } else if (err instanceof Error) {
        handleErrors(err, res);
      }
    }
  },
);
//acceptTeamMatch
teamRouter.post("/match", async (req, res) => {
  try {
    acceptTeamMatch(
      +req.body.HostTeam_id,
      +req.body.GuestTeam_id,
      req.body.IsApply,
      req.body.PlayTime,
    );
    res.status(201);
    res.send();
  } catch (err) {
    if (err instanceof Error) {
      handleErrors(err, res);
    }
  }
});
//enterMatchResult
teamRouter.post("/match/:id", async (req, res) => {
  try {
    enterMatchResult(+req.params.id, +req.body.HostScore, +req.body.GuestScore);
    res.status(201);
    res.send();
  } catch (err) {
    if (err instanceof Error) {
      handleErrors(err, res);
    }
  }
});
export default teamRouter;
//participateTeam
teamRouter.post(
  "/participate/:id",
  async (req: Request<{ id: number }, {}, { userId: number }, {}>, res) => {
    try {
      await participateTeam(+req.params.id, req.body.userId);
      res.status(201).send({ result: "success" });
    } catch (err) {
      if (err instanceof Error) {
        handleErrors(err, res);
      }
    }
  },
);
//participateTeamMatch
teamRouter.post(
  "/participate",
  async (
    req: Request<
      { id: number },
      {},
      { hostTeamId: number; guestTeamId: number },
      {}
    >,
    res,
  ) => {
    try {
      await participateTeamMatch(req.body.hostTeamId, req.body.guestTeamId);
      res.status(201).send({ result: "success" });
    } catch (err) {
      if (err instanceof Error) {
        handleErrors(err, res);
      }
    }
  },
);
//updateTeamProfile
teamRouter.patch(
  "/",
  upload.array("Image", 10),
  async (
    req: Request<
      {},
      {},
      {
        data: {
          teamId: string;
          adminId: string;
          name: string;
          location1: { location: string; city: string };
          location2?: { location: string; city: string };
          introduce?: string;
          activeTime?: string;
        };
      },
      {}
    >,
    res: Response<{}>,
  ) => {
    try {
      let files;
      if (Array.isArray(req.files)) {
        files = req.files.map((file) => {
          return file.filename;
        });
      }
      const {
        teamId,
        adminId,
        name,
        location1,
        location2,
        introduce,
        activeTime,
      } = req.body.data;
      await updateTeamProfile(
        {
          teamId: +teamId,
          adminId: +adminId,
          name: name,
          location1: location1,
          location2: location2,
          introduce: introduce,
          activeTime: activeTime,
        },
        files,
      );
      res.status(201).send({ result: "success" });
    } catch (err) {
      if (err instanceof Error) {
        handleErrors(err, res);
      }
    }
  },
);
