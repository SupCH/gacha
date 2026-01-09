/**
 * 米哈游扫码登录服务
 * 连接 Cloudflare Workers 后端,实现二维码扫码获取抽卡链接
 */

// 后端 Worker 地址 (部署后需要配置)
const WORKER_ENDPOINT = import.meta.env.VITE_WORKER_URL || 'https://your-worker.workers.dev';

export interface QRCodeData {
    url: string;
    ticket: string;
}

export interface AuthKeyData {
    authkey: string;
    authkey_ver: string;
    sign_type: number;
}

export type ScanStatus = 'init' | 'waiting' | 'scanned' | 'confirmed' | 'expired' | 'error';

/**
 * 获取二维码
 * @param scope 'cn' 国服 | 'global' 国际服
 */
export async function fetchQRCode(scope: 'cn' | 'global' = 'cn'): Promise<QRCodeData> {
    const response = await fetch(`${WORKER_ENDPOINT}/api/auth/qr/fetch?scope=${scope}`);
    const data = await response.json();

    if (data.retcode !== 0) {
        throw new Error(data.message || '获取二维码失败');
    }

    return data.data;
}

/**
 * 查询扫码状态
 * @param ticket 二维码票据
 * @param deviceId 设备ID
 * @param scope 'cn' 国服 | 'global' 国际服
 */
export async function queryQRStatus(
    ticket: string,
    deviceId: string,
    scope: 'cn' | 'global' = 'cn'
): Promise<{
    status: ScanStatus;
    payload?: any; // 扫码成功后的数据 (stoken 等)
}> {
    const response = await fetch(
        `${WORKER_ENDPOINT}/api/auth/qr/query?ticket=${ticket}&device=${deviceId}&scope=${scope}`
    );
    const data = await response.json();

    if (data.retcode !== 0) {
        return { status: 'error' };
    }

    // 米哈游扫码状态映射
    // Init -> 等待扫码
    // Scanned -> 已扫码,等待确认
    // Confirmed -> 已确认,返回 stoken
    const statusMap: Record<string, ScanStatus> = {
        'Init': 'waiting',
        'Scanned': 'scanned',
        'Confirmed': 'confirmed',
        'Expired': 'expired'
    };

    return {
        status: statusMap[data.data.status] || 'waiting',
        payload: data.data.payload
    };
}

/**
 * 账号密码登录 (国服/国际服)
 * @param account 账号 (手机号/邮箱)
 * @param password 密码
 * @param scope 'cn' 国服 | 'global' 国际服
 */
export async function loginWithPassword(
    account: string,
    password: string,
    scope: 'cn' | 'global' = 'cn'
): Promise<{
    stoken: string;
    uid: string;
}> {
    const response = await fetch(`${WORKER_ENDPOINT}/api/auth/login/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            account,
            password,
            scope
        })
    });

    const data = await response.json();

    if (data.retcode !== 0) {
        throw new Error(data.message || '登录失败');
    }

    return data.data;
}


/**
 * 生成抽卡链接的 authkey
 * @param stoken 扫码成功获取的 stoken
 * @param uid 用户 UID
 * @param gameBiz 游戏标识 (hk4e_cn, hkrpg_cn, nap_cn)
 * @param region 区服 (cn_gf01, cn_qd01, etc.)
 * @param scope 'cn' | 'global'
 */
export async function generateAuthKey(
    stoken: string,
    uid: string,
    gameBiz: string,
    region: string,
    scope: 'cn' | 'global' = 'cn'
): Promise<AuthKeyData> {
    const response = await fetch(`${WORKER_ENDPOINT}/api/auth/gen-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            stoken,
            uid,
            game_biz: gameBiz,
            region,
            scope
        })
    });

    const data = await response.json();

    if (data.retcode !== 0) {
        throw new Error(data.message || '生成 authkey 失败');
    }

    return data.data;
}

