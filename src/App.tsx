import { useState, useEffect, useMemo } from 'react';
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, ComposedChart, Line
} from 'recharts';
import { fetchMetadata, LOCAL_SIGNATURE_MAP } from './services/metadata';
import {
  TrendingUp, Award, BarChart2, Hash, AlertCircle, HelpCircle,
  ChevronRight, FileJson, Sparkles, BrainCircuit,
  Globe, Smartphone, Loader2, History, Link as LinkIcon, Terminal, Copy, Sigma, Key, QrCode
} from 'lucide-react';
import { QRScanner } from './components/QRScanner';
import { PasswordLogin } from './components/PasswordLogin';
import { fetchFullGachaLog, convertToUIGF } from './services/authService';

// --- 配置区 ---
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

const GAME_CONFIG = {
  hk4e: { name: '原神 (Genshin)', fiveStarRank: '5', softPity: 74, maxPity: 90, poolMap: { '100': '新手', '200': '常驻', '301': '角色活动', '400': '角色活动2', '302': '武器', '500': '集录' } },
  hkrpg: { name: '星穹铁道 (Star Rail)', fiveStarRank: '5', softPity: 74, maxPity: 90, poolMap: { '1': '常驻', '2': '新手', '11': '角色活动', '12': '光锥' } },
  nap: { name: '绝区零 (ZZZ)', fiveStarRank: '4', softPity: 74, maxPity: 90, poolMap: { '1': '常驻', '2': '独家', '3': '音擎', '5': '邦布' } }
};

const STANDARD_ITEMS_MAP: any = {
  hk4e: ['迪卢克', 'Diluc', '琴', 'Jean', '温迪', 'Venti', '莫娜', 'Mona', '七七', 'Qiqi', '刻晴', 'Keqing', '提纳里', 'Tighnari', '迪希雅', 'Dehya'],
  hkrpg: ['白露', 'Bailu', '彦卿', 'Yanqing', '姬子', 'Himeko', '瓦尔特', 'Welt', '布洛妮娅', 'Bronya', '杰帕德', 'Gepard', '克拉拉', 'Clara'],
  nap: ['猫又', 'Nekomata', '柯蕾吉', 'Koleda', '莱卡恩', 'Lycaon', '格莉丝', 'Grace', '丽娜', 'Rina', '11号', 'Soldier 11']
};

// --- 主应用组件 ---
export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('welcome'); // welcome, import, dashboard

  // 处理本地上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string || '{}');
        setData(json);
        setView('dashboard');
      } catch (err) {
        alert('JSON 解析失败,请检查文件格式');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  // 链接/扫码导入成功后的回调
  const handleImportSuccess = (uigfData: any) => {
    setData(uigfData);
    setView('dashboard');
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans selection:bg-indigo-100">
      {view === 'welcome' && (
        <WelcomeScreen onUpload={handleFileUpload} onImportMode={() => setView('import')} loading={loading} />
      )}

      {view === 'import' && (
        <ImportHub onBack={() => setView('welcome')} onSuccess={handleImportSuccess} />
      )}

      {view === 'dashboard' && data && (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight mb-2">
                让数据揭开<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">概率的真相</span>
              </h1>
              <p className="text-slate-500 font-medium text-lg">跨越欧非的界限，洞察每一次抽卡背后的数学原理。</p>
            </div>
            <button onClick={() => setView('welcome')} className="bg-white border p-3 rounded-2xl text-slate-400 hover:text-red-500 transition-colors shadow-sm">
              <History size={20} />
            </button>
          </header>
          <GachaDashboard gachaData={data} />
        </div>
      )}
    </div>
  );
}

// --- 欢迎界面组件 ---
function WelcomeScreen({ onUpload, onImportMode, loading }: { onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onImportMode: () => void; loading: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-200 max-w-2xl w-full text-center">
        <div className="bg-indigo-50 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
          <Sparkles className="text-indigo-600 w-12 h-12" />
        </div>
        <h2 className="text-4xl font-black text-slate-800 mb-4 tracking-tight">星核分析引擎</h2>
        <p className="text-slate-500 mb-12 text-lg">
          让数据揭开概率的真相。
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="cursor-pointer group">
            <div className="h-full bg-slate-50 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 p-8 rounded-[2.5rem] transition-all flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm group-hover:shadow-md transition-shadow">
                <FileJson className="text-slate-400 group-hover:text-indigo-600" size={32} />
              </div>
              <div>
                <span className="block font-bold text-slate-700">打开 UIGF 文件</span>
                <span className="text-xs text-slate-400 mt-1">支持 Starward / 寻空导出的 JSON</span>
              </div>
            </div>
            <input type="file" accept=".json" onChange={onUpload} className="hidden" />
          </label>

          <button onClick={onImportMode} className="group">
            <div className="h-full bg-indigo-600 hover:bg-indigo-700 p-8 rounded-[2.5rem] transition-all flex flex-col items-center gap-4 shadow-xl shadow-indigo-200">
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                <LinkIcon className="text-white" size={32} />
              </div>
              <div>
                <span className="block font-bold text-white">在线同步记录</span>
                <span className="text-xs text-indigo-100 mt-1">支持 国服/扫码 / 国际服/链接导入</span>
              </div>
            </div>
          </button>
        </div>

        {loading && <div className="mt-8 flex items-center justify-center gap-2 text-indigo-600 font-bold"><Loader2 className="animate-spin" /> 数据加载中...</div>}
      </div>
    </div>
  );
}

