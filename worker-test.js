/**
 * 测试脚本 - 验证米哈游 API 参数
 * 
 * 使用方法:
 * 1. 将此文件复制到你的 Cloudflare Worker
 * 2. 访问 /test 路径
 * 3. 查看返回结果
 */

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        if (url.pathname === '/test') {
            const results = {
                timestamp: new Date().toISOString(),
                tests: []
            };

            // 测试 1: 国服二维码端点
            try {
                const resp = await fetch('https://hk4e-sdk.mihoyo.com/hk4e_cn/combo/panda/qrcode/fetch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ app_id: '4', device: 'test-device' })
                });

                results.tests.push({
                    name: '国服二维码接口',
                    endpoint: 'https://hk4e-sdk.mihoyo.com/hk4e_cn/combo/panda/qrcode/fetch',
                    status: resp.status,
                    ok: resp.ok,
                    message: resp.ok ? '✅ 可用' : '❌ 不可用'
                });
            } catch (e) {
                results.tests.push({
                    name: '国服二维码接口',
                    status: 'ERROR',
                    message: e.message
                });
            }

            // 测试 2: 国际服二维码端点
            try {
                const resp = await fetch('https://hk4e-sdk-os.hoyoverse.com/hk4e_global/combo/panda/qrcode/fetch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ app_id: '150', device: 'test-device' })
                });

                results.tests.push({
                    name: '国际服二维码接口',
                    endpoint: 'https://hk4e-sdk-os.hoyoverse.com/hk4e_global/combo/panda/qrcode/fetch',
                    status: resp.status,
                    ok: resp.ok,
                    message: resp.ok ? '✅ 可用' : '❌ 不可用'
                });
            } catch (e) {
                results.tests.push({
                    name: '国际服二维码接口',
                    status: 'ERROR',
                    message: e.message
                });
            }

            // 测试 3: Salt 验证
            const SALT_CN = "xV8v4Qu54lUKrEYy3azhZgbBashqlF_b";
            const SALT_OS = "okr71iL8870LnguK6y5dRIF7DSKn0rrl";

            results.tests.push({
                name: 'Salt 配置',
                salt_cn: SALT_CN,
                salt_os: SALT_OS,
                message: '⚠️ 需要定期检查社区更新'
            });

            // 测试 4: App Version
            results.tests.push({
                name: 'App Version',
                version_cn: '2.56.1',
                version_os: '2.34.1',
                message: '⚠️ 建议对比米游社最新版本号'
            });

            // 返回测试报告
            return new Response(JSON.stringify(results, null, 2), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        return new Response('Use /test to run validation', { status: 404 });
    }
};
