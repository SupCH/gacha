import { useState, useEffect, useCallback } from 'react';
import { fetchQRCode, queryQRStatus, generateAuthKey, buildGachaUrl, type ScanStatus } from '../services/authService';
import { Loader2, Smartphone, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface QRScannerProps {
    onSuccess: (gachaUrl: string) => void;
    scope?: 'cn' | 'global';
    gameBiz?: string;
    region?: string;
}

export function QRScanner({
    onSuccess,
    scope = 'cn',
    gameBiz = 'hk4e_cn',
    region = 'cn_gf01'
}: QRScannerProps) {
    const [qrUrl, setQrUrl] = useState<string>('');
    const [deviceId] = useState<string>(() => {
        const stored = localStorage.getItem('mihoyo-device-id');
        if (stored) return stored;
        const newId = crypto.randomUUID();
        localStorage.setItem('mihoyo-device-id', newId);
        return newId;
    });

    const [status, setStatus] = useState<ScanStatus>('init');
    const [error, setError] = useState<string>('');
    const [pollInterval, setPollInterval] = useState<number | null>(null);

    const initQRCode = useCallback(async () => {
        setStatus('init');
        setError('');

        try {
            const data = await fetchQRCode(scope);
            setQrUrl(data.url);
            setStatus('waiting');
            startPolling(data.ticket);
        } catch (e: any) {
            setStatus('error');
            setError(e.message || '获取二维码失败');
        }
    }, [scope]);

    useEffect(() => {
        initQRCode();
        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [initQRCode]);

    const startPolling = (ticketId: string) => {
        const interval = setInterval(async () => {
            try {
                const result = await queryQRStatus(ticketId, deviceId, scope);
                setStatus(result.status);

                if (result.status === 'confirmed' && result.payload) {
                    clearInterval(interval);
                    await handleConfirmed(result.payload);
                } else if (result.status === 'expired') {
                    clearInterval(interval);
                }
            } catch (e) {
                console.error('Poll error:', e);
            }
        }, 2000);

        setPollInterval(interval as any);
    };

    const handleConfirmed = async (payload: any) => {
        try {
            const { stoken, uid } = payload;
            const authKeyData = await generateAuthKey(stoken, uid, gameBiz, region, scope);
            const gachaUrl = buildGachaUrl(authKeyData.authkey, gameBiz, region);
            onSuccess(gachaUrl);
        } catch (e: any) {
            setStatus('error');
            setError(e.message || '生成抽卡链接失败');
        }
    };

    const renderQRCode = () => {
        if (!qrUrl) return null;
        const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`;

        return (
            <div className="flex flex-col items-center gap-4">
                <img
                    src={qrCodeImageUrl}
                    alt="扫码登录"
                    className="w-48 h-48 border-4 border-indigo-100 rounded-xl"
                />
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Smartphone size={16} />
                    <span>请使用米游社 App 扫码</span>
                </div>
            </div>
        );
    };

    const renderStatus = () => {
        const statusConfig = {
            init: { icon: Loader2, text: '正在加载...', color: 'text-blue-600', spin: true },
            waiting: { icon: Smartphone, text: '等待扫码', color: 'text-indigo-600', spin: false },
            scanned: { icon: Loader2, text: '已扫码,请在手机上确认', color: 'text-orange-600', spin: true },
            confirmed: { icon: CheckCircle, text: '✅ 登录成功!', color: 'text-green-600', spin: false },
            expired: { icon: XCircle, text: '二维码已过期', color: 'text-red-600', spin: false },
            error: { icon: XCircle, text: error || '发生错误', color: 'text-red-600', spin: false }
        };

        const config = statusConfig[status as keyof typeof statusConfig];
        const Icon = config.icon;

        return (
            <div className={`flex items-center gap-2 ${config.color} font-medium`}>
                <Icon size={20} className={config.spin ? 'animate-spin' : ''} />
                <span>{config.text}</span>
            </div>
        );
    };

    return (
        <div className="bg-white p-8 rounded-3xl border shadow-lg max-w-md mx-auto">
            <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">
                {scope === 'cn' ? '国服扫码登录' : '国际服扫码登录'}
            </h3>
            <div className="mb-6 text-center">
                {renderStatus()}
            </div>
            {status === 'waiting' || status === 'scanned' ? (
                <div className="mb-6">
                    {renderQRCode()}
                </div>
            ) : null}
            {(status === 'expired' || status === 'error') && (
                <button
                    onClick={initQRCode}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition"
                >
                    <RefreshCw size={18} />
                    重新获取二维码
                </button>
            )}
            <div className="mt-6 text-xs text-slate-500 text-center space-y-1">
                <p>• 扫码后需要在手机上点击"确认"</p>
                <p>• 二维码有效期约 2 分钟</p>
                <p>• 首次使用可能需要在米游社登录</p>
            </div>
        </div>
    );
}
