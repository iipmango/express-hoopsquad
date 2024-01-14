import { PrismaClient } from "@prisma/client";
import { Request } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { GenerateToken, AccessVerify, AccessRefresh } from "./token";
import {
  NotProvidedError,
  RefreshTokenNotValidateError,
  TokenNotMatchError,
  TokenNotProvidedError,
} from "./error";
import { getUserProfile } from "../profile/User";

const prisma = new PrismaClient();

const oneWeekInSeconds = 604799;

type Token = {
  id: number;
  User_id: number;
  AccessToken: string;
  RefreshToken: string;
  AToken_CreatedAt: string;
  RToken_CreatedAt: string;
  AToken_Expires: number;
  RToken_Expires: number;
  Auth_id: string;
};

function isTokenValidMoreThanAWeek(token: Token) {
  if (
    token.RToken_Expires + parseInt(token.RToken_CreatedAt) >
    oneWeekInSeconds
  )
    return true;
  else return false;
}

async function Validation(AccessToken: any) {
  if (!AccessToken) {
    // A/T 가 안넘어옴
    throw new TokenNotProvidedError();
  }

  const token = await prisma.oAuthToken.findFirst({
    where: {
      AccessToken: AccessToken,
    },
  });

  if (!token) throw new TokenNotMatchError();

  if (AccessVerify(token.AccessToken)) {
    const profile = await getUserProfile(token.User_id);
    return { profile };
  } // A/T O
  if (!AccessVerify(token.RefreshToken))
    throw new RefreshTokenNotValidateError(); // A/T 만료 & R/T 만료

  if (isTokenValidMoreThanAWeek(token)) {
    const newToken = AccessRefresh(token.Auth_id);
    const profile = await getUserProfile(token.User_id);
    return { access_token: newToken.Access_Token, Profile: profile };
  } else {
    const newToken = GenerateToken(token.Auth_id);
    const profile = await getUserProfile(token.User_id);
    return { access_token: newToken.Access_Token, Profile: profile };
  }
}

export { Validation };
