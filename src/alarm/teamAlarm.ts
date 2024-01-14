import { PrismaClient } from "@prisma/client";
import Expo from "expo-server-sdk";

const prisma = new PrismaClient();

async function getAllAlarms(userId: number) {}

// 팀 이름, 상대방 이름, 신청 시간
async function getGuestJoinAlarms(userId: number) {
  const team = await prisma.teamProfile.findFirst({
    where: {
      Admin_id: userId,
    },
  });
  if (!team) throw new Error();

  const joinAlarms = await prisma.teamJoinApply.findMany({
    where: {
      AND: [{ Team_id: team.Team_id }, { IsApply: null }],
    },
    select: {
      joinTime: true,
      User: {
        select: {
          Name: true,
        },
      },
    },
  });
  if (!joinAlarms) return [];
  const modifiedAlarms = await Promise.all(
    joinAlarms.map((alarm) => {
      return { ...alarm.User, joimTime: alarm.joinTime };
    }),
  );

  return modifiedAlarms;
}

// async function getTeamApplyAlarms(userId: number) {
//   const alarms = await prisma.teamJoinApply.findMany({
//     where: {
//       AND: [{ User_id: userId }, { NOT: { IsApply: null } }],
//     },
//     select: {
//       Team: {
//         select: {
//           Name: true,
//         },
//       },
//       IsApply: true,
//     },
//   });
//   if (!alarms.length) return [];
//   const relay = await prisma.teamRelay.findFirst({
//     where: {
//       User_id: userId,
//     },
//     select: {
//       joinTime: true,
//     },
//   });
//   const modifiedAlarms = await Promise.all(
//     alarms.map((alarm) => {
//       return {
//         ...relay?.joinTime,
//         Name: alarm.Team.Name,
//         IsApply: alarm.IsApply,
//       };
//     }),
//   );
//   return modifiedAlarms;
// }
async function checkAdminApply(userId: number) {
  const alarms = await prisma.teamJoinApply.findMany({
    where: {
      User_id: userId,
      NOT: { IsApply: null },
    },
  });
  const team = await Promise.all(
    alarms.map(async (alarm) => {
      const teamName = (
        await prisma.teamProfile.findFirst({
          where: {
            Team_id: alarm.Team_id,
          },
          select: {
            Name: true,
          },
        })
      )?.Name;

      return {
        teamId: alarm.Team_id,
        teamName: teamName,
        isApply: alarm.IsApply,
      };
    }),
  );

  return team;
}

async function getParticipateTeamMatchAlarms(adminId: number) {
  const teamId = await prisma.teamProfile.findFirst({
    where: {
      Admin_id: adminId,
    },
    select: {
      Team_id: true,
    },
  });
  if (!teamId) throw new Error("User Not Admin");
  const teamMatchApply = await prisma.posting.findMany({
    where: {
      User_id: teamId?.Team_id,
      IsTeam: true,
      TeamMatchApply: {
        IsApply: null,
      },
    },
    select: {
      TeamMatchApply: {
        select: {
          ApplyDate: true,
          TeamRecord: {
            select: {
              Team_id: true,
            },
          },
        },
      },
    },
  });
  let guestId;
  if (
    teamMatchApply[0].TeamMatchApply?.TeamRecord[0].Team_id === teamId?.Team_id
  )
    guestId = teamMatchApply[0].TeamMatchApply?.TeamRecord[1].Team_id;
  else guestId = teamMatchApply[0].TeamMatchApply?.TeamRecord[0].Team_id;

  const guestTeamName = (
    await prisma.teamProfile.findFirst({
      where: {
        Team_id: guestId,
      },
      select: {
        Name: true,
      },
    })
  )?.Name;
  const data = {
    applyDate: teamMatchApply[0].TeamMatchApply?.ApplyDate,
    guestTeam: guestTeamName,
  };
  return data;
}

async function getTeamMatchApplyAlarm(userId: number, teamId: number) {
  const myTeam = await prisma.teamProfile.findFirst({
    where: {
      Team_id: teamId,
    },
  });
  if (myTeam?.Admin_id !== userId) throw new Error("Not Team Admin");

  const ourRecords = await prisma.teamRecord.findMany({
    where: {
      Team_id: teamId,
    },
  });

  if (!ourRecords) throw new Error("Record Not Exists");

  const matchs = await Promise.all(
    ourRecords.map(async (record) => {
      const match = await prisma.teamMatchApply.findFirst({
        where: {
          TeamMatch_id: record.Match_id,
        },
      });
      const res = await prisma.teamRecord.findFirstOrThrow({
        where: {
          Match_id: match?.TeamMatch_id,
          NOT: { Team_id: myTeam.Team_id },
        },
        select: {
          Team: {
            select: {
              Team_id: true,
              Name: true,
            },
          },
        },
      });
      return {
        match,
        opponentTeamId: res.Team.Team_id,
        opponentTeamName: res.Team.Name,
      };
    }),
  );
  return matchs;
  // 상대 팀, 상대 팀 이름, 수락/거절, 수락 시간,
}

export {
  getGuestJoinAlarms,
  checkAdminApply,
  getParticipateTeamMatchAlarms,
  getTeamMatchApplyAlarm,
};
