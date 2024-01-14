import { PrismaClient } from "@prisma/client";
import { Request } from "express";
import { ParsedQs } from "qs";
import path from "path";
import fs from "fs";
import {
  NameDuplicateError,
  NotFoundError,
  TypeNotBooleanError,
} from "./error";
import sanitize from "sanitize-filename";

const parentDirectory = path.join(__dirname, "../../..");
const uploadsDirectory = path.join(parentDirectory, "image/user");
fs.readdir(uploadsDirectory, (error) => {
  // 디렉토리를 읽어서 해당하는 디렉토리가 없으면 해당 디렉토리를 생성
  if (error) {
    fs.mkdirSync(uploadsDirectory);
  }
});
const prisma = new PrismaClient();

function isTrue(Type: string | ParsedQs | string[] | ParsedQs[] | undefined) {
  if (Type === "true") return true;
  else if (Type === "false") return false;
  else throw new TypeNotBooleanError();
}

async function getUserProfile(userId: number) {
  const Profile = await prisma.user.findFirst({
    where: {
      User_id: userId,
    },
    select: {
      Name: true,
      Profile: {
        select: {
          User_id: true,
          Height: true,
          Introduce: true,
          Location1: true,
          Location2: true,
          City1: true,
          City2: true,
          Overall: true,
          Weight: true,
          Year: true,
          GameType: {
            select: {
              OneOnOne: true,
              ThreeOnThree: true,
              FiveOnFive: true,
            },
          },
          Image: true,
        },
      },
    },
  });
  const location1 = {
    location: Profile?.Profile?.Location1,
    City: Profile?.Profile?.City1,
  };
  const location2 = {
    location: Profile?.Profile?.Location2,
    City: Profile?.Profile?.City2,
  };

  if (!Profile) throw new NotFoundError("Profile");
  const sortedTeam = await getUserTeams(userId);
  const updatedProfile = {
    ...Profile.Profile,
    Location1: location1,
    Location2: location2,
    GameType: Profile.Profile?.GameType[0],
    Image: Profile.Profile?.Image,
    Name: Profile?.Name,
    Team: sortedTeam,
  };
  const object = Object.assign({}, updatedProfile);
  delete object.City1;
  delete object.City2;
  return object;
}

async function getUserTeams(userId: number) {
  const teams = await prisma.teamRelay.findMany({
    where: {
      User_id: userId,
    },
    select: {
      TeamProfile: {
        select: {
          Team_id: true,
          Admin_id: true,
          Name: true,
          TeamImage: true,
          Introduce: true,
        },
      },
    },
  });
  const sortedTeam = await Promise.all(
    teams.map(async (team) => {
      return {
        Team_id: team.TeamProfile.Team_id,
        Name: team.TeamProfile.Name,
        Admin_id: team.TeamProfile.Admin_id,
        TeamImage: team.TeamProfile.TeamImage,
        Introduce: team.TeamProfile.Introduce,
      };
    }),
  );
  return sortedTeam;
}
async function setUserProfile(
  req: Request<{}, any, any, ParsedQs, Record<string, any>>,
  AccessToken: string,
) {
  const isUser = await validateUser(AccessToken, req.body.data.Name);
  const { profile, updatedProfile } = await updateProfile(isUser, req);
  let image = await createOrUpdateUserImage(profile, req);
  const userName = await getUserName(isUser);
  const one = isTrue(req.body.data.One) ? true : false,
    three = isTrue(req.body.data.Three) ? true : false,
    five = isTrue(req.body.data.Five) ? true : false;

  const type = await prisma.gameType.findFirst({
    where: {
      Profile_id: profile?.Profile_id,
    },
    select: {
      GameType_id: true,
    },
  });
  let updatedType: {
    OneOnOne: boolean;
    ThreeOnThree: boolean;
    FiveOnFive: boolean;
  };
  if (!type) {
    updatedType = await createGameType(profile, one, three, five);
  } else {
    updatedType = await updateGameType(type, one, three, five);
  }
  return {
    ...updatedProfile,
    GameType: updatedType,
    Image: image,
    Name: userName,
  };
}

async function getUserName(isUser: {
  id: number;
  User_id: number;
  AccessToken: string;
  RefreshToken: string;
  AToken_CreatedAt: string;
  RToken_CreatedAt: string;
  AToken_Expires: number;
  RToken_Expires: number;
  Auth_id: string;
}) {
  return await prisma.user.findFirst({
    where: {
      User_id: isUser.User_id,
    },
    select: {
      Name: true,
    },
  });
}

async function updateGameType(
  type: { GameType_id: number },
  one: boolean,
  three: boolean,
  five: boolean,
) {
  return await prisma.gameType.update({
    where: {
      GameType_id: type?.GameType_id,
    },
    data: {
      OneOnOne: one,
      ThreeOnThree: three,
      FiveOnFive: five,
    },
    select: {
      OneOnOne: true,
      ThreeOnThree: true,
      FiveOnFive: true,
    },
  });
}

