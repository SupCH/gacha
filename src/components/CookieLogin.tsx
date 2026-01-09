import { useState } from 'react';
import { ExternalLink, CheckCircle2, HelpCircle } from 'lucide-react';

interface CookieLoginProps {
    onSuccess: (gachaUrl: string) => void;
    scope?: 'cn' | 'global';
}

export function CookieLogin({ onSuccess, scope = 'cn' }: CookieLoginProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [cookie, setCookie] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loginUrl = scope === 'global'
        ? 'https://account.hoyoverse.com'
        : 'https://user.mihoyo.com';

    const handleOpenLogin = () => {
        const width = 500;
        const height = 700;
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;

        window.open(
            loginUrl,
            `${scope === 'global' ? 'HoYoverse' : '米游社'}登录`,
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
        );

        setStep(2);
    };

    const handleSubmitCookie = async () => {
        if (!cookie.trim()) {
            setError('请输入 Cookie');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const WORKER_ENDPOINT = import.meta.env.VITE_WORKER_URL || 'https://gacha-worker.917560056.workers.dev';

            const response = await fetch(`${WORKER_ENDPOINT}/api/auth/cookie-to-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cookie, scope })
            });

            const data = await response.json();

            if (data.retcode !== 0) {
                throw new Error(data.message || '获取抽卡链接失败');
            }

            setStep(3);
            onSuccess(data.data.url);
        } catch (e: any) {
            setError(e.message || '请求失败，请检查 Cookie 是否正确');
        } finally {
            setLoading(false);
        }
    };

    const cookieInstructions = scope === 'global' ? [
        '1. 在弹出的 HoYoverse 窗口中完成登录',
        '2. 登录成功后，按 F12 打开开发者工具',
        '3. 切换到 "Application" (应用) 或 "Storage" (存储) 标签',
        '4. 在左侧找到 "Cookies" → "https://account.hoyoverse.com"',
        '5. 复制 cookie_token_v2 的值（点击后按 Ctrl+C）',
        '6. 粘贴到下方输入框中'
    ] : [
        '1. 在弹出的米游社窗口中完成登录',
        '2. 登录成功后，按 F12 打开开发者工具',
        '3. 切换到 "应用程序" (Application) 标签',
        '4. 在左侧找到 "Cookie" → "https://user.mihoyo.com"',
        '5. 复制 cookie_token_v2 的值（点击后按 Ctrl+C）',
        '6. 粘贴到下方输入框中'
    ];

    return (
        <div className="space-y-4">
            {/* Step 1: 打开登录窗口 */}
            {step === 1 && (
                <button
                    onClick={handleOpenLogin}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                    <ExternalLink size={20} />
                    <span>打开{scope === 'global' ? 'HoYoverse' : '米游社'}登录</span>
                </button>
            )}

            {/* Step 2: 输入 Cookie */}
            {step === 2 && (
                <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                        <div className="flex items-start gap-2 text-blue-700 font-medium">
                            <HelpCircle size={18} className="mt-0.5 shrink-0" />
                            <span>复制 Cookie 步骤</span>
                        </div>
                        <div className="text-xs text-blue-600 space-y-1 pl-6">
                            {cookieInstructions.map((instruction, i) => (
                                <div key={i}>{instruction}</div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            粘贴 cookie_token_v2 的值：
                        </label>
                        <textarea
                            value={cookie}
                            onChange={(e) => setCookie(e.target.value)}
                            placeholder="v2_xxx..."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleSubmitCookie}
                        disabled={loading || !cookie.trim()}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? '正在获取...' : '确认并获取数据'}
                    </button>

                    <button
                        onClick={() => setStep(1)}
                        className="w-full text-gray-600 hover:text-gray-800 py-2 text-sm"
                    >
                        返回重新登录
                    </button>
                </div>
            )}

            {/* Step 3: 成功 */}
            {step === 3 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
                    <CheckCircle2 className="mx-auto text-green-600" size={48} />
                    <div className="text-green-700 font-medium">登录成功！</div>
                    <div className="text-sm text-green-600">正在获取抽卡记录...</div>
                </div>
            )}

            {step === 1 && (
                <div className="text-xs text-gray-500 space-y-1">
                    <p>• 使用官方登录页面，安全可靠</p>
                    <p>• 只需复制一次 Cookie 即可</p>
                    <p>• Cookie 仅用于本次会话</p>
                </div>
            )}
        </div>
    );
}
