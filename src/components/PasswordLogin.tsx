import { useState } from 'react';
import { loginWithPassword, generateAuthKey, buildGachaUrl } from '../services/authService';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';

interface PasswordLoginProps {
    onSuccess: (gachaUrl: string) => void;
    scope?: 'cn' | 'global';
    gameBiz?: string;
    region?: string;
}

export function PasswordLogin({
    onSuccess,
    scope = 'cn',
    gameBiz = 'hk4e_cn',
    region = 'cn_gf01'
}: PasswordLoginProps) {
    const [account, setAccount] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // 1. 账号密码登录获取 stoken
            const loginData = await loginWithPassword(account, password, scope);

            // 2. 使用 stoken 生成 authkey
            const authKeyData = await generateAuthKey(
                loginData.stoken,
                loginData.uid,
                gameBiz,
                region,
                scope
            );

            // 3. 构建抽卡链接
            const gachaUrl = buildGachaUrl(authKeyData.authkey, gameBiz, region);

            // 4. 回调成功
            onSuccess(gachaUrl);
        } catch (e: any) {
            setError(e.message || '登录失败');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-3xl border shadow-lg max-w-md mx-auto">
            <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">
                {scope === 'cn' ? '国服账号登录' : '国际服账号登录'}
            </h3>

            <form onSubmit={handleLogin} className="space-y-4">
                {/* 账号输入 */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        {scope === 'cn' ? '手机号/邮箱' : 'Email'}
                    </label>
                    <input
                        type="text"
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                        placeholder={scope === 'cn' ? '请输入手机号或邮箱' : 'Enter your email'}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                </div>

                {/* 密码输入 */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        {scope === 'cn' ? '密码' : 'Password'}
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={scope === 'cn' ? '请输入密码' : 'Enter your password'}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                {/* 登录按钮 */}
                <button
                    type="submit"
                    disabled={isLoading || !account || !password}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            登录中...
                        </>
                    ) : (
                        <>
                            <LogIn size={18} />
                            登录
                        </>
                    )}
                </button>
            </form>

            {/* 说明文字 */}
            <div className="mt-6 text-xs text-slate-500 text-center space-y-1">
                <p>• 使用米游社/HoYoLAB 账号登录</p>
                <p>• 账号密码不会被存储或上传</p>
                {scope === 'cn' && <p>• 国服也可以选择扫码登录</p>}
            </div>
        </div>
    );
}
