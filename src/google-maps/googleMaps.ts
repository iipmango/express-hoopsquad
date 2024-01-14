import axios from "axios";

/**
 * 주소를 위경도로 바꿔주는 함수
 * @param {string} address 주소
 * @returns 위도와 경도
 */
async function AddressToLatLng(
  address: string,
): Promise<{ lat: number; lng: number }> {
  const fetchedData = await axios.get(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${process.env.gMap}&language=ko`,
  );

  return fetchedData.data.results[0].geometry.location;
}

/**
 * 위경도를 주소로 바꿔주는 함수
 * @param {number} lat 위도
 * @param {number} lng 경도
 * @returns 주소
 */
async function LatLngToAddress(lat: number, lng: number) {
  const fetchedData = await axios.get(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.gMap}&language=ko`,
  );

  let formattedAddress = fetchedData.data.results.map(
    (result: { formatted_address: any }) => result.formatted_address,
  ) as string[];

  formattedAddress = formattedAddress.filter((address) => {
    return !address.includes("+");
  });

  let longestAddress: string = "";
  formattedAddress.every((address) => {
    if (address.length > longestAddress.length) longestAddress = address;
  });

  return { result: longestAddress };
}

export { AddressToLatLng, LatLngToAddress };
