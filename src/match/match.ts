import express from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { ParsedQs } from "qs";
import { LatLngToAddress, AddressToLatLng } from "../google-maps/googleMaps";
import {
  NotFoundError,
  UserNotWriterError,
  TypeNotBooleanError,
  MatchJoinError,
  UserAlreadyJoinError,
} from "./error";
import multer from "multer";
import fs from "fs";
import path from "path";
import Expo from "expo-server-sdk";
import { getToken } from "../alarm/pushNotification";

const parentDirectory = path.join(__dirname, "../../..");
const uploadsDirectory = path.join(parentDirectory, "image/match");
fs.readdir(uploadsDirectory, (error) => {
  // 디렉토리를 읽어서 해당하는 디렉토리가 없으면 해당 디렉토리를 생성
  if (error) {
    fs.mkdirSync(uploadsDirectory);
  }
});
``;

const prisma = new PrismaClient();
const expo = new Expo();

function getCurrentTime() {
  // 현재 날짜와 시간을 포함하는 Date 객체 생성
  const currentDate = new Date("2023-11-11T15:16:00");
  return Math.floor(Date.now() / 1000);
}

function isTrue(Type: string | ParsedQs | string[] | ParsedQs[] | undefined) {
  // true, false string을 boolean으로 변환
  if (Type === "true") return true;
  else if (Type === "false") return false;
  else throw new TypeNotBooleanError();
}

async function SearchMatchByTitle(
  filter: string,
  location: string,
  sort: string,
  input: any,
) {
  // 제목, 주소 기반 검색
  return await prisma.posting.findMany({
    where: {
      Location: { contains: location },
      [filter]: {
        contains: input ? input : "",
      },
      IsTeam: false,
    },
    orderBy: {
      [sort]: "asc",
    },
    select: {
      Posting_id: true,
      Title: true,
      WriteDate: true,
      PlayTime: true,
      Location: true,
      RecruitAmount: true,
      CurrentAmount: true,
      GameType: {
        select: {
          OneOnOne: true,
          ThreeOnThree: true,
          FiveOnFive: true,
        },
      },
      Image: {
        select: {
          ImageData: true,
        },
      },
    },
  });
}

async function SearchMatchByType(
  typePostingId: number[],
  sort: string,
  location: string,
) {
  // 게임 유형에 따라 검사
  return await prisma.posting.findMany({
    where: {
      Location: { contains: location },
      Posting_id: {
        in: typePostingId,
      },
      IsTeam: false,
    },
    orderBy: {
      [sort]: "asc",
    },
    select: {
      Posting_id: true,
      Title: true,
      WriteDate: true,
      PlayTime: true,
      Location: true,
      RecruitAmount: true,
      CurrentAmount: true,
      GameType: {
        select: {
          OneOnOne: true,
          ThreeOnThree: true,
          FiveOnFive: true,
        },
      },
      Image: {
        select: {
          ImageData: true,
        },
      },
      Map: {
        select: {
          LocationName: true,
          Lat: true,
          Lng: true,
        },
      },
    },
  });
}

async function AllMatch( // 게시글 전체 조회
  Sort: string,
  Location: string,
  Filter: string,
  Input: string,
  One: string,
  Three: string,
  Five: string,
) {
  // 정렬: 최신순, 마감순  필터: 제목, 유형, 지역    sort: "WriteDate PlayTime" / filter: "Title GameType Location"
  const sort = Sort;
  const input = Input;
  const location = Location;
  let one, three, five;
  if (!location) throw new NotFoundError("Location");
  if (!sort) throw new NotFoundError("Sort"); //  정렬 정보 없을때

  switch (Filter) {
    case "Title":
      return SearchMatchByTitle("Title", location, sort, input);
    case "GameType":
      isTrue(One) ? (one = true) : (one = false);
      isTrue(Three) ? (three = true) : (three = false);
      isTrue(Five) ? (five = true) : (five = false);

      const typePostingId = await prisma.gameType.findMany({
        // 검색 조건에 맞는 GameType 테이블을 먼저 검색
        where: {
          Posting_id: { not: null },
          ...(one ? { OneOnOne: true } : {}),
          ...(three ? { ThreeOnThree: true } : {}),
          ...(five ? { FiveOnFive: true } : {}),
        },
        select: {
          Posting_id: true,
        },
      });
      if (!typePostingId) throw new NotFoundError("GameType");
      const postingIds: number[] = typePostingId.map((item) =>
        item.Posting_id
          ? item.Posting_id
          : (() => {
              throw new NotFoundError("Posting_id");
            })(),
      );
      return await SearchMatchByType(postingIds, sort, location);
  }
}

