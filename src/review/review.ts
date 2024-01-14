import { PrismaClient, Review } from "@prisma/client";
import { NotFoundError } from "./error";
import { CreateReviewType } from "../routes/reviewRouter";

const prisma = new PrismaClient();
export { getMatchPlayers, setUserReview };

async function getMatchPlayers(Posting_id: number, userId: number) {
  const players = await prisma.member.findMany({
    where: {
      Posting_id: Posting_id,
      NOT: { User_id: userId },
    },
  });
  if (!players) throw new NotFoundError("players");
  const playersProfiles = await getPlayerNameAndImage(players);

  return playersProfiles;
}

async function setUserReview(Reviews: CreateReviewType[], AccessToken: string) {
  const user = await prisma.oAuthToken.findFirstOrThrow({
    where: {
      AccessToken: AccessToken,
    },
  });
  Reviews.map(async (review) => {
    const temp = await prisma.review.create({
      data: {
        IsPositive: review.isPositive,
        Comment: review.Comment,
        Receiver_id: review.Receiver_id,
        ReviewRelay: {
          create: {
            User: { connect: { User_id: user.User_id } },
          },
        },
      },
    });

    await prisma.reviewRelay.create({
      data: {
        Review: { connect: { Review_id: temp.Review_id } },
        User: { connect: { User_id: review.Receiver_id } },
        IsReceiver: true,
      },
    });
    let score = 0;
    switch (review.isJoin) {
      case true:
        score += review.isPositive ? 5 : -3;
        score += review.isJoin ? 3 : -10;
        break;
      case false: {
        score = -10;
      }
    }

    await prisma.profile.update({
      where: {
        User_id: review.Receiver_id,
      },
      data: {
        Overall: {
          increment: score,
        },
      },
    });
  });
}

async function getPlayerNameAndImage(
  players: {
    id: number;
    Posting_id: number;
    User_id: number;
    IsHost: boolean;
  }[],
) {
  const profile = await Promise.all(
    players.map(async (player) => {
      const profile = await prisma.user.findFirstOrThrow({
        where: {
          User_id: player.User_id,
        },
        select: {
          Name: true,
          User_id: true,
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

      return {
        ...profile.Profile?.Image[0],
        Name: profile?.Name,
        User_id: profile?.User_id,
      };
    }),
  );
  return profile;
}
