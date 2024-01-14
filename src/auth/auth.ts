import { PrismaClient } from "@prisma/client";
import { Request } from "express";
import { ParsedQs } from "qs";
import { GenerateToken } from "./token";
import {
  NotProvidedError,
  PasswordNotMatchError,
  UserAlreadyExistError,
  UserNotExistError,
} from "./error";
import { getUserProfile } from "../profile/User";

const prisma = new PrismaClient();

function NameGen(): string {
  const rand = Math.floor(Math.random() * (999999 - 0)) + 0;
  const name = "user-" + rand.toString();
  return name;
}

async function Register(
  req: Request<{}, any, any, ParsedQs, Record<string, any>>,
) {
  if (req.body.Email == undefined) throw new NotProvidedError("Email");
  const isExist = await prisma.userData.findFirst({
    // 유저가 이미 가입했는지 확인
    where: { Email: req.body.Email },
  });
  if (isExist) throw new UserAlreadyExistError(); //가입 유저
  // 미가입 유저
  const newUser = await prisma.user.create({
    data: {
      Name: NameGen(),
      UserData: {
        create: {
          Email: req.body.Email,
          Password: req.body.Password,
        },
      },
      Profile: {
        create: {
          Overall: 50,
          GameType: {
            create: {},
          },
        },
      },
    },
  });
  const newToken = await GenerateToken(
    JSON.stringify({ Auth_id: newUser.User_id }),
  );

  await prisma.oAuthToken.create({
    data: {
      User_id: newUser.User_id,
      AccessToken: newToken.Access_Token,
      RefreshToken: newToken.Refresh_Token,
      AToken_Expires: newToken.AToken_Expires,
      RToken_Expires: newToken.RToken_Expires,
      AToken_CreatedAt: newToken.AToken_CreatedAt,
      RToken_CreatedAt: newToken.RToken_CreatedAt,
      Auth_id: newUser.User_id.toString(),
    },
  });
  return { token: newToken.Access_Token };
}

async function Login(
  req: Request<{}, any, any, ParsedQs, Record<string, any>>,
) {
  if (req.body.Email == undefined) throw new NotProvidedError("Email");
  if (req.body.Password == undefined) throw new NotProvidedError("Password");
  const isExist = await prisma.userData.findFirst({
    where: {
      Email: req.body.Email,
    },
  });

  if (!isExist) throw new UserNotExistError(); // DB에 유저 없음
  if (isExist.Password != req.body.Password) throw new PasswordNotMatchError();
  // DB에 유저 있음
  const newToken = await GenerateToken(
    JSON.stringify({ Auth_id: isExist.User_id }),
  );
  const tokenId = await prisma.oAuthToken.findFirst({
    where: {
      User_id: isExist.User_id,
    },
  });
  await prisma.oAuthToken.update({
    where: {
      id: tokenId?.id,
    },
    data: {
      User_id: isExist.User_id,
      AccessToken: newToken.Access_Token,
      RefreshToken: newToken.Refresh_Token,
      AToken_Expires: newToken.AToken_Expires,
      RToken_Expires: newToken.RToken_Expires,
      AToken_CreatedAt: newToken.AToken_CreatedAt,
      RToken_CreatedAt: newToken.RToken_CreatedAt,
      Auth_id: isExist.User_id.toString(),
    },
  });
  const profile = await getUserProfile(isExist.User_id);
  return { token: newToken.Access_Token, profile };
}

export { Register, Login };
