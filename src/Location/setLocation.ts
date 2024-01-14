import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function SetProfileLocation(
  AccessToken: string,
  Location1: { location: string; city: string },
  Location2?: { location: string; city: string },
) {
  const user = await prisma.oAuthToken.findFirstOrThrow({
    where: {
      AccessToken: AccessToken,
    },
  });
  await setLocation(Location1, user.User_id, 1);
  if (Location2) await setLocation(Location2, user.User_id, 2);
}

async function setLocation(
  location: { location: string; city: string },
  userId: number,
  locationNum: number,
) {
  await prisma.profile.update({
    where: {
      User_id: userId,
    },
    data: {
      ...(locationNum === 1
        ? { Location1: location.location, City1: location.city }
        : { Location2: location.location, City2: location.city }),
    },
  });
}

async function SetTeamLocation(
  TeamId: number,
  Location1: { location: string; city: string },
  Location2?: { location: string; city: string },
) {
  await prisma.teamProfile.update({
    where: {
      Team_id: TeamId,
    },
    data: {
      Location1: Location1.location + " " + Location1.city,
      ...(Location2
        ? { Location2: Location2.location + " " + Location2.city }
        : {}),
    },
  });
}

export { SetProfileLocation, SetTeamLocation };
