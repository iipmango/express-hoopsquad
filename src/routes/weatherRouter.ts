import express, { Request } from "express";
import { getFineDust, getWeather } from "../weather/weather";
import { handleErrors } from "../ErrorHandler";
import { AddressToLatLng } from "../google-maps/googleMaps";

const math = require("mathjs");
const weatherRouter = express.Router();

const mapData = {
  Re: 6371.00877, // 지도반경
  grid: 5.0, // 격자간격 (km)
  slat1: 30.0, // 표준위도 1
  slat2: 60.0, // 표준위도 2
  olon: 126.0, // 기준점 경도
  olat: 38.0, // 기준점 위도
  xo: 210 / 5.0, // 기준점 X좌표
  yo: 675 / 5.0, // 기준점 Y좌표
};
const PI = Math.asin(1.0) * 2.0;
const DEGRAD = PI / 180.0;
const RADDEG = 180.0 / PI;

const re = mapData.Re / mapData.grid;
const slat1 = mapData.slat1 * DEGRAD;
const slat2 = mapData.slat2 * DEGRAD;
const olon = mapData.olon * DEGRAD;
const olat = mapData.olat * DEGRAD;

function LonLatToXY(lat: number, lon: number) {
  let sn: number, sf: number, ro: number, theta: number;

  sn = Math.tan(PI * 0.25 + slat2 * 0.5) / Math.tan(PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  sf = Math.tan(PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  ro = Math.tan(PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / math.pow(ra, sn);
  theta = lon * DEGRAD - olon;
  if (theta > PI) theta -= 2.0 * PI;
  if (theta < -PI) theta += 2.0 * PI;
  theta *= sn;
  const x = ra * Math.sin(theta) + mapData.xo;
  const y = ro!! - ra * Math.cos(theta) + mapData.yo;
  return { X: x, Y: y };
}

weatherRouter.get(
  "/",
  async (req: Request<{}, {}, {}, { location: string; city: string }>, res) => {
    try {
      const { lat, lng } = await AddressToLatLng(
        req.query.location + req.query.city,
      );
      const { X, Y } = LonLatToXY(lat, lng);
      const result = await getWeather(X, Y);
      res.send(result);
    } catch (err) {
      if (err instanceof Error) {
        handleErrors(err, res);
      }
    }
  },
);
weatherRouter.get(
  "/dust",
  async (req: Request<{}, {}, {}, { Location: string; City: string }>, res) => {
    try {
      const result = await getFineDust(req.query.Location, req.query.City);
      res.send(result);
    } catch (err) {
      if (err instanceof Error) {
        handleErrors(err, res);
      }
    }
  },
);

export default weatherRouter;
