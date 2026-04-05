import { chromium } from "playwright";
import https from "https";

const MAP_URL = "https://ghanapostgps.com/map/";
const ADDRESS_LOOKUP_URL = "https://mijoride.ghanapostgps.com/user/get_address";
const GEOLOCATION = {
  latitude: 5.59897236,
  longitude: -0.17148545,
  accuracy: 100,
};
const TOKEN_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours

let cachedToken = null;
let tokenTimestamp = null;

async function createBrowserContext() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: GEOLOCATION,
    permissions: ["geolocation"],
    locale: "en-US",
    viewport: { width: 1280, height: 800 },
  });
  await context.grantPermissions(["geolocation"], { origin: "https://ghanapostgps.com" });
  return { browser, context };
}

function buildRequestPayload(request) {
  return {
    url: request.url(),
    method: request.method(),
    headers: request.headers(),
    postData: request.postData(),
    resourceType: request.resourceType(),
    timestamp: Date.now(),
  };
}

export async function captureSiteRequests() {
  const { browser, context } = await createBrowserContext();
  const page = await context.newPage();

  const capturedRequests = [];
  page.on("request", (request) => capturedRequests.push(buildRequestPayload(request)));

  await page.goto(MAP_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(8000);

  const relevantRequests = capturedRequests.filter((req) =>
    req.url.startsWith(ADDRESS_LOOKUP_URL) || req.url.includes("mijoride.ghanapostgps.com/user/get_address")
  );

  await browser.close();

  return {
    dummyLocation: GEOLOCATION,
    capturedRequests,
    relevantRequests,
  };
}

export function getToken() {
  const isExpired = !tokenTimestamp || Date.now() - tokenTimestamp > TOKEN_EXPIRY_MS;
  if (isExpired || !cachedToken) {
    return null;
  }
  return cachedToken;
}

function extractToken(requests) {
  const addressRequests = requests.filter((req) =>
    req.url.includes("mijoride.ghanapostgps.com/user/get_address")
  );
  if (addressRequests.length > 0) {
    const authHeader = addressRequests[0].headers?.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.replace("Bearer ", "");
    }
  }
  return null;
}

export async function refreshToken() {
  const result = await captureSiteRequests();
  const token = extractToken(result.capturedRequests);
  if (token) {
    cachedToken = token;
    tokenTimestamp = Date.now();
  }
  return token;
}

export async function getAddress(address, latitude = GEOLOCATION.latitude, longitude = GEOLOCATION.longitude) {
  let token = getToken();
  if (!token) {
    token = await refreshToken();
  }
  if (!token) {
    throw new Error("Unable to obtain bearer token");
  }

  return new Promise((resolve, reject) => {
    const url = new URL(ADDRESS_LOOKUP_URL);
    url.searchParams.append("address", address);
    url.searchParams.append("user_latitude", latitude);
    url.searchParams.append("user_longitude", longitude);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "GET",
      headers: {
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Authorization": `Bearer ${token}`,
        "Connection": "keep-alive",
        "Content-Type": "application/json",
        "Origin": "https://ghanapostgps.com",
        "Referer": "https://ghanapostgps.com/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
        "sec-ch-ua": "\"Chromium\";v=\"146\", \"Not-A.Brand\";v=\"24\", \"Google Chrome\";v=\"146\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
      },
    };

    https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("Failed to parse response"));
        }
      });
    }).on("error", reject).end();
  });
}

export async function searchAddress(query) {
  const { browser, context } = await createBrowserContext();
  const page = await context.newPage();

  const capturedRequests = [];
  page.on("request", (request) => capturedRequests.push(buildRequestPayload(request)));

  await page.goto(MAP_URL, { waitUntil: "networkidle" });
  const input = await page.waitForSelector('input[placeholder="Search for Addresses, Places, Cordinates"]', { timeout: 20000 });
  if (!input) {
    await browser.close();
    throw new Error("Search input not found");
  }

  await input.click({ force: true });
  await input.fill("");
  await input.type(query, { delay: 100 });
  await page.keyboard.press("Enter");

  await page.waitForTimeout(8000);

  const relevantRequests = capturedRequests.filter((req) =>
    req.url.startsWith(ADDRESS_LOOKUP_URL) || req.url.includes("mijoride.ghanapostgps.com/user/get_address")
  );

  const token = extractToken(capturedRequests);
  if (token) {
    cachedToken = token;
    tokenTimestamp = Date.now();
  }

  await browser.close();

  return {
    query,
    dummyLocation: GEOLOCATION,
    capturedRequests,
    relevantRequests,
    tokenCached: !!token,
  };
}
