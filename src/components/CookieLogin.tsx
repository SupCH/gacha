import { useState } from 'react';
import { ExternalLink, CheckCircle2, HelpCircle } from 'lucide-react';

const width = 500;
const height = 700;
const left = (screen.width - width) / 2;
const top = (screen.height - height) / 2;

window.open(
    loginUrl,
    `${scope === 'global' ? 'HoYoverse' : '米游社'}登录`,

    setStep(3);
                >
    返回重新登录
                </button >
            </div >
        )}

{/* Step 3: 成功 */ }
{
    step === 3 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
            <CheckCircle2 className="mx-auto text-green-600" size={48} />
            <div className="text-green-700 font-medium">登录成功！</div>
            import {useState} from 'react';
            import {ExternalLink, CheckCircle2, HelpCircle} from 'lucide-react';

            const width = 500;
            const height = 700;
            const left = (screen.width - width) / 2;
            const top = (screen.height - height) / 2;

            window.open(
            loginUrl,
            `${scope === 'global' ? 'HoYoverse' : '米游社'}登录`,

            setStep(3);
                >
            返回重新登录
        </button >
            </div >
        )
}

{/* Step 3: 成功 */ }
{
    step === 3 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
            <CheckCircle2 className="mx-auto text-green-600" size={48} />
            <div className="text-green-700 font-medium">登录成功！</div>
            <div className="text-sm text-green-600">正在获取抽卡记录...</div>
        </div>
    )
}

{
    step === 1 && (
        <div className="text-xs text-gray-500 space-y-1">
            <p>• 使用官方登录页面，安全可靠</p>
            <p>• 分别复制两个字段，简单明了</p>
            <p>• Cookie 仅用于本次会话</p>
        </div>
    )
}
    </div >
);
}