async function AddMatch(
  request: Request<{}, any, any, ParsedQs, Record<string, any>>,
  AccessToken: string,
) {
  const user = await prisma.oAuthToken.findFirst({
    // 유저 있는지 확인 및 user_id 가져오기
    where: {
      AccessToken: AccessToken,
    },
    select: {
      User_id: true,
    },
  });

  if (!user) throw new NotFoundError("User");

  const req = request.body.data;
  const Location = (await LatLngToAddress(+req.Lat, +req.Lng)).result;
  const playTime = new Date(req.PlayTime).getTime();

  const one = isTrue(req.One) ? true : false,
    three = isTrue(req.Three) ? true : false,
    five = isTrue(req.Five) ? true : false,
    isTeam = isTrue(req.IsTeam) ? true : false;
  // const Time = getISOTime();
  const newMap = await prisma.map.create({
    data: {
      LocationName: req.LocationName,
      Lat: +req.Lat,
      Lng: +req.Lng,
      Posting: {
        create: {
          User: { connect: { User_id: user.User_id } },
          IsTeam: isTeam,
          Title: req.Title.toString(),
          GameType: {
            create: {
              OneOnOne: one,
              ThreeOnThree: three,
              FiveOnFive: five,
            },
          },
          PlayTime: playTime / 1000,
          Location: Location,
          RecruitAmount: req.RecruitAmount,
          CurrentAmount: req.CurrentAmount,
          Introduce: req.Introduce,
        },
      },
    },
  });

  const posting = await prisma.posting.findFirst({
    where: {
      Map_id: newMap.Map_id,
    },
  });

  await prisma.member.create({
    data: {
      User: { connect: { User_id: user.User_id } },
      Posting: { connect: { Posting_id: posting?.Posting_id } },
      IsHost: true,
    },
  });

  const files = request.files as Array<Express.Multer.File>;
  if (files) {
    files.map(async (file: any) => {
      // 이미지 테이블에는 이미지 제목을 저장
      await prisma.image.create({
        data: {
          Posting: { connect: { Posting_id: posting?.Posting_id } },
          ImageData: file.filename,
        },
      });
    });
  }

  return {
    TimeStamp: Date.now().toString(),
    Posting_id: posting?.Posting_id!!,
  };
}