// --- 统一导入中心 ---
function ImportHub({ onBack, onSuccess }: { onBack: () => void; onSuccess: (data: any) => void }) {
  const [region, setRegion] = useState('cn'); // cn, global
  const [method, setMethod] = useState<'link' | 'qr' | 'password'>('link');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  // 国际服处理
  useEffect(() => {
    if (region === 'global' && method === 'qr') {
      setMethod('password');
    }
  }, [region]);

  const handleLoginSuccess = async (gachaUrl: string) => {
    setLoading(true);
    setLoadingMsg('登录成功！正在抓取抽卡记录...');

    try {
      const list = await fetchFullGachaLog(gachaUrl);
      if (list.length === 0) {
        throw new Error('未抓取到抽卡记录，请在游戏内打开抽卡页面后再试。');
      }

      // 简单猜测游戏类型 (基于链接)
      let game: 'hk4e' | 'hkrpg' | 'nap' = 'hk4e';
      if (gachaUrl.includes('hkrpg')) game = 'hkrpg';
      if (gachaUrl.includes('nap')) game = 'nap';

      // 提取 UID (从第一条数据)
      const uid = list[0].uid;

      const uigf = convertToUIGF(list, uid, game);
      onSuccess(uigf);
    } catch (e: any) {
      alert(e.message || '抓取抽卡记录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <button onClick={onBack} className="mb-6 text-slate-500 hover:text-indigo-600 flex items-center gap-1 text-sm font-bold">
          <ChevronRight className="rotate-180 w-4 h-4" /> 返回首页
        </button>

        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
          {/* 顶部切换栏 */}
          <div className="bg-slate-50 p-2 flex justify-center border-b border-slate-100">
            <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
              <button
                onClick={() => setRegion('cn')}
                className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${region === 'cn' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Smartphone size={16} /> 米游社 (国服)
              </button>
              <button
                onClick={() => setRegion('global')}
                className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${region === 'global' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Globe size={16} /> HoYoverse (国际服)
              </button>
            </div>
          </div>

          <div className="p-8 md:p-12 flex-1 flex flex-col">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-indigo-600 w-12 h-12" />
                <p className="text-slate-600 font-bold text-lg">{loadingMsg}</p>
                <p className="text-slate-400 text-sm">由于数据量大，通过 Worker 代理转换可能需要 10-30 秒...</p>
              </div>
            ) : (
              <>
                {/* 方式切换 */}
                <div className="flex justify-center gap-4 mb-10">
                  <MethodTab
                    active={method === 'link'}
                    onClick={() => setMethod('link')}
                    icon={LinkIcon}
                    label="链接导入"
                    sub="无需后端"
                  />
                  {region === 'cn' && (
                    <MethodTab
                      active={method === 'qr'}
                      onClick={() => setMethod('qr')}
                      icon={QrCode}
                      label="扫码登录"
                      sub="最便捷"
                    />
                  )}
                  <MethodTab
                    active={method === 'password'}
                    onClick={() => setMethod('password')}
                    icon={Key}
                    label="密码登录"
                    sub="支持全服"
                  />
                </div>

                <div className="flex-1">
                  {method === 'link' && (
                    <ManualLinkImporter region={region} onSuccess={onSuccess} />
                  )}
                  {method === 'qr' && region === 'cn' && (
                    <div className="max-w-md mx-auto">
                      <QRScanner scope="cn" onSuccess={handleLoginSuccess} />
                    </div>
                  )}
                  {method === 'password' && (
                    <div className="max-w-md mx-auto">
                      <PasswordLogin scope={region as any} onSuccess={handleLoginSuccess} />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MethodTab({ active, onClick, icon: Icon, label, sub }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-6 py-3 rounded-2xl border-2 transition-all ${active
        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
        : 'bg-white border-transparent text-slate-400 hover:bg-slate-50 hover:border-slate-200'
        }`}
    >
      <Icon size={20} className={active ? 'text-indigo-600' : 'text-slate-300'} />
      <span className="text-sm font-black">{label}</span>
      <span className="text-[10px] opacity-60 font-bold uppercase tracking-tighter">{sub}</span>
    </button>
  );
}

// --- 手动链接导入组件 ---
function ManualLinkImporter({ region }: { region: string; onSuccess: (data: any) => void }) {
  const [url, setUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async () => {
    if (!url.includes('getGachaLog')) {
      setError('链接无效。请确保链接中包含 \'getGachaLog\'。');
      return;
    }
    setParsing(true);
    setError('');

    // 模拟数据解析 (真实场景需要通过 CORS 代理或后端)
    // 这里为了演示,我们假设用户已经有了 JSON 数据,或者我们提示用户这是一个演示
    // 在真实应用中,这里会 fetch(PROXY_URL + encodeURIComponent(url))

    // 由于没有真实后端,我们这里模拟一个解析过程并给出提示
    setTimeout(() => {
      // 在没有后端的情况下,前端无法直接请求米哈游接口 (CORS)
      // 这里我们为了不让应用卡死,给出一个友好的提示,或者如果是在本地环境可以尝试 fetch
      setError('由于浏览器安全限制 (CORS),Web 端无法直接抓取链接。请使用 \'导入 UIGF JSON\' 功能,或部署配套后端服务。');
      setParsing(false);
    }, 1500);
  };

  const copyScript = () => {
    const script = region === 'cn'
      ? `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;$g=Get-Content $env:USERPROFILE\\AppDataLocalLow\\miHoYo\\Genshin Impact\\output_log.txt -ErrorAction SilentlyContinue | Select-String 'https.+getGachaLog';if($g){$g.Matches.Value[-1] | Set-Clipboard;Write-Host '链接已复制!' -Fg Green}else{Write-Host '未找到链接,请先在游戏内打开抽卡历史' -Fg Red}`
      : `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;$g=Get-Content $env:USERPROFILE\\AppDataLocalLow\\Cognosphere\\Star Rail\\Player.log -ErrorAction SilentlyContinue | Select-String 'https.+getGachaLog';if($g){$g.Matches.Value[-1] | Set-Clipboard;Write-Host 'Link Copied!' -Fg Green}else{Write-Host 'Link not found. Open Gacha History in game first.' -Fg Red}`;
    navigator.clipboard.writeText(script);
    alert('PowerShell 脚本已复制!请在 Windows PowerShell 中粘贴运行。');
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3 text-left">
        <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
        <div className="text-xs text-amber-700 leading-relaxed">
          <p className="font-bold mb-1">如何获取链接?</p>
          1. 在 PC 上打开游戏并进入 <span className="font-bold">抽卡记录</span> 页面。<br />
          2. 断开游戏内的网络或直接切回桌面。<br />
          3. 运行下方的 PowerShell 脚本自动获取链接。<br />
          <span className="opacity-70 mt-1 block"> 国际服 (HoYoverse) 不支持扫码,必须使用此方法。</span>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl p-4 relative group">
        <button
          onClick={copyScript}
          className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white text-xs px-2 py-1 rounded transition-colors flex items-center gap-1"
        >
          <Copy size={12} /> 复制脚本
        </button>
        <div className="flex items-center gap-2 text-slate-400 text-xs font-mono mb-2 border-b border-slate-700 pb-2">
          <Terminal size={14} /> PowerShell
        </div>
        <code className="text-green-400 font-mono text-xs break-all line-clamp-3">
          {region === 'cn' ? '# 自动获取国服链接脚本...' : '# Auto fetch Global link script...'}
        </code>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">在此处粘贴抽卡链接</label>
        <textarea
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://hk4e-api.mihoyo.com/event/gacha_info/api/getGachaLog..."
          className="w-full h-32 p-4 bg-white border border-slate-200 rounded-2xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-500 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={parsing || !url}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
      >
        {parsing ? <Loader2 className="animate-spin" /> : <LinkIcon size={18} />}
        {parsing ? '正在解析...' : '解析链接并导入'}
      </button>
    </div>
  );
}


// --- 辅助图标 ---
const UnpluggedIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m19 5-3 3" /><path d="m2 22 3-3" /><path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z" /><path d="M7.5 13.5 10 11" /><path d="M10.5 16.5 13 14" /><path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z" /></svg>
);

// --- 统计看板组件 (保持不变) ---
function GachaDashboard({ gachaData }: { gachaData: any }) {
  const [activeGame, setActiveGame] = useState('hk4e');
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [metadata, setMetadata] = useState<any>(LOCAL_SIGNATURE_MAP);

  useEffect(() => {
    fetchMetadata().then(setMetadata);
  }, []);

  // 1. 数据标准化与多维度解析
  const allGamesData = useMemo(() => {
    let normalized = gachaData;
    // 支持 UIGF v3.0 (Starward 等)
    if (gachaData.info && gachaData.list && Array.isArray(gachaData.list)) {
      normalized = { 'hk4e': [{ uid: gachaData.info.uid, list: gachaData.list }] };
    }

    const games: any = {};
    Object.keys(GAME_CONFIG).forEach(gameKey => {
      const accounts = normalized[gameKey];
      if (!Array.isArray(accounts)) return;

      games[gameKey] = accounts.map(acc => {
        const config = (GAME_CONFIG as any)[gameKey];
        const list = [...(acc.list || [])].sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());

        const poolsMap: any = {};
        let totalPulls = 0;
        let totalGold = 0;
        const pityFreq = Array(91).fill(0);

        list.forEach(item => {
          const uigfType = item.uigf_gacha_type || item.gacha_type;
          const pName = config.poolMap[uigfType] || '其他';
          if (!poolsMap[pName]) {
            poolsMap[pName] = { name: pName, total: 0, fiveStars: [], lastIdx: -1, currentPity: 0 };
          }

          poolsMap[pName].total++;
          totalPulls++;

          if (String(item.rank_type) === config.fiveStarRank) {
            const p = poolsMap[pName].total - poolsMap[pName].lastIdx - 1;
            poolsMap[pName].fiveStars.push({ name: item.name, pity: p, time: item.time });
            totalGold++;
            pityFreq[p]++;
            poolsMap[pName].lastIdx = poolsMap[pName].total - 1;
          }
        });

        // 计算当前水位
        Object.values(poolsMap).forEach((p: any) => {
          p.currentPity = p.total - p.lastIdx - 1;
        });

        return {
          uid: acc.uid,
          totalPulls,
          totalGold,
          avgPity: totalGold > 0 ? (totalPulls / totalGold).toFixed(2) : '0',
          pools: Object.values(poolsMap),
          pityFreq
        };
      });
    });
    return games;
  }, [gachaData]);

  // 当游戏改变时,默认选中该游戏的第一个账号
  useEffect(() => {
    const accounts = allGamesData[activeGame];
    if (accounts && accounts.length > 0) {
      if (!activeUid || !accounts.find((a: any) => a.uid === activeUid)) {
        setActiveUid(accounts[0].uid);
      }
    } else {
      setActiveUid(null);
    }
  }, [activeGame, allGamesData]);

  const currentAccount = useMemo(() => {
    const accounts = allGamesData[activeGame];
    return accounts?.find((a: any) => a.uid === activeUid) || null;
  }, [allGamesData, activeGame, activeUid]);


  const askDeepSeek = async () => {
    if (!currentAccount || !currentAccount.totalGold) {
      alert('数据不足,无法生成 AI 鉴定报告');
      return;
    }
    setAiReport('');
    setIsAiLoading(true);

    // 准备高级提示词数据
    const config = (GAME_CONFIG as any)[activeGame];
    const avgPity = Number(currentAccount.avgPity);
    const luckScore = (62.5 / avgPity * 100).toFixed(0);
    const recentGolds = currentAccount.pools
      .flatMap((p: any) => p.fiveStars)
      .sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5);

    // 计算进阶统计
    let earlyPulls = 0;
    let latePulls = 0;
    const standardItems = STANDARD_ITEMS_MAP[activeGame] || [];
    let lost5050Count = 0;
    const lostItems: string[] = [];
    const itemCounts: any = {};

    currentAccount.pools.forEach((p: any) => {
      // 检查是否是限定池
      const poolMap = (GAME_CONFIG as any)[activeGame].poolMap;
      const isLimitedPool = ['301', '400', '11', '12', '2', '3'].some(k => p.name.includes(poolMap[k]));
      // 检查是否是绝区零邦布 (邦布不计入高练度展示)
      const isBangboo = activeGame === 'nap' && p.name.includes('邦布');

      p.fiveStars.forEach((f: any) => {
        if (f.pity <= 10) earlyPulls++;
        if (f.pity >= 80) latePulls++;

        // 统计持有数 (练度) - 排除邦布
        if (!isBangboo) {
          itemCounts[f.name] = (itemCounts[f.name] || 0) + 1;
        }

        // 统计歪 (在限定池出了常驻)
        if (isLimitedPool && standardItems.some((s: string) => f.name.includes(s))) {
          lost5050Count++;
          lostItems.push(f.name);
        }
      });
    });



    // 格式化练度数据 (X+Y)
    // 使用元数据检索专武
    const gameMeta = metadata[activeGame] || {};

    // 筛选出所有角色
    const proficiencyList: string[] = [];
    Object.entries(itemCounts).forEach(([name, count]: [string, any]) => {
      // 简单判断：如果名字在元数据key中，或者是已知角色（这里假设大部分itemCounts里的高频词是角色，或者通过StandardMap辅助）
      // 更准确的是：遍历itemCounts，如果是角色（在metadata中有记录或者是常驻名单），则计算。
      // 由于metadata可能不全，我们主要针对metadata里有的角色计算专武。
      // 对于没有专武数据的角色，只能显示 X+?

      // 排除邦布(已在上方逻辑排除计入itemCounts)，但需排除光锥/武器混入itemCounts (itemCounts统计了所有5星)
      // 我们需要知道哪些是角色。目前itemCounts包含所有5星。
      // 假设 metadata 的 keys 都是角色名。

      // 尝试匹配专武
      const signatureWeapons = gameMeta[name];
      let weaponCount = 0;
      let hasSignatureData = false;

      if (signatureWeapons && Array.isArray(signatureWeapons)) {
        hasSignatureData = true;
        signatureWeapons.forEach(wName => {
          if (itemCounts[wName]) {
            weaponCount += itemCounts[wName];
          }
        });
      }

      // 判断是否为角色：
      // 1. 在 metadata 的 keys 中 (有专武配置的角色)
      // 2. 在 STANDARD_ITEMS_MAP 中 (常驻角色)
      // 注意: 不能仅通过 signatureWeapons 存在来判断，因为 name 可能是武器名
      const isCharacterInMeta = Object.prototype.hasOwnProperty.call(gameMeta, name);
      const isStandardCharacter = (STANDARD_ITEMS_MAP[activeGame] || []).includes(name);
      const isKnownCharacter = isCharacterInMeta || isStandardCharacter;

      // 只有当是角色时才列出 (假设count > 1或者是限定角色)
      // 逻辑：如果 count > 1 (有命座)，或者 count > 0 且有专武 (xp党)，都列出。
      // 用户需求："2+0" 表示 2只角色(1命) + 0 专武。

      if (count > 0 && isKnownCharacter) {
        const charCons = count - 1;

        // 判断显示条件:
        // 1. 有命座 (charCons > 0)
        // 2. 无命座但有专武 (charCons == 0 && weaponCount > 0)
        if (charCons > 0 || weaponCount > 0) {
          // 如果有专武数据且抽到了 -> 显示数字
          // 如果有专武数据但没抽到 -> 显示 0 (响应用户 "2+0" 的需求)
          // 如果没专武数据 -> 显示 0
          const weaponPart = (hasSignatureData && weaponCount > 0) ? weaponCount : 0;
          proficiencyList.push(`${name}: ${charCons}+${weaponPart}`);
        }
      }
    });

    const highProficiency = proficiencyList.join('\n');

    // 统计歪的最多的角色
    const lostCounts: any = {};
    lostItems.forEach(i => lostCounts[i] = (lostCounts[i] || 0) + 1);
    const mostLost = Object.entries(lostCounts).sort((a: any, b: any) => b[1] - a[1])[0];

    const systemPrompt = `你是一个精通《原神》（称呼用户为旅行者）、《星穹铁道》（称呼用户为开拓者）和《绝区零》（称呼用户为绳匠）的资深数据分析官，也是一个幽默的二次元老玩家。你的任务是根据用户提供的抽卡数据，生成一份极具个性的“欧气鉴定报告”。

### 核心规则
1. **输出格式**：请以纯文本格式输出，严禁包含任何 Markdown 语法符号。使用换行分隔。
2. **语气基调** (基础模式)：
   - 平均出金 < 50：极度震惊和羡慕，称呼用户为“欧皇”、“天选之子”，开玩笑说要“举报”。
   - 平均出金 60-70：保持专业冷静，肯定用户的稳健，称之为“平衡大师”。
   - 平均出金 > 75：深切同情和温柔安慰，称之为“非酋领袖”、“保底守门员”，并提供无厘头的“玄学改运建议”。
3. **特殊模式触发**：
   - **高练度与专武嘲讽**：
     - **“裸奔”识别**：如果数据是 '[角色]: X+0' (意为只有角色无专武)，请转译为“X命”或“X魂”。**必须开启嘲讽模式**！揶揄用户“抽了命座不给专武？”，“是预算不够了吗？”，“把专武歪没了？”等(意为只有角色无专武,0表示没有专武)。
     - **“毕业”识别**：如果数据是 'X+1' 或更高 (如 '2+1', '6+5')，使用数字俚语 "X+Y" 格式，并用“股东”、“顶级赞助商”等词汇表达敬畏。
     - **邦布过滤**：绝区零的“邦布”是宠物，忽略其练度。
   - **歪卡嘲讽模式**：如果“限定池歪掉次数”较多，请开启嘲讽模式，授予“常驻池领跑员”、“白露/七七接班人”等称号；或用概率论强行解释安慰。

### 报告结构
欧气评级：
练度与歪卡解读：(针对高练度或歪卡情况进行犀利点评，若无则跳过)
数据深度解析：
近期运势预测：
玄学建议：
篇幅：300字以内，适当使用 emoji，禁止使用 Markdown 标记。通过概率论与大数定律的角度安抚或激励用户。`;

    const userPayload = `请分析以下抽卡样本并生成鉴定报告：
核心统计数据：
- 账号所属游戏：${config.name}
- 累计抽数：${currentAccount.totalPulls}
- 五星产出总数：${currentAccount.totalGold}
- 实际平均出金抽数：${avgPity} (理论期望值 62.5)
- 运气指数：${luckScore} 分

高练度角色 (X为重复获取数)：
${highProficiency || '无高练度角色'}

常驻统计 (歪卡情况)：
- 限定池歪掉总次数：${lost5050Count}
- 最常歪的角色：${mostLost ? `${mostLost[0]} (${mostLost[1]}次)` : '无'}

最近出金记录：
${recentGolds.map((f: any) => `- ${f.name} (${f.pity}抽)`).join('\n')}

特殊观察：
- 10抽内早出的次数：${earlyPulls}
- 触发硬保底(80+)的次数：${latePulls}`;

    try {
      const res = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPayload }
          ],
          stream: false
        })
      });
      const json = await res.json();
      setAiReport(json.choices[0].message.content);
    } catch (e) { setAiReport('DeepSeek 响应异常，请检查 API 额度或网络连接。'); } finally { setIsAiLoading(false); }
  };

  // 计算概率测算与排名
  const analytics = useMemo(() => {
    if (!currentAccount) return null;
    const avg = Number(currentAccount.avgPity);
    // 理论欧气排名 (简单模型)
    const luckRank = avg < 40 ? 99 : avg < 50 ? 90 : avg < 62.5 ? 60 : avg < 70 ? 30 : 5;

    // 饼图数据
    const pieData = currentAccount.pools.map((p: any) => ({
      name: p.name,
      value: p.total
    }));

    // 计算统计指标 (方差, 标准差)
    const pityValues = currentAccount.pools.flatMap((p: any) => p.fiveStars.map((f: any) => f.pity));
    let variance = 0;
    let stdDev = 0;
    if (pityValues.length > 0) {
      const mean = pityValues.reduce((a: number, b: number) => a + b, 0) / pityValues.length;
      variance = pityValues.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / pityValues.length;
      stdDev = Math.sqrt(variance);
    }

    // 计算区间阶梯趋势数据 (Interval Step Line)
    // 区间定义: 1-10 (欧皇), 11-73 (平稳), 74-90 (保底)
    const intervals = [
      { start: 1, end: 10, totalPulls: 0, totalCount: 0, avg: 0 },
      { start: 11, end: 73, totalPulls: 0, totalCount: 0, avg: 0 },
      { start: 74, end: 90, totalPulls: 0, totalCount: 0, avg: 0 }
    ];

    // 第一步：统计各区间的总次数
    currentAccount.pityFreq.forEach((count: number, pity: number) => {
      const interval = intervals.find(i => pity >= i.start && pity <= i.end);
      if (interval) {
        interval.totalCount += count;
        interval.totalPulls += 1; // 这是一个pity点
      }
    });

    // 第二步：计算平均密度 (总次数 / 区间长度) - 用于展示"平均水平"
    intervals.forEach(i => {
      // 避免除以零导致 NaN
      i.avg = i.totalCount > 0 ? i.totalCount / (i.end - i.start + 1) : 0;
    });

    const intervalChartData = currentAccount.pityFreq.map((count: number, pity: number) => {
      const interval = intervals.find(i => pity >= i.start && pity <= i.end);

      // 仅在区间中心点设置趋势值，实现"折线"连接效果
      // 1-10 (center 5), 11-73 (center ~42), 74-90 (center ~82)
      let trendValue = null;
      if (pity === 5 && interval) trendValue = interval.avg;
      if (pity === 42 && interval) trendValue = interval.avg;
      if (pity === 82 && interval) trendValue = interval.avg;

      return {
        pity,
        count,
        trend: trendValue
      };
    }).slice(1, 91);

    return {
      luckRank,
      predictions: [10, 30, 60].map(n => ({
        pulls: n,
        prob: Math.min(99.9, n * 1.5).toFixed(1)
      })),
      pieData,
      stats: {
        variance: variance.toFixed(2),
        stdDev: stdDev.toFixed(2)
      },
      intervalChartData
    };
  }, [currentAccount]);

  if (!currentAccount && activeUid) return <div className="p-12 text-center text-slate-400">数据加载中...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. 游戏与账号选择器 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-[2rem] border shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          {Object.entries(GAME_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setActiveGame(key)}
              disabled={!allGamesData[key]}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeGame === key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 disabled:opacity-30'
                }`}
            >
              {config.name.split(' ')[0]}
            </button>
          ))}
        </div>

        {allGamesData[activeGame] && (activeUid !== null) && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">账号:</span>
            <select
              value={activeUid || ''}
              onChange={(e) => setActiveUid(e.target.value)}
              className="bg-slate-100 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              {allGamesData[activeGame].map((acc: any) => (
                <option key={acc.uid} value={acc.uid}>UID: {acc.uid}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!currentAccount ? (
        <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-200">
          <FileJson size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-bold">该游戏下暂无已导入的数据</p>
        </div>
      ) : (
        <>
          {/* 2. 统计概览 */}
          {/* 2. 概率概览与实验室 */}
          <div className="space-y-4">
            {/* 概率实验室 - 紧凑横条 */}
            <div className="bg-indigo-50/80 rounded-[2rem] p-5 border border-indigo-100 flex flex-col md:flex-row gap-6 items-center">
              <div className="flex items-center gap-4 min-w-[180px]">
                <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600"><Sigma size={24} /></div>
                <div>
                  <h3 className="font-bold text-indigo-900 leading-tight">概率实验室</h3>
                  <p className="text-[10px] text-indigo-600/70 font-bold uppercase tracking-wider">Probability Lab</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                <div className="bg-white/60 p-3 rounded-2xl text-xs text-indigo-900 border border-indigo-50/50">
                  <strong className="block mb-0.5 font-black">E(X) 期望值</strong>
                  <span className="opacity-70 leading-relaxed scale-90 block origin-top-left">理论平均出金为 62.5 抽。低于此值即为"欧"。</span>
                </div>
                <div className="bg-white/60 p-3 rounded-2xl text-xs text-indigo-900 border border-indigo-50/50">
                  <strong className="block mb-0.5 font-black">Var(X) 方差</strong>
                  <span className="opacity-70 leading-relaxed scale-90 block origin-top-left">衡量体验波动。数值越小，出金越稳定。</span>
                </div>
                <div className="bg-white/60 p-3 rounded-2xl text-xs text-indigo-900 border border-indigo-50/50">
                  <strong className="block mb-0.5 font-black">软保底机制</strong>
                  <span className="opacity-70 leading-relaxed scale-90 block origin-top-left">74 抽起概率激增，每抽提升约 6%。</span>
                </div>
              </div>
            </div>

            {/* 核心指标 - 紧凑 4 列 Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="总抽卡数"
                value={currentAccount.totalPulls}
                subValue={`共出金 ${currentAccount.totalGold} 次`}
                color="bg-blue-600"
                icon={Hash}
              />
              <StatCard
                title="累计五星"
                value={currentAccount.totalGold}
                subValue={`平均 ${currentAccount.avgPity} 抽/金`}
                color="bg-amber-500"
                icon={Award}
              />
              <StatCard
                title="平均出金"
                value={currentAccount.avgPity}
                subValue="理论值 62.5"
                color="bg-emerald-600"
                icon={TrendingUp}
                tooltip="平均出金越低越好。计算公式：总抽数 / 五星总数。"
              />
              <StatCard
                title="运气指数"
                value={currentAccount.totalGold > 0 ? (62.5 / Number(currentAccount.avgPity) * 100).toFixed(0) : '0'}
                subValue="基于期望值加权"
                color="bg-indigo-600"
                icon={Sparkles}
                tooltip="运气指数 = (62.5 / 实际平均抽数) * 100。>100分即超越理论期望。"
              />
            </div>
          </div>

          {/* 3. 卡池明细 - 响应式紧凑布局 (原神/崩铁5卡池优化为3列布局) */}
          <div className={`grid gap-4 ${['hk4e', 'hkrpg'].includes(activeGame) ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
            {currentAccount.pools.map((pool: any) => (
              <PoolCard key={pool.name} pool={pool} config={(GAME_CONFIG as any)[activeGame]} />
            ))}
          </div>

          {/* 4. 概率深度解析 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col justify-center gap-6">
              <div>
                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><BarChart2 size={18} className="text-indigo-600" /> 概率学解读</h3>
                <p className="text-xs text-slate-400">基于当前水位与历史数据的测算</p>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">欧气超越了</p>
                  <p className="text-3xl font-black text-indigo-600">{analytics?.luckRank}% <span className="text-sm font-medium">玩家</span></p>
                </div>
                <div className="bg-white p-3 rounded-2xl shadow-sm">
                  <TrendingUp className="text-indigo-600" />
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase border-b pb-2">未来出金概率预测</p>
                <div className="grid grid-cols-3 gap-2">
                  {analytics?.predictions.map(p => (
                    <div key={p.pulls} className="bg-slate-50 p-3 rounded-2xl text-center border border-slate-50">
                      <p className="text-[9px] text-slate-400 font-bold">{p.pulls}抽内</p>
                      <p className="text-sm font-black text-slate-700">{p.prob}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col">
              <div className="relative z-10 flex-1">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2"><BrainCircuit className="text-indigo-400" /> DeepSeek AI 鉴定报告</h2>
                  <div className="flex gap-2">
                    {aiReport && (
                      <button onClick={askDeepSeek} disabled={isAiLoading} className="text-[10px] font-bold bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full border border-white/10 transition-colors flex items-center gap-1">
                        <History size={10} /> 重新检测
                      </button>
                    )}
                    <div className="bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30 text-[10px] font-bold text-indigo-300">Models: DeepSeek-V3</div>
                  </div>
                </div>

                {aiReport ? (
                  <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 text-sm leading-relaxed whitespace-pre-wrap h-[260px] overflow-y-auto thin-scrollbar">
                    {aiReport}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[260px] gap-6 text-center">
                    <div className="space-y-2 opacity-50">
                      <div className="bg-white/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Sparkles size={40} className="text-indigo-300" />
                      </div>
                      <p className="text-xs">DeepSeek 正在待命，准备全方位评估你的非气指数</p>
                    </div>
                    <button onClick={askDeepSeek} disabled={isAiLoading} className="bg-white text-indigo-900 hover:bg-indigo-50 px-10 py-4 rounded-2xl font-black flex items-center gap-3 transition-all transform hover:scale-105 disabled:opacity-50">
                      {isAiLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                      {isAiLoading ? '逻辑推理中...' : '生成 DeepSeek 深度报告'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 5. 抽数直方图 (Combo Chart with Stats) */}
            <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
                <div>
                  <h3 className="font-black text-slate-800 text-2xl flex items-center gap-2">抽数分布概率直方图</h3>
                  <div className="flex gap-8 mt-4">
                    {/* 平均值 */}
                    <div className="flex flex-col items-start gap-1 group relative">
                      <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                        平均值 <HelpCircle size={10} className="text-slate-300" />
                      </p>
                      <span className="text-2xl font-black text-slate-800 leading-none">{Number(currentAccount.avgPity).toFixed(2)}</span>
                      <div className="absolute left-0 bottom-full mb-2 bg-slate-800 text-white text-xs p-2 rounded-lg w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                        平均出金抽数 E(X)。理论期望值为 62.5。低于此值说明整体运势较好。
                      </div>
                    </div>

                    {/* 方差 */}
                    <div className="flex flex-col items-start gap-1 group relative">
                      <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                        方差 <HelpCircle size={10} className="text-slate-300" />
                      </p>
                      <span className="text-2xl font-black text-slate-800 leading-none">{analytics?.stats.variance}</span>
                      <div className="absolute left-0 bottom-full mb-2 bg-slate-800 text-white text-xs p-2 rounded-lg w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                        方差 Var(X)：衡量抽卡体验的波动。数值越小，体验越稳定（接近62.5抽）；数值越大，越容易出现'欧非两极分化'。
                      </div>
                    </div>

                    {/* 标准差 */}
                    <div className="flex flex-col items-start gap-1 group relative">
                      <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                        标准差 <HelpCircle size={10} className="text-slate-300" />
                      </p>
                      <span className="text-2xl font-black text-slate-800 leading-none">{analytics?.stats.stdDev}</span>
                      <div className="absolute left-0 bottom-full mb-2 bg-slate-800 text-white text-xs p-2 rounded-lg w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                        标准差 σ：方差的平方根。约68%的抽卡会落在 (均值 ± 标准差) 的区间内。
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  {[
                    { label: '原始分布', color: 'bg-indigo-500' },
                    { label: '趋势折线', color: 'bg-yellow-400' }
                  ].map(t => (
                    <div key={t.label} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                      <div className={`w-2.5 h-2.5 rounded-full ${t.color}`} /> {t.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-[400px] w-full">
                <ResponsiveContainer>
                  <ComposedChart data={analytics?.intervalChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="pity" fontSize={11} fontWeight="bold" stroke="#cbd5e1" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                    <YAxis fontSize={11} fontWeight="bold" stroke="#cbd5e1" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9', radius: 10 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const count = payload[0].value as number;
                          const trend = payload[1]?.value as number;
                          const pity = payload[0].payload.pity;
                          const percent = ((count / (currentAccount?.totalGold || 1)) * 100).toFixed(1);
                          return (
                            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-white/10 min-w-[140px]">
                              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{pity} 抽处出金</p>
                              <div className="space-y-1">
                                <p className="text-xl font-black">{count} 次 <span className="text-xs opacity-50">({percent}%)</span></p>
                                {trend !== null && !isNaN(Number(trend)) && Number(trend) > 0 && (
                                  <p className="text-[10px] text-yellow-300 font-bold uppercase">趋势锚点: {Number(trend).toFixed(2)}</p>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={20}>
                      {analytics?.intervalChartData.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.pity >= 74 ? '#ef4444' : entry.pity <= 10 ? '#10b981' : 'url(#barGradient)'}
                        />
                      ))}
                    </Bar>
                    <Line type="linear" connectNulls={true} dataKey="trend" stroke="#facc15" strokeWidth={4} dot={{ r: 4, fill: '#facc15', strokeWidth: 2, stroke: '#fff' }} animationDuration={1500} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 6. 卡池分布饼图 */}
            <div className="lg:col-span-1 bg-white p-10 rounded-[3rem] border shadow-sm flex flex-col items-center">
              <h3 className="font-black text-slate-800 text-xl mb-8 flex items-center gap-2 self-start">卡池投入占比饼图</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={analytics?.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {analytics?.pieData.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 w-full">
                {analytics?.pieData.map((entry: any, index: number) => (
                  <div key={entry.name} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444'][index % 4] }} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase truncate">{entry.name}</span>
                    </div>
                    <p className="text-sm font-black text-slate-700 pl-4">{entry.value} 抽</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PoolCard({ pool, config }: { pool: any; config: any }) {
  const pityPercent = Math.min(100, (pool.currentPity / config.maxPity) * 100);
  const isSoftPity = pool.currentPity >= config.softPity;

  return (
    <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
      <div className="p-6 border-b border-slate-50">
        <div className="flex justify-between items-start mb-4">
          <h4 className="font-black text-slate-800 text-lg">{pool.name}</h4>
          <span className="bg-slate-100 text-slate-400 text-[10px] px-2 py-1 rounded-lg font-bold">总 {pool.total} 抽</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <p className="text-xs font-bold text-slate-400 uppercase">当前保底水位</p>
            <p className={`text-2xl font-black ${isSoftPity ? 'text-orange-500' : 'text-indigo-600'}`}>
              {pool.currentPity} <span className="text-sm opacity-30">/ {config.maxPity}</span>
            </p>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-out rounded-full ${isSoftPity ? 'bg-orange-500' : 'bg-indigo-600'}`}
              style={{ width: `${pityPercent}%` }}
            />
          </div>
          {isSoftPity && <p className="text-[10px] text-orange-500 font-bold flex items-center gap-1"><AlertCircle size={10} /> 已进入软保底区间!</p>}
        </div>
      </div>

      <div className="flex-1 p-6 bg-slate-50/50">
        <p className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">出金历史 (最近 {pool.fiveStars.length} 次)</p>
        <div className="space-y-3 max-h-[160px] overflow-y-auto thin-scrollbar pr-2">
          {pool.fiveStars.length === 0 ? (
            <p className="text-center text-slate-300 text-xs py-8 font-medium">暂无出金记录</p>
          ) : (
            pool.fiveStars.slice().reverse().map((g: any, i: number) => (
              <div key={i} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${g.pity <= 10 ? 'bg-emerald-500' : g.pity >= 74 ? 'bg-orange-400' : 'bg-indigo-400'}`} />
                  <div>
                    <p className="text-sm font-bold text-slate-700">{g.name}</p>
                    <p className="text-[9px] text-slate-400 font-mono">{g.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-black ${g.pity <= 10 ? 'text-emerald-500' : g.pity >= 74 ? 'text-orange-500' : 'text-slate-600'}`}>{g.pity} 抽</p>
                  <p className="text-[9px] text-slate-300 uppercase font-black">{g.pity <= 10 ? '欧' : g.pity >= 74 ? '非' : '稳'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ title, value, color, icon: Icon, tooltip, subValue }: { title: string; value: number | string; color: string; icon: any; tooltip?: string; subValue?: string }) => (
  <div className="bg-white p-5 rounded-[2rem] border shadow-sm flex items-center gap-4 hover:scale-[1.02] transition-transform group relative">
    <div className={`${color} p-3 rounded-2xl text-white shadow-lg shadow-current/20`}><Icon size={20} /></div>
    <div>
      <div className="flex items-center gap-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        {tooltip && (
          <div className="group/tooltip relative">
            <HelpCircle size={12} className="text-slate-300 cursor-help" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-slate-800 text-white text-xs p-2 rounded-lg w-48 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-slate-800 leading-tight">{value}</p>
      {subValue && <p className="text-[10px] text-slate-400 font-bold mt-0.5">{subValue}</p>}
    </div>
  </div>
);
