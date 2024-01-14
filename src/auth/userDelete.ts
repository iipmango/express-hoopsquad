import { PrismaClient } from "@prisma/client";
import { Request } from "express";
import { ParsedQs } from "qs";
import { UserNotExistError } from "./error";

const prisma = new PrismaClient();

async function UserDelete(
  req: Request<{}, any, any, ParsedQs, Record<string, any>>,
) {
  const isUserExist = await prisma.oAuthToken.findFirst({
    // DB에 유저 토큰이 존재하는지 검색
    where: {
      AccessToken: req.body.access_token,
    },
  });
  if (isUserExist) {
    //유저가 있으면 삭제
    const user = await prisma.user.delete({
      where: {
        User_id: isUserExist.User_id,
      },
    });
    return { result: "success" };
  } else throw new UserNotExistError();
}

export { UserDelete };