async function MatchInfo(postingId: number, guestId: number) {
  const map = await prisma.posting.findFirst({
    where: {
      Posting_id: postingId,
    },
    select: {
      Map_id: true,
      User_id: true,
    },
  });

  if (!map) throw new NotFoundError("Posting");

  const postNickname = (
    await prisma.user.findFirstOrThrow({
      where: {
        User_id: map.User_id,
      },
      select: {
        Name: true,
      },
    })
  ).Name;

  const match = await prisma.map.findFirstOrThrow({
    where: {
      Map_id: map.Map_id,
    },
    select: {
      LocationName: true,
      Lat: true,
      Lng: true,
      Posting: {
        select: {
          Posting_id: true,
          User_id: true,
          IsTeam: true,
          Title: true,
          WriteDate: true,
          PlayTime: true,
          Location: true,
          RecruitAmount: true,
          CurrentAmount: true,
          Introduce: true,
          GameType: {
            select: {
              OneOnOne: true,
              ThreeOnThree: true,
              FiveOnFive: true,
            },
          },
          Image: {
            select: {
              ImageData: true,
            },
          },
        },
      },
    },
  });
  const writerImage = await getWriterImage(match);
  const roomId = (
    await prisma.chatRoom.findFirst({
      where: {
        AND: [{ User_id: guestId }, { Posting_id: postingId }],
      },
      select: {
        Room_id: true,
      },
    })
  )?.Room_id;

  const result = {
    ...match.Posting[0],
    LocationName: match.LocationName,
    Lat: match.Lat,
    Lng: match.Lng,
    GameType: match.Posting[0].GameType,
    Image: match.Posting[0].Image,
    WriterImage: writerImage.Profile?.Image[0],
    roomId: roomId,
    postWriterNickname: postNickname,
  };
  if (!match) throw new NotFoundError("Posting");
  return result;
}

async function getWriterImage(match: {
  LocationName: string;
  Lat: number;
  Lng: number;
  Posting: {
    Posting_id: number;
    User_id: number;
    IsTeam: boolean;
    Title: string;
    WriteDate: Date;
    PlayTime: number;
    Location: string;
    RecruitAmount: string;
    CurrentAmount: string;
    Introduce: string | null;
    GameType: {
      OneOnOne: boolean;
      ThreeOnThree: boolean;
      FiveOnFive: boolean;
    }[];
    Image: {
      ImageData: string;
    }[];
  }[];
}) {
  return await prisma.user.findFirstOrThrow({
    where: {
      User_id: match.Posting[0].User_id,
    },
    select: {
      Profile: {
        select: {
          Image: {
            select: {
              ImageData: true,
            },
          },
        },
      },
    },
  });
}

async function DeleteMatch(Posting_id: number, access_token: any) {
  // 게시글 삭제
  const user = await prisma.oAuthToken.findFirst({
    where: {
      AccessToken: access_token,
    },
    select: { User_id: true },
  });
  if (!user) throw new NotFoundError("User");

  const posting = await prisma.posting.findFirst({
    where: {
      Posting_id: Posting_id,
    },
    select: { Posting_id: true, User_id: true },
  });
  if (user.User_id === posting?.User_id) {
    await prisma.posting.delete({
      where: { Posting_id: posting.Posting_id },
    });
    const images = await prisma.image.findMany({
      where: {
        Posting_id: posting.Posting_id,
      },
    });
    if (images) {
      images.forEach((file: any) => {
        const filePath = path.join(uploadsDirectory, file.ImageData);
        fs.unlink(filePath, (unlinkErr: any) => {});
      });
    }
  } else throw new UserNotWriterError();
}

async function JoinMatch(roomId: number, isApply: boolean) {
  const room = await prisma.chatRoom.findFirstOrThrow({
    where: {
      AND: [{ Room_id: roomId }, { IsHost: false }],
    },
    select: {
      User_id: true,
      Posting_id: true,
    },
  });

  const guestId = room.User_id;
  const Posting_id = room.Posting_id;

  const guestToken = await getToken(String(guestId));
  const posting = await getPostingTitle(Posting_id);
  const guestName = await getGuestName(guestId);
  await updateApply(Posting_id, guestId, isApply);

  if (isApply) {
    const post = await prisma.posting.findFirstOrThrow({
      where: {
        Posting_id: Posting_id,
      },
      select: {
        CurrentAmount: true,
        RecruitAmount: true,
      },
    });

    const currentAmount = post.CurrentAmount;
    const recruitAmount = post.RecruitAmount;

    if (currentAmount == recruitAmount) throw new Error("All Slots Booked");

    await prisma.member.create({
      data: {
        Posting: { connect: { Posting_id: Posting_id } },
        User: { connect: { User_id: guestId } },
      },
    });

    await prisma.posting.update({
      where: {
        Posting_id: Posting_id,
      },
      data: {
        RecruitAmount: recruitAmount + 1,
      },
    });

    expo.sendPushNotificationsAsync([
      {
        to: guestToken.token,
        title: posting.Title,
        body: `${guestName}님의 참가 신청이 수락되었습니다!`,
        data: {
          type: "matchJoinAccepted",
        },
      },
    ]);
  } else {
    expo.sendPushNotificationsAsync([
      {
        to: guestToken.token,
        title: posting.Title,
        body: `${guestName}님의 참가 신청이 거절되었습니다.`,
        data: {
          type: "matchJoinRejected",
        },
      },
    ]);
  }
}

