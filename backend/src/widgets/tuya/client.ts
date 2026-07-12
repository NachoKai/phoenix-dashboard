import { createHmac, createHash, randomUUID } from "crypto";

interface TuyaConfig {
  accessId: string;
  accessSecret: string;
  endpoint: string;
}

interface TokenData {
  token: string;
  uid: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenData>();

// Cache user login failures to avoid spamming logs on every refresh
const userLoginFailedAt = new Map<string, number>();
const USER_LOGIN_FAIL_TTL = 5 * 60 * 1000; // 5 minutes

const EMPTY_BODY_HASH =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function getConfig(): TuyaConfig {
  const accessId = process.env.TUYA_ACCESS_ID ?? "";
  const accessSecret = process.env.TUYA_ACCESS_SECRET ?? "";
  const endpoint = process.env.TUYA_ENDPOINT ?? "https://openapi.tuyaus.com";

  if (!accessId || !accessSecret) {
    throw new Error(
      "Tuya credentials not configured. Set TUYA_ACCESS_ID and TUYA_ACCESS_SECRET in .env",
    );
  }

  return { accessId, accessSecret, endpoint };
}

function buildStringToSign(
  method: string,
  contentHash: string,
  headers: string,
  url: string,
): string {
  return `${method}\n${contentHash}\n${headers}\n${url}`;
}

function buildCanonicalUrl(path: string, queryParams?: Record<string, string>): string {
  if (!queryParams || Object.keys(queryParams).length === 0) {
    return path;
  }

  const sortedKeys = Object.keys(queryParams).sort();
  const qs = sortedKeys.map(k => `${k}=${queryParams[k]}`).join("&");

  return `${path}?${qs}`;
}

function hmacSign(str: string, secret: string): string {
  return createHmac("sha256", secret).update(str).digest("hex").toUpperCase();
}

function signTokenRequest(
  config: TuyaConfig,
  t: string,
  nonce: string,
  stringToSign: string,
): string {
  const str = config.accessId + t + nonce + stringToSign;
  return hmacSign(str, config.accessSecret);
}

function signApiRequest(
  config: TuyaConfig,
  token: string,
  t: string,
  nonce: string,
  stringToSign: string,
): string {
  const str = config.accessId + token + t + nonce + stringToSign;
  return hmacSign(str, config.accessSecret);
}

async function getUserToken(config: TuyaConfig): Promise<TokenData> {
  const cacheKey = `user:${config.accessId}:${config.endpoint}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached;
  }

  // Skip if we recently failed (avoid log spam on every widget refresh)
  const failedAt = userLoginFailedAt.get(cacheKey);
  if (failedAt && Date.now() - failedAt < USER_LOGIN_FAIL_TTL) {
    throw new Error("Tuya user login previously failed, using cached failure");
  }

  const username = process.env.TUYA_USER_EMAIL ?? "";
  const password = process.env.TUYA_USER_PASSWORD ?? "";
  const countryCode = process.env.TUYA_COUNTRY_CODE ?? "54";
  const schema = process.env.TUYA_APP_SCHEMA ?? "tuyaSmart";

  if (!username || !password) {
    throw new Error(
      "Tuya user credentials not configured. Set TUYA_USER_EMAIL and TUYA_USER_PASSWORD in .env",
    );
  }

  const t1 = String(Date.now());
  const nonce1 = randomUUID();
  const authBody = JSON.stringify({
    username,
    password,
    country_code: countryCode,
    schema,
  });
  const authContentHash = createHash("sha256").update(authBody).digest("hex");
  const authUrl = "/v1.0/iot-01/associated-users/actions/authorized-login";
  const authStringToSign = buildStringToSign("POST", authContentHash, "", authUrl);
  const authSign = signApiRequest(config, "", t1, nonce1, authStringToSign);

  console.log("[Tuya] Attempting user login for:", username);
  const authRes = await fetch(`${config.endpoint}${authUrl}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      client_id: config.accessId,
      sign: authSign,
      t: t1,
      sign_method: "HMAC-SHA256",
      nonce: nonce1,
    },
    body: authBody,
  });

  const authRaw = await authRes.json();
  const authData = authRaw as {
    success: boolean;
    result: { access_token: string; expire_time: number; uid: string };
    msg?: string;
    code?: number;
  };

  if (!authData.success || !authData.result) {
    userLoginFailedAt.set(cacheKey, Date.now());
    throw new Error(
      `Tuya user login error (code=${authData.code}): ${authData.msg ?? "unknown"}`,
    );
  }

  // Clear failure cache on success
  userLoginFailedAt.delete(cacheKey);

  const result: TokenData = {
    token: authData.result.access_token,
    uid: authData.result.uid,
    expiresAt: Date.now() + (authData.result.expire_time - 60) * 1000,
  };
  tokenCache.set(cacheKey, result);
  console.log("[Tuya] User login successful for uid:", result.uid);

  return result;
}

