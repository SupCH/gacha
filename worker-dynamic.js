/**
 * Gacha Auth Backend (Cloudflare Workers) - 最终合并版
 * 功能：
 * 1. 动态 Salt 获取 (支持国服/国际服)
 * 2. 扫码登录 (支持国服)
 * 3. 密码登录 (支持国服/国际服, 含 RSA 加密与设备验证)
 * 4. 自动缓存与降级机制
 */

// --- 配置与常量 ---
const SALT_CONFIG_URL = 'https://raw.githubusercontent.com/UIGF-org/mihoyo-api-collect/main/other/salt_config.json';

const FALLBACK_SALTS = {
    cn: {
        lk2: "rk4xg2hakoi26nljpr099fv9fck1ah10",  // 米游社 2.8.1 LK2
        k2: "dmq2p7ka6nsu0d3ev6nex4k1ndzrnfiy",   // K2
        s4x: "xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs",  // 4X
        s6x: "t0qEgfub6cvuvAPgR5m9aQWWVciEer7v",  // 6X
        prod: "JwYDpKvLj6MrMqqYU6jTKF17KNO2PXoS",  // PROD
        version: "2.81.0"
    },
    os: {
        lk2: "okr71iL8870LnguK6y5dRIF7DSKn0rrl",   // HoYoLAB
        version: "2.40.0"
    }
};

