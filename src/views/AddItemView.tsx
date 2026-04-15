import { useState } from 'react';
import { Camera, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { Button, Card, Input } from '../components/ui';

export function AddItemView({ onAdd, onCancel, hasApiKey }: { 
  onAdd: (item: any) => void; 
  onCancel: () => void;
  hasApiKey: boolean;
}) {
  const [form, setForm] = useState({
    name: '',
    category: 'fridge' as 'fridge' | 'freezer',
    purchaseDate: format(new Date(), 'yyyy-MM-dd'),
    expiryDays: 7
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (form.expiryDays < 0) {
      setError('天數不可為負數');
      return;
    }
    setError(null);
    onAdd(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">新增食材</h2>
        <Button onClick={onCancel} variant="ghost" size="sm">取消</Button>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </motion.div>
      )}

      {/* AI Module Placeholder */}
      <Card className={cn(
        "p-6 border-dashed border-2 flex flex-col items-center gap-3 text-center transition-all",
        hasApiKey ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50 opacity-60"
      )}>
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          hasApiKey ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400"
        )}>
          <Camera className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className={cn("font-bold", hasApiKey ? "text-emerald-900" : "text-slate-500")}>
            {hasApiKey ? "AI 拍照辨識" : "AI 辨識已停用"}
          </p>
          <p className="text-xs text-slate-400">
            {hasApiKey ? "自動辨識食材名稱與存放建議" : "請至設定頁面輸入 API Key 以解鎖"}
          </p>
        </div>
        {hasApiKey && <Button size="sm" className="mt-2">開始掃描</Button>}
      </Card>

      <div className="space-y-4">
        <Input label="食材名稱" placeholder="例如：牛奶、雞蛋..." value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 ml-1 font-hand">存放位置</label>
            <div className="flex p-1 bg-slate-100 rounded-xl border-2 border-slate-200" style={{ borderRadius: '8px 16px 8px 16px/16px 8px 16px 8px' }}>
              <button 
                onClick={() => setForm({...form, category: 'fridge'})}
                className={cn("flex-1 py-2 rounded-lg text-lg font-bold transition-all font-hand", form.category === 'fridge' ? "bg-white shadow-sm text-emerald-600 border-2 border-emerald-100" : "text-slate-500")}
                style={{ borderRadius: '6px 12px 6px 12px/12px 6px 12px 6px' }}
              >冷藏</button>
              <button 
                onClick={() => setForm({...form, category: 'freezer'})}
                className={cn("flex-1 py-2 rounded-lg text-lg font-bold transition-all font-hand", form.category === 'freezer' ? "bg-white shadow-sm text-blue-600 border-2 border-blue-100" : "text-slate-500")}
                style={{ borderRadius: '6px 12px 6px 12px/12px 6px 12px 6px' }}
              >冷凍</button>
            </div>
          </div>
          <Input 
            label="過期天數" 
            type="number" 
            value={form.expiryDays} 
            onChange={e => {
              const val = parseInt(e.target.value) || 0;
              setForm({...form, expiryDays: val});
              if (val >= 0) setError(null);
            }} 
          />
        </div>

        <Input label="購入日期" type="date" value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} />

        <Button 
          onClick={handleSubmit} 
          className="w-full py-4 text-xl mt-4" 
          disabled={!form.name.trim()}
        >加入清單</Button>
      </div>
    </div>
  );
}
