import SocketIO, { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { PrismaClient } from "@prisma/client";
import { UserNotExistError } from "../auth/error";

import Expo from "expo-server-sdk";
import { checkGuestSignUp, signUpMatch } from "../alarm/alarm";
import { JoinMatch } from "../match/match";
import { getToken } from "../alarm/pushNotification";

const expo = new Expo();

//CHECKLIST
//[x]: 닉네임 설정
//[x]: 유저 아이디 설정
//[x]: 방 참가
//[x]: 방 생성
//[x]: 메시지 전송
//[x]: 연결 끊기
//[x]: 데이터베이스 연동
//[x]: 재접속 시 소켓 방 참가 로직 구현 및 테스트

type SocketIO = SocketIO.Server<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  any
>;

type enterRoomType = {
  Message_id: number;
  Posting_id: number;
  Msg: string;
  ChatTime: Date;
  User_id: number;
};

type chatRoomsType = {
  nickname: string;
  lastChatMessage: string | undefined;
  image: string | undefined;
  lastChatTime: string | undefined;
  postingId: number;
  postingTitle: string;
};

const prisma = new PrismaClient();

type joinRoomType = {
  socket: Socket;
  io: SocketIO.Server;
  roomId: number;
};

const chatServerHandler = (io: SocketIO.Server) => {
  io.on("connection", (socket) => {
    socket.on(
      "joinAllRooms",
      async (user_id: number, done: (chatRooms: chatRoomsType[]) => void) => {
        const chatRoomList = await findAllChatRoom(user_id);
        const chatRooms = await joinAllRooms(chatRoomList, socket, user_id);
        done(chatRooms);
      },
    );

    socket.on(
      "applyMatch",
      async (
        roomId: number,
        isApply: boolean,
        done: (isApply: boolean) => void,
      ) => {
        await JoinMatch(roomId, isApply);
        socket.to(roomId.toString()).emit("applyMatchComplete", isApply);
        done(isApply);
      },
    );

    socket.on(
      "signUp",
      async (postingId: number, roomId: number, done: () => void) => {
        await signUpMatch(postingId, roomId);
        socket.to(roomId.toString()).emit("signUpComplete");
        done();
      },
    );

    socket.on(
      "makeRoom",
      async (
        hostId: number, //12
        guestId: number, //13
        postingId: number, //6
        done: (roomId: number) => void,
      ) => {
        const chatRoom = await createRoom(hostId, guestId, postingId);
        const roomId =
          typeof chatRoom == "number" ? chatRoom : chatRoom.Room_id;
        await joinRoom({
          roomId: roomId,
          socket: socket,
          io: io,
        });
        done(roomId);
      },
    );

    socket.on(
      "enterRoom",
      async (
        roomId: number,
        userId: number,
        done: (result: {
          opponentImageName: string | undefined;
          chatList: enterRoomType[];
        }) => void,
      ) => {
        const chatList = await prisma.message.findMany({
          where: {
            Room_id: roomId,
          },
          select: {
            Message_id: true,
            Msg: true,
            ChatTime: true,
            User_id: true,
          },
        });
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
        const post = await prisma.chatRoom.findFirstOrThrow({
          where: {
            Room_id: roomId,
          },
        });
        const opponentId = (
          await prisma.chatRoom.findFirstOrThrow({
            where: {
              AND: [{ Room_id: roomId }, { NOT: { User_id: userId } }],
            },
            select: {
              User_id: true,
            },
          })
        ).User_id;
        let opponentImageName: string = "";
        const opponentImage = await prisma.profile.findFirstOrThrow({
          where: {
            User_id: opponentId,
          },
          select: {
            Image: true,
          },
        });
        if (opponentImage.Image.length != 0) {
          opponentImageName = opponentImage.Image[0].ImageData;
        }
        const chatListWithPostingId: enterRoomType[] = chatList.map((chat) => ({
          ...chat,
          Posting_id: post.Posting_id,
          roomId: roomId,
        }));
        const result = {
          hostId,
          opponentImageName: opponentImageName,
          chatList: chatListWithPostingId,
        };
        done(result);
      },
    );

    socket.on(
      "send",
      async (
        nickname: string,
        userId: number,
        payload: string,
        postingId: number,
        roomId: number,
      ) => {
        const currentTimestamp = getCurrentTimestamp();

        const post = await prisma.posting.findFirstOrThrow({
          where: {
            Posting_id: postingId,
          },
          select: {
            Title: true,
          },
        });

        const entireMessagesAmount = await prisma.message.findMany({
          where: {
            Room_id: roomId,
          },
        });

        // if (await checkUserOffline(io, +hostId)) {
        // } else if (await checkUserOffline(io, +guestId)) {
        // }
        const newMessage = await prisma.message.create({
          data: {
            Msg: payload,
            User_id: userId,
            Room_id: roomId,
          },
        });

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

        io.to(getRoomName(roomId)).emit("send", {
          Message_id: newMessage.Message_id,
          Posting_id: postingId,
          Msg: payload,
          ChatTime: currentTimestamp,
          User_id: userId,
          roomId: roomId,
          hostId: hostId,
        });

        io.to(getRoomName(roomId)).emit("updateChatRoom", {
          nickname: nickname,
          lastChatMessage: payload,
          lastChatTime: currentTimestamp,
          postingId: postingId,
          postingTitle: post.Title,
          entireMessagesAmount: entireMessagesAmount.length,
          roomId: roomId,
          hostId: hostId,
        });

        sendPushNotification(userId, roomId, nickname, post.Title, payload);
      },
    );
  });
};

export default chatServerHandler;

async function sendPushNotification(
  userId: number,
  roomId: number,
  nickname: string,
  postTitle: string,
  payload: string,
) {
  const opponent = await prisma.chatRoom.findFirstOrThrow({
    where: {
      AND: [{ Room_id: roomId }, { NOT: { User_id: userId } }],
    },
  });
  const opponentToken = await getToken(String(opponent.User_id));

  expo.sendPushNotificationsAsync([
    {
      to: opponentToken.token,
      title: postTitle,
      body: `${nickname}: ${payload}`,
      data: {
        type: "chat",
        roomId: roomId,
      },
    },
  ]);
}

function getCurrentTimestamp() {
  return Date.now();
}

async function joinAllRooms(
  chatRoomList: { Room_id: number; Posting_id: number }[],
  socket: SocketIO.Socket<
    DefaultEventsMap,
    DefaultEventsMap,
    DefaultEventsMap,
    any
  >,
  user_id: number,
) {
  return await Promise.all(
    chatRoomList.map(async (room) => {
      socket.join(getRoomName(room.Room_id));
      const hostId = (
        await prisma.chatRoom.findFirstOrThrow({
          where: {
            AND: [{ Room_id: room.Room_id }, { IsHost: true }],
          },
          select: {
            User_id: true,
          },
        })
      ).User_id;
      const opponentName = await findOpponentInfo(room, user_id);
      const opponentProfile = await prisma.profile.findFirstOrThrow({
        where: {
          User_id: opponentName.User_id,
        },
        select: {
          Profile_id: true,
        },
      });
      const lastChat = await getLastChat(room.Room_id);
      let imageName = await findUserImageName(opponentProfile.Profile_id);
      const postingName = await findPostingName(room.Posting_id);

      return {
        nickname: opponentName.Name,
        lastChatMessage: lastChat?.Msg,
        image: imageName,
        lastChatTime: lastChat?.ChatTime.toISOString(),
        postingId: room.Posting_id,
        postingTitle: postingName.Title,
        roomId: room.Room_id,
        hostId: hostId,
      };
    }),
  );
}

async function findPostingName(postingId: number) {
  const postingName = await prisma.posting.findFirst({
    where: {
      Posting_id: postingId,
    },
    select: {
      Title: true,
    },
  });

  if (!postingName) throw new Error("Posting Not Found");
  return postingName;
}

async function findUserImageName(profileId: number) {
  const profileImage = await prisma.image.findFirst({
    where: {
      Profile_id: profileId,
    },
    select: {
      ImageData: true,
    },
  });
  return profileImage?.ImageData;
}

async function findOpponentInfo(
  room: { Room_id: number; Posting_id: number },
  user_id: number,
) {
  const opponent = await prisma.chatRoom.findFirst({
    where: {
      AND: [{ Room_id: room.Room_id }, { User_id: { not: user_id } }],
    },
    select: {
      User_id: true,
    },
  });
  if (!opponent) throw new UserNotExistError();

  const opponentName = await prisma.user.findFirst({
    where: {
      User_id: opponent.User_id,
    },
  });
  if (!opponentName) throw new UserNotExistError();
  return opponentName;
}

async function findAllChatRoom(user_id: number) {
  return await prisma.chatRoom.findMany({
    where: {
      User_id: user_id,
    },
    select: {
      Posting_id: true,
      Room_id: true,
      IsHost: true,
    },
  });
}

/**
 * 방 생성 함수
 * @param hostId
 * @param guestId
 * @param postingId
 */
async function createRoom(hostId: number, guestId: number, postingId: number) {
  //12 13 6
  const isChatRoomExist = await prisma.chatRoom.findFirst({
    where: {
      AND: [{ Posting_id: postingId }, { User_id: guestId }],
    },
  });
  if (!isChatRoomExist) {
    const chatRoom = await prisma.chatRoomList.create({
      data: {
        ChatRoom: {
          createMany: {
            data: [
              {
                User_id: hostId,
                IsHost: true,
                Posting_id: postingId,
              },
              {
                User_id: guestId,
                Posting_id: postingId,
              },
            ],
          },
        },
      },
    });
    return chatRoom;
  } else return isChatRoomExist.Room_id;
}

/**
 * 방에 참가하는 함수
 * @param socket
 * @param hostId
 * @param guestId
 * @param io
 */
async function joinRoom({ socket, io, roomId }: joinRoomType) {
  const hostId = await prisma.chatRoom.findFirstOrThrow({
    where: {
      AND: [{ Room_id: roomId }, { IsHost: true }],
    },
    select: {
      User_id: true,
    },
  });

  socket.join(getRoomName(roomId)); //게스트 방 참여 완료
  io.sockets.sockets.forEach((socket) => {
    const user = socket;
    user.emit("getUserId", (id: number) => {
      if (id == hostId.User_id) {
        const host = user;
        host.join(getRoomName(roomId));
      }
    });
  });
}

function getRoomName(roomId: number): string {
  return `${roomId}`;
}

async function getLastChat(room_id: number) {
  return await prisma.message.findFirst({
    where: {
      Room_id: room_id,
    },
    orderBy: {
      ChatTime: "desc",
    },
    select: {
      Msg: true,
      ChatTime: true,
    },
  });
}