const MI哈游_PUBLIC_KEY = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4PaSFVLqy5C8YliPAJ8a
YuZJPJ+FN7gHMBOo+/AjOpvE9PRAqShQpPvSuJfbPVvZOh6eWYOKKF6WEprx8vvH
z5W9YvJJF0IQ1M3B7h4XAGBVfGhDDQqFh9aNx8hBCqI27TtAoCa2wS9lKLEY5r3A
2UNJqm6bFiLaMlF8mCpjDzMHi8YNTOywZ4uUBRjhGPvLJmfOUHPPpCjPPqxqw8aD
kSPEEwH6F5EIm9qqnqCQMI5BWPQR0LHG0j1g8mF6f7C8K4N5TCwE14WB8JUfLJ1c
FxGLbONhU2N3mSPoiwGNCBMHpKFLTOmWMbfFxBQEqHKNcXbPGYgWmEPqAIm2y1UP
NwIDAQAB
-----END PUBLIC KEY-----
`;

const CACHE_KEY = 'mihoyo_salt_cache';
const CACHE_TTL = 3600; // 1小时缓存

// --- 通用工具函数 ---

async function md5(message) {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('MD5', msgUint8);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function encryptPassword(password) {
    const keyData = MI哈游_PUBLIC_KEY
        .replace(/-----BEGIN PUBLIC KEY-----/, '')
        .replace(/-----END PUBLIC KEY-----/, '')
        .replace(/\n/g, '');
    const binaryDer = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
    const publicKey = await crypto.subtle.importKey(
        'spki', binaryDer, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']
    );
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, encoder.encode(password));
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

// --- 业务辅助函数 ---

async function getSaltConfig(env) {
    if (env && env.SALT_CACHE) {
        try {
            const cached = await env.SALT_CACHE.get(CACHE_KEY, 'json');
            if (cached && cached.timestamp && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
                return cached.data;
            }
        } catch (e) {
            console.warn('[Salt] Cache read failed:', e.message);
        }
    }

    try {
        const resp = await fetch(SALT_CONFIG_URL, { cache: 'no-cache', signal: AbortSignal.timeout(5000) });
        if (resp.ok) {
            const data = await resp.json();
            if (env && env.SALT_CACHE) {
                try {
                    await env.SALT_CACHE.put(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }), { expirationTtl: CACHE_TTL });
                } catch (e) {
                    console.warn('[Salt] Cache write failed:', e.message);
                }
            }
            return data;
        }
    } catch (e) {
        console.warn('[Salt] Fetch failed, using fallback:', e.message);
    }
    return FALLBACK_SALTS;
}

async function getDS(isGlobal, env) {
    const salts = await getSaltConfig(env);
    const region = isGlobal ? 'os' : 'cn';
    const salt = salts[region]?.lk2 || FALLBACK_SALTS[region].lk2;
    const t = Math.floor(Date.now() / 1000);
    const r = Math.random().toString(36).substring(2, 8);
    const main = `salt=${salt}&t=${t}&r=${r}`;
    const sign = await md5(main);
    return `${t},${r},${sign}`;
}

async function getAppVersion(isGlobal, env) {
    const salts = await getSaltConfig(env);
    const region = isGlobal ? 'os' : 'cn';
    return salts[region]?.version || FALLBACK_SALTS[region].version;
}

async function getDeviceFingerprint(deviceId, scope = 'cn') {
    const endpoint = scope === 'cn'
        ? 'https://public-data-api.mihoyo.com/device-fp/api/getFp'
        : 'https://sg-public-data-api.hoyoverse.com/device-fp/api/getFp';
    const seedId = crypto.randomUUID();
    const seedTime = Date.now().toString();
    const deviceFp = Math.random().toString(36).substring(2, 15);
    const ext_fields = JSON.stringify({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' });
    const payload = { device_id: deviceId, seed_id: seedId, seed_time: seedTime, platform: '4', device_fp: deviceFp, app_name: scope === 'cn' ? 'bbs_cn' : 'bbs_global', ext_fields: ext_fields };
    const resp = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await resp.json();
    if (data.retcode !== 0) throw new Error('获取设备指纹失败');
    return data.data.device_fp;
}

async function passwordLogin(account, password, deviceId, deviceFp, scope = 'cn') {
    const encryptedAccount = await encryptPassword(account);
    const encryptedPassword = await encryptPassword(password);
    const endpoint = scope === 'cn'
        ? 'https://passport-api.mihoyo.com/account/ma-cn-passport/app/loginByPassword'
        : 'https://sg-public-api.hoyoverse.com/account/ma-passport-api/web/loginByPassword';
    const headers = { 'Content-Type': 'application/json', 'x-rpc-app_id': 'bll8iq97cem8', 'x-rpc-client_type': '2', 'x-rpc-game_biz': scope === 'cn' ? 'bbs_cn' : 'bbs_global', 'x-rpc-device_fp': deviceFp, 'x-rpc-device_id': deviceId };
    const payload = { account: encryptedAccount, password: encryptedPassword };
    const resp = await fetch(endpoint, { method: 'POST', headers: headers, body: JSON.stringify(payload) });
    const data = await resp.json();
    if (data.retcode === -3235) {
        const verifyHeader = resp.headers.get('x-rpc-verify');
        return { retcode: -3235, message: '新设备登录，需要短信验证', verify_info: verifyHeader ? JSON.parse(verifyHeader) : null };
    }
    if (data.retcode !== 0) return { retcode: data.retcode, message: data.message || '登录失败' };
    return { retcode: 0, data: { stoken: data.data.token?.token || data.data.stoken, uid: data.data.user_info?.aid || data.data.user_info?.uid } };
}

// --- Worker 处理 ---

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, x-rpc-client_type, x-rpc-app_version, x-rpc-verify",
                }
            });
        }

        try {
            if (url.pathname === "/health" || url.pathname === "/") {
                const salts = await getSaltConfig(env);
                return jsonResponse({ status: "ok", timestamp: new Date().toISOString(), config: { cn_version: salts.cn?.version || "unknown", os_version: salts.os?.version || "unknown", cache_enabled: !!(env && env.SALT_CACHE) } });
            }

            // 路由: 抽卡记录代理 (解决 CORS)
            if (url.pathname === "/api/proxy/gacha-log") {
                const targetUrl = url.searchParams.get("url");
                if (!targetUrl) return jsonResponse({ retcode: -1, msg: "Missing target url" }, 400);

                const resp = await fetch(targetUrl, {
                    method: "GET",
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    }
                });

                const data = await resp.json();
                return jsonResponse(data);
            }


            if (url.pathname === "/api/auth/qr/fetch") {
                const isGlobal = url.searchParams.get("scope") === "global";
                const target = isGlobal ? "https://hk4e-sdk-os.hoyoverse.com/hk4e_global/combo/panda/qrcode/fetch" : "https://hk4e-sdk.mihoyo.com/hk4e_cn/combo/panda/qrcode/fetch";
                const appId = isGlobal ? "150" : "4";
                const deviceId = crypto.randomUUID();

                const resp = await fetch(target, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                        "Accept": "application/json, text/plain, */*",
                        "Accept-Language": "zh-CN,zh;q=0.9",
                        "Origin": isGlobal ? "https://account.hoyoverse.com" : "https://user.mihoyo.com",
                        "Referer": isGlobal ? "https://account.hoyoverse.com/" : "https://user.mihoyo.com/"
                    },
                    body: JSON.stringify({ app_id: appId, device: deviceId })
                });

                const data = await resp.json();
                return jsonResponse(data);
            }

            if (url.pathname === "/api/auth/qr/query") {
                const ticket = url.searchParams.get("ticket");
                const isGlobal = url.searchParams.get("scope") === "global";
                const target = isGlobal ? "https://hk4e-sdk-os.hoyoverse.com/hk4e_global/combo/panda/qrcode/query" : "https://hk4e-sdk.mihoyo.com/hk4e_cn/combo/panda/qrcode/query";
                const appId = isGlobal ? "150" : "4";
                const deviceId = url.searchParams.get("device") || crypto.randomUUID();
                const resp = await fetch(target, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ app_id: appId, device: deviceId, ticket }) });
                const data = await resp.json();
                return jsonResponse(data);
            }

            if (url.pathname === "/api/auth/gen-key") {
                const { stoken, uid, game_biz, region, scope } = await request.json();
                const isGlobal = scope === "global";
                const ds = await getDS(isGlobal, env);
                const appVersion = await getAppVersion(isGlobal, env);
                const endpoint = isGlobal ? "https://api-account-os.hoyoverse.com/binding/api/genAuthKey" : "https://api-takumi.mihoyo.com/binding/api/genAuthKey";
                const headers = { "DS": ds, "x-rpc-client_type": "5", "x-rpc-app_version": appVersion, "Cookie": `stoken=${stoken};stuid=${uid};mid=${uid};`, "Content-Type": "application/json" };
                const payload = { "auth_appid": "webview_gacha", "game_biz": game_biz, "game_uid": parseInt(uid), "region": region };
                const resp = await fetch(endpoint, { method: "POST", headers: headers, body: JSON.stringify(payload) });
                const data = await resp.json();
                return jsonResponse(data);
            }

            if (url.pathname === "/api/auth/login/password") {
                const { account, password, scope } = await request.json();
                const deviceId = crypto.randomUUID();
                const deviceFp = await getDeviceFingerprint(deviceId, scope);
                const result = await passwordLogin(account, password, deviceId, deviceFp, scope);
                return jsonResponse(result);
            }

            if (url.pathname === "/api/auth/login/send-sms") {
                const { action_ticket, scope } = await request.json();
                const endpoint = scope === 'cn' ? 'https://passport-api.mihoyo.com/account/ma-cn-verifier/verifier/createMobileCaptchaByActionTicket' : 'https://sg-public-api.hoyoverse.com/account/ma-verifier/verifier/createMobileCaptchaByActionTicket';
                const resp = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action_ticket, action_type: 'verify_for_component' }) });
                return jsonResponse(await resp.json());
            }

            if (url.pathname === "/api/auth/login/verify-sms") {
                const { verify_ticket, captcha, action_ticket_final, scope } = await request.json();
                const verifyEndpoint = scope === 'cn' ? 'https://passport-api.mihoyo.com/account/ma-cn-verifier/verifier/verifyActionTicketPartly' : 'https://sg-public-api.hoyoverse.com/account/ma-verifier/verifier/verifyActionTicketPartly';
                const vResp = await fetch(verifyEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action_ticket: verify_ticket, action_type: 'verify_for_component', verify_method: 1, mobile_captcha: captcha }) });
                const vData = await vResp.json();
                if (vData.retcode !== 0) return jsonResponse(vData);
                const checkEndpoint = scope === 'cn' ? 'https://passport-api.mihoyo.com/account/ma-cn-passport/app/checkRiskVerified' : 'https://sg-public-api.hoyoverse.com/account/ma-passport-api/app/checkRiskVerified';
                const cResp = await fetch(checkEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action_ticket: action_ticket_final }) });
                const data = await cResp.json();
                if (data.retcode !== 0) return jsonResponse(data);
                return jsonResponse({ retcode: 0, data: { stoken: data.data.token?.token || data.data.stoken, uid: data.data.user_info?.aid || data.data.user_info?.uid } });
            }

            // Cookie 转换为 Gacha URL
            if (url.pathname === "/api/auth/cookie-to-url") {
                const { cookie, scope } = await request.json();
                const isGlobal = scope === "global";

                // 解析 cookie，提取必要的字段
                const cookieObj = {};
                cookie.split(';').forEach(item => {
                    const [key, value] = item.trim().split('=');
                    if (key && value) cookieObj[key] = value;
                });

                let cookieToken = cookieObj['cookie_token_v2'] || cookieObj['cookie_token'];
                let accountId = cookieObj['account_id'] || cookieObj['ltuid'] || cookieObj['ltuid_v2'];

                // 如果只提供了 token 值（没有 key），尝试作为 cookie_token_v2 使用
                if (!cookieToken && cookie.trim().startsWith('v2_')) {
                    cookieToken = cookie.trim();
                }

                if (!cookieToken) {
                    return jsonResponse({
                        retcode: -1,
                        message: "未找到有效的 cookie token"
                    });
                }

                // 如果没有 account_id，尝试从米游社 API 获取
                if (!accountId) {
                    try {
                        const userInfoUrl = isGlobal
                            ? "https://api-account-os.hoyoverse.com/account/auth/api/getUserAccountInfoByLToken"
                            : "https://api-takumi.mihoyo.com/auth/api/getUserAccountInfoBySToken";

                        const userInfoResp = await fetch(userInfoUrl, {
                            headers: {
                                "Cookie": `cookie_token_v2=${cookieToken};`,
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                            }
                        });

                        const userInfo = await userInfoResp.json();

                        if (userInfo.retcode === 0 && userInfo.data) {
                            accountId = userInfo.data.account_id || userInfo.data.uid;
                        }
                    } catch (e) {
                        // 如果获取失败，继续尝试构建URL（可能在后续请求中会失败）
                    }
                }

                if (!accountId) {
                    return jsonResponse({
                        retcode: -1,
                        message: "无法获取账号ID，请检查 cookie 是否有效或尝试同时提供 account_id"
                    });
                }

                // 构建 gacha URL (使用 cookie 直接访问抽卡历史)
                const gachaUrlBase = isGlobal
                    ? "https://sg-public-api.hoyoverse.com/event/gacha_info/api/getGachaLog"
                    : "https://public-operation-hk4e.mihoyo.com/gacha_info/api/getGachaLog";

                const params = new URLSearchParams({
                    authkey_ver: "1",
                    sign_type: "2",
                    auth_appid: "webview_gacha",
                    init_type: "301",
                    gacha_id: isGlobal ? "dbebc8d9fbb0d4ffa067423482ce505bc5ea" : "e3c6f9f1bd0ebd6db20c5088ed0ca1f64be4",
                    lang: isGlobal ? "en-us" : "zh-cn",
                    device_type: "mobile",
                    game_version: isGlobal ? "OSRELWin4.8.0_R24971658_S25126365_D25136887" : "CNRELWin4.8.0_R24886073_S24844616_D24845085",
                    region: isGlobal ? "os_usa" : "cn_gf01",
                    game_biz: isGlobal ? "hk4e_global" : "hk4e_cn"
                });

                const gachaUrl = `${gachaUrlBase}?${params.toString()}`;

                return jsonResponse({
                    retcode: 0,
                    message: "OK",
                    data: {
                        url: gachaUrl,
                        cookie: `cookie_token_v2=${cookieToken};account_id=${accountId};`
                    }
                });
            }

            if (url.pathname === "/api/refresh-salt") {
                if (env && env.SALT_CACHE) await env.SALT_CACHE.delete(CACHE_KEY);
                const newConfig = await getSaltConfig(env);
                return jsonResponse({ message: "Salt cache refreshed", config: newConfig });
            }

            return new Response("Not Found", { status: 404 });
        } catch (e) {
            return jsonResponse({ retcode: -1, msg: e.message }, 500);
        }
    }
};

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, x-rpc-client_type, x-rpc-app_version, x-rpc-verify",
        }
    });
}