/**
 * 构建抽卡历史链接
 * @param authkey authkey 数据
 * @param gameBiz 游戏标识
 * @param region 区服
 * @param gachaType 卡池类型 (可选)
 */
export function buildGachaUrl(
    authkey: string,
    gameBiz: string,
    region: string,
    gachaType: string = '301'
): string {
    const params = new URLSearchParams({
        authkey_ver: '1',
        sign_type: '2',
        auth_appid: 'webview_gacha',
        init_type: gachaType,
        gacha_id: '',
        lang: 'zh-cn',
        device_type: 'mobile',
        game_biz: gameBiz,
        region: region,
        authkey: authkey
    });

    // 根据游戏类型选择 API 端点
    const endpoints: Record<string, string> = {
        'hk4e_cn': 'https://public-operation-hk4e.mihoyo.com/gacha_info/api/getGachaLog',
        'hkrpg_cn': 'https://api-takumi.mihoyo.com/common/gacha_record/api/getGachaLog',
        'nap_cn': 'https://public-operation-nap.mihoyo.com/common/gacha_record/api/getGachaLog'
    };

    const baseUrl = endpoints[gameBiz] || endpoints['hk4e_cn'];
    return `${baseUrl}?${params.toString()}`;
}

/**
 * 通过代理获取完整的抽卡记录
 * @param gachaUrl 原始抽卡链接
 */
export async function fetchFullGachaLog(gachaUrl: string): Promise<any[]> {
    const allItems: any[] = [];
    let endId = '0';
    let hasMore = true;

    // 提取基础 URL 和参数
    const urlObj = new URL(gachaUrl);

    // 遍历所有可能的卡池类型 (针对不同游戏可能不同, 这里简化处理)
    // 实际生产中可能需要根据游戏类型动态调整 gacha_type 列表
    const gachaTypes = ['100', '200', '301', '400', '302', '500', '1', '2', '11', '12', '3', '5'];

    for (const gachaType of gachaTypes) {
        endId = '0';
        hasMore = true;

        while (hasMore) {
            urlObj.searchParams.set('gacha_type', gachaType);
            urlObj.searchParams.set('end_id', endId);
            urlObj.searchParams.set('size', '20');

            const proxyUrl = `${WORKER_ENDPOINT}/api/proxy/gacha-log?url=${encodeURIComponent(urlObj.toString())}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();

            if (data.retcode !== 0) {
                console.warn(`Fetch gacha error for type ${gachaType}:`, data.message);
                break;
            }

            const list = data.data.list;
            if (!list || list.length === 0) {
                hasMore = false;
            } else {
                allItems.push(...list);
                endId = list[list.length - 1].id;
                if (list.length < 20) {
                    hasMore = false;
                }
            }

            // 避免请求太快
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    return allItems;
}

/**
 * 将原始列表转换为标准 UIGF 格式
 */
export function convertToUIGF(list: any[], uid: string, game: 'hk4e' | 'hkrpg' | 'nap') {
    return {
        info: {
            uid: uid,
            lang: 'zh-cn',
            export_app: 'Gacha Analyzer',
            export_app_version: '1.0.0',
            export_time: new Date().toISOString(),
            uigf_version: 'v3.0',
            game_biz: `${game}_cn`
        },
        list: list.map(item => ({
            ...item,
            uigf_gacha_type: item.uigf_gacha_type || item.gacha_type
        }))
    };
}

/**
 * 检查 Worker 健康状态
 */
export async function checkWorkerHealth(): Promise<{
    ok: boolean;
    version?: { cn: string; os: string };
}> {
    try {
        const response = await fetch(`${WORKER_ENDPOINT}/health`);
        const data = await response.json();

        if (data.status === 'ok') {
            return {
                ok: true,
                version: {
                    cn: data.config.cn_version,
                    os: data.config.os_version
                }
            };
        }
    } catch (e) {
        console.error('Worker health check failed:', e);
    }

    return { ok: false };
}
