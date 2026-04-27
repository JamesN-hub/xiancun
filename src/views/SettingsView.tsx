import { useState } from 'react';
import { Share2, AlertTriangle, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button, Card, Input } from '../components/ui';
import { Family } from '../types';

export function SettingsView({ family, apiKey, onSaveApiKey, onLogout, onLeaveFamily, isOwner }: { 
  family: Family; 
  apiKey: string; 
  onSaveApiKey: (key: string) => void;
  onLogout: () => void;
  onLeaveFamily: () => void;
  isOwner: boolean;
}) {
  const [tempKey, setTempKey] = useState(apiKey);
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-8 pb-12">
      <h2 className="text-3xl font-bold text-slate-900 font-hand">設定</h2>

      <section className="space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-hand">家庭資訊</h3>
        <Card className="p-6 space-y-4 border-2 border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-hand">家庭名稱</p>
              <p className="text-xl font-bold text-slate-900 font-hand">{family.name}</p>
            </div>
            <Share2 className="w-6 h-6 text-slate-400" />
          </div>
          <div className="pt-4 border-t-2 border-slate-100">
            <p className="text-sm text-slate-500 mb-2 font-hand">家庭邀請碼 (點擊複製)</p>
            <code 
              onClick={() => {
                navigator.clipboard.writeText(family.id);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="block w-full p-4 bg-slate-50 rounded-xl text-xs font-mono text-slate-600 break-all cursor-pointer hover:bg-slate-100 transition-colors border-2 border-slate-200"
              style={{ borderRadius: '8px 16px 8px 16px/16px 8px 16px 8px' }}
            >
              {family.id}
            </code>
            {copied && <p className="text-xs text-emerald-600 mt-2 font-bold font-hand">已複製到剪貼簿！</p>}
          </div>
          <div className="pt-4 mt-2">
            <Button onClick={onLeaveFamily} variant="danger" className="w-full py-2">
              退出這家庭
            </Button>
            {isOwner && (
              <p className="text-xs text-slate-400 text-center font-hand mt-2">您是這個家庭的建立者</p>
            )}
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-hand">AI 模組設定</h3>
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border-2",
            apiKey ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"
          )}>
            {apiKey ? "已啟用" : "未設定"}
          </span>
        </div>
        <Card className="p-6 space-y-4 border-2 border-slate-200">
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border-2 border-amber-100" style={{ borderRadius: '12px 24px 12px 24px/24px 12px 24px 12px' }}>
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 leading-relaxed font-hand">
              請輸入您的 Claude 或 OpenAI API Key。此金鑰將僅儲存於您的瀏覽器本地，不會上傳至我們的伺服器。
            </p>
          </div>
          <div className="space-y-4">
            <Input 
              type="password" 
              placeholder="sk-..." 
              value={tempKey} 
              onChange={e => setTempKey(e.target.value)} 
              label="API Key"
            />
            <Button 
              onClick={() => onSaveApiKey(tempKey)} 
              className="w-full py-3 text-lg" 
              variant={tempKey === apiKey ? 'outline' : 'primary'}
              disabled={tempKey === apiKey}
            >
              {tempKey === apiKey ? '已儲存' : '儲存設定'}
            </Button>
          </div>
        </Card>
      </section>

      <section className="pt-4">
        <Button onClick={onLogout} variant="danger" className="w-full gap-2 py-4 text-xl">
          <LogOut className="w-6 h-6" /> 登出帳號
        </Button>
      </section>
    </div>
  );
}
