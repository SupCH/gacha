// Worker 后端添加密码登录路由

// 在 export default { async fetch() } 中添加:

// 路由 X: 账号密码登录
if (url.pathname === "/api/auth/login/password") {
    const { account, password, scope } = await request.json();
    const isGlobal = scope === "global";

    // 注意: 密码登录需要实现完整的登录流程
    // 包括: 获取验证码(如需) -> 提交登录 -> 获取 stoken
    // 这里提供基础框架,完整实现需要根据米哈游最新 API 调整

    try {
        // 国服密码登录端点
        const loginEndpoint = isGlobal
            ? "https://api-account-os.hoyoverse.com/account/auth/api/webLogin"
            : "https://passport-api.mihoyo.com/account/ma-cn-passport/app/loginByPassword";

        // 生成 DS (使用 PROD Salt)
        const ds = await getDS(isGlobal, env);
        const appVersion = await getAppVersion(isGlobal, env);

        const headers = {
            "DS": ds,
            "x-rpc-client_type": "2",
            "x-rpc-app_version": appVersion,
            "x-rpc-device_id": crypto.randomUUID(),
            "Content-Type": "application/json"
        };

        const payload = {
            account: account,
            password: password // 注意: 实际需要加密
        };

        const resp = await fetch(loginEndpoint, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        });

        const data = await resp.json();

        if (data.retcode !== 0) {
            return jsonResponse({
                retcode: data.retcode,
                message: data.message || "登录失败"
            }, 400);
        }

        // 提取 stoken 和 uid
        return jsonResponse({
            retcode: 0,
            data: {
                stoken: data.data.token?.token || data.data.stoken,
                uid: data.data.account?.uid || data.data.uid
            }
        });
    } catch (e) {
        return jsonResponse({
            retcode: -1,
            message: "登录异常: " + e.message
        }, 500);
    }
}

/**
 * 重要提示:
 * 1. 密码需要加密传输 (米哈游使用 RSA 加密)
 * 2. 可能需要图形验证码/邮箱验证码
 * 3. 需要处理设备认证
 * 4. API 端点和参数可能随版本变化
 * 
 * 建议参考:
 * - UIGF-org/mihoyo-api-collect (密码登录文档)
 * - 使用抓包工具获取最新 API 格式
 */
