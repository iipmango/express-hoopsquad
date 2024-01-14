import axios from "axios";
import { PrismaClient } from "@prisma/client";
import { GenerateToken } from "./token";
import { ParsedQs } from "qs";

const prisma = new PrismaClient();

async function LoginKakao(code: any) {
  const token = await axios.post(
    "https://kauth.kakao.com/oauth/token",
    {
      grant_type: "authorization_code",
      client_id: `${process.env.kakaoAPIKey}`,
      redirect_uri: "https://hoopsquad.link/auth/kakao/register", //URL
      // redirect_uri: "http://localhost:3000/auth/kakao/register", // 테스트용 localhost
      code: code,
    },
    {
      headers: {
        "Content-type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    },
  ); //발급된 인가 코드로 토큰 발급

  const user = await axios.get("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: `Bearer ${token.data.access_token}`,
      "Content-Type":
        "	Content-type: application/x-www-form-urlencoded;charset=utf-8",
    },
  }); //발급된 토큰을 가진 유저의 정보 요청
  const userData = {
    Auth_id: user.data.id,
  };

  const newToken = GenerateToken(JSON.stringify(userData)); // JWT 토큰 발행

  const isUserExist = await prisma.oAuthToken.findFirst({
    where: {
      Auth_id: user.data.id.toString(),
    },
  });

  if (!isUserExist) {
    // 유저 정보가 DB에 없으면  유저 정보 DB에 추가
    await prisma.user.create({
      data: {
        Name: user.data.properties.nickname,
        OAuthToken: {
          create: {
            Auth_id: user.data.id.toString(),
            AccessToken: newToken.Access_Token,
            RefreshToken: newToken.Refresh_Token,
            AToken_Expires: newToken.AToken_Expires,
            RToken_Expires: newToken.RToken_Expires,
            AToken_CreatedAt: newToken.AToken_CreatedAt,
            RToken_CreatedAt: newToken.RToken_CreatedAt,
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
      include: {
        OAuthToken: true,
      },
    });
    const tmp = await prisma.oAuthToken.findFirst({
      where: {
        AccessToken: newToken.Access_Token,
      },
      select: {
        User_id: true,
      },
    });
    const response = {
      Token: newToken.Access_Token,
      Id: tmp?.User_id!!.toString(),
    };
    return response;
  }

  await prisma.oAuthToken.updateMany({
    where: {
      Auth_id: user.data.id.toString(),
    },
    data: {
      AccessToken: newToken.Access_Token,
      RefreshToken: newToken.Refresh_Token,
      AToken_Expires: newToken.AToken_Expires,
      RToken_Expires: newToken.RToken_Expires,
      AToken_CreatedAt: newToken.AToken_CreatedAt,
      RToken_CreatedAt: newToken.RToken_CreatedAt,
    },
  });
  const tmp = await prisma.oAuthToken.findFirst({
    where: {
      AccessToken: newToken.Access_Token,
    },
    select: {
      User_id: true,
    },
  });
  const response = {
    Token: newToken.Access_Token,
    Id: tmp?.User_id!!.toString(),
  };
  return response;
}
async function LoginGoogle( // 유저 코드 넘어옴
  code: String | ParsedQs | String[] | ParsedQs[] | undefined,
) {
  const res = await axios.post(`${process.env.gTokenUri}`, {
    // google에서 받은 코드를 통해 access 토큰 발급
    code,
    client_id: `${process.env.gClientId}`,
    client_secret: `${process.env.gClientSecret}`,
    redirect_uri: `${process.env.gSignupRedirectUri}`,
    // redirect_uri: "http://localhost:3000/auth/google/register", //test용 로컬 호스트
    grant_type: "authorization_code",
  });

  const user = await axios.get(`${process.env.gUserInfoUri}`, {
    // 발급받은 access 토큰으로 유저 데이터 요청
    headers: {
      Authorization: `Bearer ${res.data.access_token}`,
    },
  });

  const userData = {
    Auth_id: user.data.id,
  };

  const newToken = GenerateToken(JSON.stringify(userData)); // JWT 토큰 발행

  const isUserExist = await prisma.oAuthToken.findFirst({
    where: {
      Auth_id: user.data.id.toString(),
    },
  });

  if (!isUserExist) {
    // 유저 정보가 DB에 없으면  유저 정보 DB에 추가
    await prisma.user.create({
      data: {
        Name: user.data.name,
        OAuthToken: {
          create: {
            Auth_id: user.data.id.toString(),
            AccessToken: newToken.Access_Token,
            RefreshToken: newToken.Refresh_Token,
            AToken_Expires: newToken.AToken_Expires,
            RToken_Expires: newToken.RToken_Expires,
            AToken_CreatedAt: newToken.AToken_CreatedAt,
            RToken_CreatedAt: newToken.RToken_CreatedAt,
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
      include: {
        OAuthToken: true,
      },
    });
    const tmp = await prisma.oAuthToken.findFirst({
      where: {
        AccessToken: newToken.Access_Token,
      },
      select: {
        User_id: true,
      },
    });
    const response = {
      Token: newToken.Access_Token,
      Id: tmp?.User_id!!.toString(),
    };
    return response;
  } else {
    //유저 정보가 DB에 있음 -> 액세스 토큰과 리프레시 토큰을 새로 발급해서 DB에 갱신
    await prisma.oAuthToken.updateMany({
      where: {
        Auth_id: user.data.id.toString(),
      },
      data: {
        AccessToken: newToken.Access_Token,
        RefreshToken: newToken.Refresh_Token,
        AToken_Expires: newToken.AToken_Expires,
        RToken_Expires: newToken.RToken_Expires,
        AToken_CreatedAt: newToken.AToken_CreatedAt,
        RToken_CreatedAt: newToken.RToken_CreatedAt,
      },
    });
    const tmp = await prisma.oAuthToken.findFirst({
      where: {
        AccessToken: newToken.Access_Token,
      },
      select: {
        User_id: true,
      },
    });
    const response = {
      Token: newToken.Access_Token,
      Id: tmp?.User_id!!.toString(),
    };
    return response;
  }
}

export { LoginGoogle, LoginKakao };