async function updateApply(
  Posting_id: number,
  guestId: number,
  isApply: boolean,
) {
  const apply = await prisma.matchAlarm.findFirstOrThrow({
    where: {
      AND: [{ Posting_id: Posting_id }, { Opponent_id: guestId }],
    },
    select: {
      id: true,
    },
  });
  await prisma.matchAlarm.update({
    where: {
      id: apply.id,
    },
    data: {
      IsApply: isApply,
    },
  });
}

async function getPostingTitle(Posting_id: number) {
  return await prisma.posting.findFirstOrThrow({
    where: {
      Posting_id: Posting_id,
    },
    select: {
      Title: true,
    },
  });
}

async function getGuestName(guestId: number) {
  return await prisma.user.findFirstOrThrow({
    where: {
      User_id: guestId,
    },
    select: {
      Name: true,
    },
  });
}

async function getDeadlineMatches(location: string) {
  const matches = await prisma.posting.findMany({
    where: {
      Location: { contains: location },
      PlayTime: {
        lte: new Date().getTime(),
      },
    },
    orderBy: {
      PlayTime: "desc",
    },
    take: 3,
    select: {
      Posting_id: true,
      Title: true,
      PlayTime: true,
      RecruitAmount: true,
      CurrentAmount: true,
      Image: {
        select: {
          ImageData: true,
        },
      },
    },
  });

  const formedMatches = await Promise.all(
    matches.map((match) => {
      return {
        ...match,
        Image: match.Image.length > 0 ? match.Image[0].ImageData : undefined,
      };
    }),
  );

  return formedMatches;
}

async function participateMatch(postingId: number, guestId: number) {
  const roomId = (
    await prisma.chatRoom.findFirstOrThrow({
      where: {
        AND: [{ Posting_id: postingId }, { User_id: guestId }],
      },
      select: {
        Room_id: true,
      },
    })
  ).Room_id;
  const hostId = (
    await prisma.chatRoom.findFirstOrThrow({
      where: {
        AND: [{ Room_id: roomId }, { NOT: { User_id: guestId } }],
      },
      select: {
        User_id: true,
      },
    })
  ).User_id;
  await prisma.matchAlarm.create({
    data: {
      Posting_id: postingId,
      User_id: hostId,
      Opponent_id: guestId,
    },
  });
  const posting = await prisma.posting.findFirstOrThrow({
    where: {
      Posting_id: postingId,
    },
    select: {
      User_id: true,
      Title: true,
    },
  });

  const hostToken = await getToken(String(posting.User_id));

  const userName = (
    await prisma.user.findFirstOrThrow({
      where: {
        User_id: guestId,
      },
      select: {
        Name: true,
      },
    })
  ).Name;

  expo.sendPushNotificationsAsync([
    {
      to: hostToken.token,
      title: posting.Title,
      body: `${userName}님의 참가 신청이 도착했습니다.`,
      data: {
        type: "matchParticipate",
      },
    },
  ]);
}

// TODO 채팅
export {
  AllMatch,
  AddMatch,
  MatchInfo,
  DeleteMatch,
  JoinMatch,
  getDeadlineMatches,
  participateMatch,
};
