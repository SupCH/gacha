/**
 * 完整的米哈游密码登录后端实现
 * 支持国服/国际服密码登录
 * 
 * 功能:
 * 1. 设备指纹获取
 * 2. RSA密码加密
 * 3. 密码登录
 * 4. 短信验证码处理 (新设备)
 */

// ===== RSA 加密配置 =====
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

// ===== 工具函数 =====

/**
 * RSA 加密密码
 */
async function encryptPassword(password) {
    // 移除 PEM 头尾和换行
    const keyData = MI哈游_PUBLIC_KEY
        .replace(/-----BEGIN PUBLIC KEY-----/, '')
        .replace(/-----END PUBLIC KEY-----/, '')
        .replace(/\n/g, '');

    // Base64 解码
    const binaryDer = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));

    // 导入公钥
    const publicKey = await crypto.subtle.importKey(
        'spki',
        binaryDer,
        {
            name: 'RSA-OAEP',
            hash: 'SHA-256'
        },
        false,
        ['encrypt']
    );

    // 加密密码
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        encoder.encode(password)
    );

    // Base64 编码
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

/**
 * 生成设备指纹
 */
async function getDeviceFingerprint(deviceId, scope = 'cn') {
    const endpoint = scope === 'cn'
        ? 'https://public-data-api.mihoyo.com/device-fp/api/getFp'
        : 'https://sg-public-data-api.hoyoverse.com/device-fp/api/getFp';

    const seedId = crypto.randomUUID();
    const seedTime = Date.now().toString();
    const deviceFp = Math.random().toString(36).substring(2, 15);

    // 简化的设备信息 (Web平台)
    const ext_fields = JSON.stringify({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    const payload = {
        device_id: deviceId,
        seed_id: seedId,
        seed_time: seedTime,
        platform: '4', // Web
        device_fp: deviceFp,
        app_name: scope === 'cn' ? 'bbs_cn' : 'bbs_global',
        ext_fields: ext_fields
    };

    const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await resp.json();

    if (data.retcode !== 0) {
        throw new Error('获取设备指纹失败');
    }

    return data.data.device_fp;
}

/**
 * 密码登录
 */
async function passwordLogin(account, password, deviceId, deviceFp, scope = 'cn') {
    // 加密账号和密码
    const encryptedAccount = await encryptPassword(account);
    const encryptedPassword = await encryptPassword(password);

    const endpoint = scope === 'cn'
        ? 'https://passport-api.mihoyo.com/account/ma-cn-passport/app/loginByPassword'
        : 'https://sg-public-api.hoyoverse.com/account/ma-passport-api/web/loginByPassword';

    const headers = {
        'Content-Type': 'application/json',
        'x-rpc-app_id': 'bll8iq97cem8',
        'x-rpc-client_type': '2',
        'x-rpc-game_biz': scope === 'cn' ? 'bbs_cn' : 'bbs_global',
        'x-rpc-device_fp': deviceFp,
        'x-rpc-device_id': deviceId
    };

    const payload = {
        account: encryptedAccount,
        password: encryptedPassword
    };

    const resp = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    const data = await resp.json();

    // 检查是否需要短信验证 (新设备)
    if (data.retcode === -3235) {
        // 提取验证信息
        const verifyHeader = resp.headers.get('x-rpc-verify');
        return {
            retcode: -3235,
            message: '新设备登录，需要短信验证',
            verify_info: verifyHeader ? JSON.parse(verifyHeader) : null
        };
    }

    if (data.retcode !== 0) {
        return {
            retcode: data.retcode,
            message: data.message || '登录失败'
        };
    }

    // 提取 stoken 和 uid
    return {
        retcode: 0,
        data: {
            stoken: data.data.token?.token || data.data.stoken,
            uid: data.data.user_info?.aid || data.data.user_info?.uid
        }
    };
}

// ===== Worker 主路由 =====

// 在 worker-dynamic.js 中添加以下路由:

// 路由: 密码登录
if (url.pathname === "/api/auth/login/password") {
    const { account, password, scope } = await request.json();

    try {
        // 1. 生成/获取设备ID
        const deviceId = crypto.randomUUID();

        // 2. 获取设备指纹
        const deviceFp = await getDeviceFingerprint(deviceId, scope);

        // 3. 执行密码登录
        const result = await passwordLogin(account, password, deviceId, deviceFp, scope);

        return jsonResponse(result);

    } catch (e) {
        return jsonResponse({
            retcode: -1,
            message: e.message || '登录失败'
        }, 500);
    }
}

// 路由: 发送短信验证码 (新设备登录)
if (url.pathname === "/api/auth/login/send-sms") {
    const { action_ticket, scope } = await request.json();

    const endpoint = scope === 'cn'
        ? 'https://passport-api.mihoyo.com/account/ma-cn-verifier/verifier/createMobileCaptchaByActionTicket'
        : 'https://sg-public-api.hoyoverse.com/account/ma-verifier/verifier/createMobileCaptchaByActionTicket';

    const payload = {
        action_ticket: action_ticket,
        action_type: 'verify_for_component'
    };

    const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await resp.json();
    return jsonResponse(data);
}

// 路由: 验证短信验证码
if (url.pathname === "/api/auth/login/verify-sms") {
    const { action_ticket, verify_ticket, captcha, action_ticket_final, scope } = await request.json();

    // 1. 提交验证码
    const verifyEndpoint = scope === 'cn'
        ? 'https://passport-api.mihoyo.com/account/ma-cn-verifier/verifier/verifyActionTicketPartly'
        : 'https://sg-public-api.hoyoverse.com/account/ma-verifier/verifier/verifyActionTicketPartly';

    const verifyPayload = {
        action_ticket: verify_ticket,
        action_type: 'verify_for_component',
        verify_method: 1,
        mobile_captcha: captcha
    };

    const verifyResp = await fetch(verifyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyPayload)
    });

    const verifyData = await verifyResp.json();

    if (verifyData.retcode !== 0) {
        return jsonResponse(verifyData);
    }

    // 2. 获取最终登录信息
    const checkEndpoint = scope === 'cn'
        ? 'https://passport-api.mihoyo.com/account/ma-cn-passport/app/checkRiskVerified'
        : 'https://sg-public-api.hoyoverse.com/account/ma-passport-api/app/checkRiskVerified';

    const checkPayload = {
        action_ticket: action_ticket_final
    };

    const checkResp = await fetch(checkEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkPayload)
    });

    const data = await checkResp.json();

    if (data.retcode !== 0) {
        return jsonResponse(data);
    }

    // 提取 stoken
    return jsonResponse({
        retcode: 0,
        data: {
            stoken: data.data.token?.token || data.data.stoken,
            uid: data.data.user_info?.aid || data.data.user_info?.uid
        }
    });
}