async function createGameType(
  profile: {
    User_id: number;
    Height: number | null;
    Introduce: string | null;
    Location1: string | null;
    Location2: string | null;
    Overall: number;
    Team_id: number | null;
    Weight: number | null;
    Year: number | null;
    Profile_id: number;
  } | null,
  one: boolean,
  three: boolean,
  five: boolean,
) {
  return await prisma.gameType.create({
    data: {
      Profile: { connect: { Profile_id: profile?.Profile_id } },
      OneOnOne: one,
      ThreeOnThree: three,
      FiveOnFive: five,
    },
    select: {
      OneOnOne: true,
      ThreeOnThree: true,
      FiveOnFive: true,
    },
  });
}

async function createOrUpdateUserImage(
  profile: {
    User_id: number;
    Height: number | null;
    Introduce: string | null;
    Location1: string | null;
    Location2: string | null;
    Overall: number;
    Team_id: number | null;
    Weight: number | null;
    Year: number | null;
    Profile_id: number;
  } | null,
  req: Request<{}, any, any, ParsedQs, Record<string, any>>,
) {
  let image = await prisma.image.findFirst({
    where: { Profile_id: profile?.Profile_id },
  });

  if (req.file) {
    const fileName = sanitize(req.file.filename);
    if (!image) {
      image = await prisma.image.create({
        data: {
          Profile: { connect: { Profile_id: profile?.Profile_id } },
          ImageData: fileName,
        },
      });
    } else {
      if (fileName != image.ImageData) {
        const filePath = path.join(uploadsDirectory, image.ImageData);
        fs.unlink(filePath, (unlinkErr: any) => {});
        image = await prisma.image.update({
          where: { Image_id: image.Image_id },
          data: {
            ImageData: fileName,
          },
        });
      }
    }
  } else {
    if (image) {
      const filePath = path.join(uploadsDirectory, image.ImageData);
      fs.unlink(filePath, (unlinkErr: any) => {});
      await prisma.image.delete({
        where: {
          Image_id: image.Image_id,
        },
      });
    }
  }
  return image;
}

async function updateProfile(
  isUser: {
    id: number;
    User_id: number;
    AccessToken: string;
    RefreshToken: string;
    AToken_CreatedAt: string;
    RToken_CreatedAt: string;
    AToken_Expires: number;
    RToken_Expires: number;
    Auth_id: string;
  },
  req: Request<{}, any, any, ParsedQs, Record<string, any>>,
) {
  const profile = await prisma.profile.findFirst({
    where: {
      User_id: isUser.User_id,
    },
  });

  const updatedProfile = await prisma.profile.update({
    where: {
      Profile_id: profile!!.Profile_id,
    },
    data: {
      Introduce: req.body.data.Introduce,
      ...(req.body.data.Height
        ? { Height: parseFloat(req.body.data.Height) }
        : {}),
      ...(req.body.data.Weight
        ? { Weight: parseInt(req.body.data.Weight) }
        : {}),
      ...(req.body.data.Year ? { Year: parseInt(req.body.data.Year) } : {}),
    },
  });
  return { profile, updatedProfile };
}

async function validateUser(AccessToken: string, name: string) {
  const user = await prisma.oAuthToken.findFirst({
    where: {
      AccessToken: AccessToken,
    },
  });
  if (!user) throw new NotFoundError("User");
  await checkNameDuplicate(user, name);
  return user;
}

async function checkNameDuplicate(
  user: {
    id: number;
    User_id: number;
    AccessToken: string;
    RefreshToken: string;
    AToken_CreatedAt: string;
    RToken_CreatedAt: string;
    AToken_Expires: number;
    RToken_Expires: number;
    Auth_id: string;
  },
  name: string,
) {
  const duplication = await prisma.user.findFirst({
    where: {
      AND: [{ Name: name }, { NOT: { User_id: user.User_id } }],
    },
  });
  if (!duplication) {
    await prisma.user.update({
      where: {
        User_id: user.User_id,
      },
      data: {
        Name: name,
      },
    });
  } else throw new NameDuplicateError(name);
}

async function setOverall(
  AccessToken: any,
  isJoin: boolean,
  isPositive: boolean,
  comment: string,
) {
  const userId = await prisma.oAuthToken.findFirst({
    where: {
      AccessToken: AccessToken,
    },
  });
  if (!userId) throw new NotFoundError("User");

  let score = 0;
  isJoin ? (score += 3) : (score -= 5);
  isPositive ? (score += 5) : (score -= 3);
}

export { getUserProfile, setUserProfile };
