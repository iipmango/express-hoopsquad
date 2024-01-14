import jwt from "jsonwebtoken";

function getCurrentTime() {
  return Math.floor(Date.now() / 1000);
}

function GenerateToken(UserData: any) {
  const data = JSON.parse(UserData);

  const Access_Token = jwt.sign(data, `${process.env.SECRETKey}`, {
    expiresIn: "2h",
    algorithm: "HS256",
  });

  const Refresh_Token = jwt.sign(data, `${process.env.SECRETKey}`, {
    expiresIn: "14d",
    algorithm: "HS256",
  });

  const res = {
    Access_Token: Access_Token,
    AToken_Expires: 7199, // 2일
    AToken_CreatedAt: getCurrentTime().toString(),
    Refresh_Token: Refresh_Token,
    RToken_Expires: 1209599, // 14일
    RToken_CreatedAt: getCurrentTime().toString(),
  };

  return res;
}

function AccessVerify(token: string) {
  try {
    jwt.verify(token, `${process.env.SECRETKey}`);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

function AccessRefresh(UserData: String) {
  const data = { data: UserData };

  const Access_Token = jwt.sign(data, `${process.env.SECRET_Key}`, {
    expiresIn: "2h",
    algorithm: "HS256",
  });
  const res = {
    Access_Token: Access_Token,
    AToken_Expires: 7199,
    AToken_CreatedAt: getCurrentTime().toString(),
  };
  return res;
}

export { GenerateToken, AccessVerify, AccessRefresh };
