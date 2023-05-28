import * as cheerio from "cheerio";

const extractCookie = (response, cookieName) => {
  return response.headers["set-cookie"].filter(
    (cookie) => cookie.split("=")[0] === cookieName
  )[0];
};

export const formPayload = (payload) => {
  return Object.entries(payload)
    .map(([key, value]) =>
      ![undefined, null].includes(value) ? `${key}=${value}` : ""
    )
    .join("&");
};

export const setupCsrf = async (client) => {
  const loginResponse = await client.get("/user/login");
  const loginPage = cheerio.load(loginResponse.text);
  const _csrf = loginPage('input[name="_csrf"]').val();
  const csrfCookie = extractCookie(loginResponse, "csrfToken");
  return [_csrf, csrfCookie];
};

export const extractLoginCookie = (response) => {
  return extractCookie(response, "connect.sid");
};
