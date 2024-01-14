import { PrismaClient } from "@prisma/client";
import Expo from "expo-server-sdk";
import { getToken } from "./pushNotification";
const prisma = new PrismaClient();
const expo = new Expo();

/**
 * 특정 사용자의 모든 매치 알림을 반환하는 함수
 * @param hostId
 * @returns
 */
async function getHostPostingAlarm(hostId: number) {
  const alarms = await prisma.matchAlarm.findMany({
    where: {
      User_id: hostId,
    },
  });

  const alarmList: {
    image: string | undefined;
    nickname: string;
    hostId: number;
    guestId: number;
    postingId: number;
    postingTitle: string;
    roomId: number | undefined;
    isApply: boolean | null;
    createdAt: Date;
    type: string;
  }[] = [];

  for (const alarm of alarms) {
    const guestProfile = await prisma.profile.findFirstOrThrow({
      where: {
        User_id: alarm.Opponent_id,
      },
      select: {
        Profile_id: true,
        User: true,
      },
    });
    const posting = await prisma.posting.findFirstOrThrow({
      where: {
        Posting_id: alarm.Posting_id,
      },
      select: {
        Title: true,
      },
    });

    const roomId = (
      await prisma.chatRoom.findFirst({
        where: {
          AND: [
            { User_id: guestProfile.User.User_id },
            { Posting_id: alarm.Posting_id },
          ],
        },
        select: {
          Room_id: true,
        },
      })
    )?.Room_id;

    const postingName = posting.Title;

    const userImage = await prisma.image.findFirst({
      where: {
        Profile_id: guestProfile.Profile_id,
      },
      select: {
        ImageData: true,
      },
    });

    alarmList.push({
      image: userImage?.ImageData,
      nickname: guestProfile.User.Name,
      hostId: hostId,
      guestId: alarm.Opponent_id,
      postingId: alarm.Posting_id,
      postingTitle: postingName,
      roomId: roomId,
      isApply: alarm.IsApply,
      createdAt: alarm.createdAt,
      type: "host",
    });
  }
  return alarmList;
}

async function getGuestPostingAlarm(guestId: number) {
  const alarms = await prisma.matchAlarm.findMany({
    where: {
      AND: [{ Opponent_id: guestId }, { NOT: { IsApply: null } }],
    },
  });

  const alarmList: {
    image: string | undefined;
    nickname: string;
    hostId: number;
    guestId: number;
    postingId: number;
    postingTitle: string;
    roomId: number | undefined;
    isApply: boolean | null;
    createdAt: Date;
    type: string;
  }[] = [];

  for (const alarm of alarms) {
    const hostProfile = await prisma.profile.findFirstOrThrow({
      where: {
        User_id: alarm.User_id,
      },
      select: {
        Profile_id: true,
        User: true,
      },
    });
    const posting = await prisma.posting.findFirstOrThrow({
      where: {
        Posting_id: alarm.Posting_id,
      },
      select: {
        Title: true,
      },
    });

    const roomId = (
      await prisma.chatRoom.findFirst({
        where: {
          AND: [{ User_id: guestId }, { Posting_id: alarm.Posting_id }],
        },
        select: {
          Room_id: true,
        },
      })
    )?.Room_id;

    const postingName = posting.Title;

    const userImage = await prisma.image.findFirst({
      where: {
        Profile_id: hostProfile.Profile_id,
      },
      select: {
        ImageData: true,
      },
    });

    alarmList.push({
      image: userImage?.ImageData,
      nickname: hostProfile.User.Name,
      hostId: alarm.Opponent_id,
      guestId: guestId,
      postingId: alarm.Posting_id,
      postingTitle: postingName,
      roomId: roomId,
      isApply: alarm.IsApply,
      createdAt: alarm.createdAt,
      type: "guest",
    });
  }
  return alarmList;
}

async function checkGuestSignUp(roomId: number) {
  const postingId = (
    await prisma.chatRoom.findFirstOrThrow({
      where: {
        Room_id: roomId,
      },
      select: {
        Posting_id: true,
      },
    })
  ).Posting_id;
  const hostId = (
    await prisma.chatRoom.findFirstOrThrow({
      where: {
        AND: [{ Room_id: roomId }, { IsHost: true }],
      },
      select: {
        User_id: true,
      },
    })
  ).User_id;
  const guestId = (
    await prisma.chatRoom.findFirstOrThrow({
      where: {
        AND: [{ Room_id: roomId }, { IsHost: false }],
      },
      select: {
        User_id: true,
      },
    })
  ).User_id;

  const isSignUp = await prisma.matchAlarm.findFirst({
    where: {
      AND: [
        { Posting_id: postingId },
        { User_id: hostId },
        { Opponent_id: guestId },
      ],
    },
    select: {
      id: true,
    },
  });

  if (isSignUp) return true;
  else return false;
}

async function signUpMatch(postingId: number, roomId: number) {
  const hostId = (
    await prisma.chatRoom.findFirstOrThrow({
      where: {
        AND: [{ Room_id: roomId }, { IsHost: true }],
      },
      select: {
        User_id: true,
      },
    })
  ).User_id;
  const guestId = (
    await prisma.chatRoom.findFirstOrThrow({
      where: {
        AND: [{ Room_id: roomId }, { IsHost: false }],
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
  const postTitle = (
    await prisma.posting.findFirstOrThrow({
      where: {
        Posting_id: postingId,
      },
      select: {
        Title: true,
      },
    })
  ).Title;
  const guestName = (
    await prisma.user.findFirstOrThrow({
      where: { User_id: guestId },
      select: { Name: true },
    })
  ).Name;
  const hostToken = await getToken(String(hostId));
  expo.sendPushNotificationsAsync([
    {
      to: hostToken.token,
      title: postTitle,
      body: `${guestName}님에게 매칭 참여 요청이 왔습니다.`,
      data: {
        type: "matchParticipate",
      },
    },
  ]);
}

async function checkHostApplyMatch(roomId: number) {
  const postingId = (
    await prisma.chatRoom.findFirstOrThrow({
      where: {
        Room_id: roomId,
      },
      select: {
        Posting_id: true,
      },
    })
  ).Posting_id;
  const hostId = (
    await prisma.chatRoom.findFirstOrThrow({
      where: {
        AND: [{ Room_id: roomId }, { IsHost: true }],
      },
      select: {
        User_id: true,
      },
    })
  ).User_id;
  const guestId = (
    await prisma.chatRoom.findFirstOrThrow({
      where: {
        AND: [{ Room_id: roomId }, { IsHost: false }],
      },
      select: {
        User_id: true,
      },
    })
  ).User_id;
  const isNotificationExist = await prisma.matchAlarm.findFirst({
    where: {
      AND: [
        { Posting_id: postingId },
        { User_id: hostId },
        { Opponent_id: guestId },
      ],
    },
    select: {
      IsApply: true,
    },
  });
  if (!isNotificationExist) return 0;
  if (isNotificationExist.IsApply == null) return 1;
  if (isNotificationExist.IsApply) return 2;
  if (!isNotificationExist.IsApply) return 3;
}

export {
  getHostPostingAlarm,
  getGuestPostingAlarm,
  signUpMatch,
  checkGuestSignUp,
  checkHostApplyMatch,
};