async function getToken(config: TuyaConfig): Promise<TokenData> {
  const user = process.env.TUYA_USER_EMAIL;
  const pass = process.env.TUYA_USER_PASSWORD;

  if (user && pass) {
    try {
      return await getUserToken(config);
    } catch {
      // Silent fallback — getUserToken already caches failures
    }
  }

  return getProjectToken(config);
}

async function getProjectToken(config: TuyaConfig): Promise<TokenData> {
  const cacheKey = `project:${config.accessId}:${config.endpoint}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached;
  }

  const t = String(Date.now());
  const nonce = randomUUID();
  const url = "/v1.0/token?grant_type=1";
  const stringToSign = buildStringToSign("GET", EMPTY_BODY_HASH, "", url);
  const signature = signTokenRequest(config, t, nonce, stringToSign);

  const res = await fetch(`${config.endpoint}${url}`, {
    headers: {
      client_id: config.accessId,
      sign: signature,
      t,
      sign_method: "HMAC-SHA256",
      nonce,
    },
  });

  const data = (await res.json()) as {
    success: boolean;
    result: { access_token: string; expire_time: number; uid: string };
    msg?: string;
  };

  if (!data.success || !data.result) {
    throw new Error(`Tuya token error: ${data.msg ?? "unknown"}`);
  }

  const tokenData: TokenData = {
    token: data.result.access_token,
    uid: data.result.uid,
    expiresAt: Date.now() + (data.result.expire_time - 60) * 1000,
  };
  tokenCache.set(cacheKey, tokenData);

  return tokenData;
}

export async function tuyaGet<T = unknown>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const config = getConfig();
  const { token } = await getToken(config);

  const canonicalUrl = buildCanonicalUrl(path, params);
  const fullUrl = new URL(canonicalUrl, config.endpoint);

  const t = String(Date.now());
  const nonce = randomUUID();

  const contentHash = EMPTY_BODY_HASH;
  const hdrs = "";

  const stringToSign = buildStringToSign("GET", contentHash, hdrs, canonicalUrl);
  const signature = signApiRequest(config, token, t, nonce, stringToSign);

  const res = await fetch(fullUrl.toString(), {
    headers: {
      client_id: config.accessId,
      access_token: token,
      sign: signature,
      t,
      sign_method: "HMAC-SHA256",
      nonce,
    },
  });

  const data = (await res.json()) as {
    success: boolean;
    result: T;
    msg?: string;
  };

  if (!data.success) {
    throw new Error(`Tuya API error: ${data.msg ?? "unknown"}`);
  }

  return data.result;
}

export async function tuyaPost<T = unknown>(
  path: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const config = getConfig();
  const { token } = await getToken(config);

  const bodyStr = JSON.stringify(body);
  const t = String(Date.now());
  const nonce = randomUUID();

  const contentHash = createHash("sha256").update(bodyStr).digest("hex");
  const hdrs = "";

  const stringToSign = buildStringToSign("POST", contentHash, hdrs, path);
  const signature = signApiRequest(config, token, t, nonce, stringToSign);

  const res = await fetch(`${config.endpoint}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      client_id: config.accessId,
      access_token: token,
      sign: signature,
      t,
      sign_method: "HMAC-SHA256",
      nonce,
    },
    body: bodyStr,
  });

  const data = (await res.json()) as {
    success: boolean;
    result: T;
    msg?: string;
  };

  if (!data.success) {
    throw new Error(`Tuya API error: ${data.msg ?? "unknown"}`);
  }

  return data.result;
}

export interface TuyaDevice {
  id: string;
  name: string;
  category: string;
  product_name: string;
  online: boolean;
  uid: string;
  status: { code: string; value: unknown }[];
}

interface UserDeviceListResult {
  list: TuyaDevice[];
  has_more: boolean;
  total: number;
  last_id: string;
}

export async function getAllDevices(): Promise<TuyaDevice[]> {
  const config = getConfig();

  // Strategy 1: Try iot-03 device list endpoint (works with project token)
  try {
    const result = await tuyaGet<unknown>("/v1.3/iot-03/devices", { size: "50" });
    const resultObj = result as Record<string, unknown>;
    const list = (resultObj.list ?? resultObj.devices ?? []) as TuyaDevice[];
    if (list.length > 0) {
      return list;
    }
  } catch {
    // Silently try next strategy
  }

  // Strategy 2: Try associated-users endpoint
  try {
    const result = await tuyaGet<unknown>("/v1.0/iot-01/associated-users/devices", {
      size: "50",
    });
    const resultObj = result as Record<string, unknown>;
    const list = (resultObj.devices ?? resultObj.list ?? []) as TuyaDevice[];
    if (list.length > 0) {
      return list;
    }
  } catch {
    // Silently try next strategy
  }

  // Strategy 3: Fetch known devices by ID via iot-03 status endpoint
  const knownIds = (process.env.TUYA_KNOWN_DEVICE_IDS ?? "").split(",").filter(Boolean);
  if (knownIds.length > 0) {
    const devices: TuyaDevice[] = [];
    for (const id of knownIds) {
      try {
        const device = await getDeviceStatus(id.trim());
        devices.push(device);
      } catch {
        // Silently skip failed device
      }
    }
    if (devices.length > 0) return devices;
  }

  // Strategy 4: Use uid-based endpoint (requires linked app account)
  const { uid } = await getToken(config);
  const devices: TuyaDevice[] = [];
  let hasMore = true;
  let lastId = "";

  while (hasMore) {
    const params: Record<string, string> = { page_size: "100" };
    if (lastId) params.last_id = lastId;

    const result = await tuyaGet<UserDeviceListResult>(
      `/v1.0/users/${uid}/devices`,
      params,
    );

    devices.push(...result.list);
    hasMore = result.has_more;
    lastId = result.last_id ?? "";
  }

  return devices;
}

export async function getTokenInfo(): Promise<{
  uid: string;
  token: string;
  endpoint: string;
  authMethod: string;
}> {
  const config = getConfig();
  const user = process.env.TUYA_USER_EMAIL;
  const pass = process.env.TUYA_USER_PASSWORD;
  const authMethod = user && pass ? "user-login" : "project-token";

  const { uid, token } = await getToken(config);
  return {
    uid,
    token: token.slice(0, 10) + "...",
    endpoint: config.endpoint,
    authMethod,
  };
}

export async function getDeviceStatus(deviceId: string): Promise<TuyaDevice> {
  // Try standard endpoint first (returns full device with status, name, online, etc.)
  try {
    return await tuyaGet<TuyaDevice>(`/v1.0/devices/${deviceId}`);
  } catch {
    // Fallback: construct from iot-03 status endpoint
    const status = await tuyaGet<{ code: string; value: unknown }[]>(
      `/v1.0/iot-03/devices/${deviceId}/status`,
    );
    return {
      id: deviceId,
      name: "",
      category: "",
      product_name: "",
      online: true,
      uid: "",
      status,
    };
  }
}

export async function sendDeviceCommand(
  deviceId: string,
  commands: { code: string; value: unknown }[],
): Promise<void> {
  // Try standard endpoint first
  try {
    await tuyaPost(`/v1.0/devices/${deviceId}/commands`, { commands });
  } catch {
    // Fallback to iot-03 endpoint (used by tinytuya)
    await tuyaPost(`/v1.0/iot-03/devices/${deviceId}/commands`, { commands });
  }
}
