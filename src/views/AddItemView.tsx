import { useState, useMemo } from 'react';
import { Camera, AlertCircle, CalendarDays } from 'lucide-react';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Button, Card, Input } from '../components/ui';

export function AddItemView({ onAdd, onCancel, hasApiKey }: {
  onAdd: (item: any) => void;
  onCancel: () => void;
  hasApiKey: boolean;
}) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const [form, setForm] = useState({
    name: '',
    category: 'fridge' as 'fridge' | 'freezer',
    purchaseDate: today,
    expiryDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
  });
  const [icon, setIcon] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const expiryDays = useMemo(
    () => differenceInDays(parseISO(form.expiryDate), parseISO(form.purchaseDate)),
    [form.expiryDate, form.purchaseDate]
  );

  const handleSubmit = () => {
    if (expiryDays < 0) {
      setError('有效期限不能早於購入日期');
      return;
    }
    setError(null);
    onAdd({ name: form.name, category: form.category, purchaseDate: form.purchaseDate, expiryDays, icon });
  };

  const commonEmojis = ['🍎', '🥩', '🥦', '🥛', '🍞', '🥚', '🐟', '🧀', '🥬', '🍉', '🍗', '🥕'];

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
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1 font-hand">選擇圖標 (選填)</label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setIcon('')}
              className={cn(
                "w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-sm transition-all border-2",
                icon === '' ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
              )}
              style={{ borderRadius: '8px 12px 8px 12px/12px 8px 12px 8px' }}
            >
              無
            </button>
            {commonEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => setIcon(emoji)}
                className={cn(
                  "w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-xl transition-all border-2",
                  icon === emoji ? "bg-emerald-50 border-emerald-300 scale-110" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                )}
                style={{ borderRadius: '8px 12px 8px 12px/12px 8px 12px 8px' }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="食材名稱"
          placeholder="例如：牛奶、雞蛋..."
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 ml-1 font-hand">存放位置</label>
            <div className="flex p-1 bg-slate-100 rounded-xl border-2 border-slate-200" style={{ borderRadius: '8px 16px 8px 16px/16px 8px 16px 8px' }}>
              <button
                onClick={() => setForm({ ...form, category: 'fridge' })}
                className={cn("flex-1 py-2 rounded-lg text-lg font-bold transition-all font-hand", form.category === 'fridge' ? "bg-white shadow-sm text-emerald-600 border-2 border-emerald-100" : "text-slate-500")}
                style={{ borderRadius: '6px 12px 6px 12px/12px 6px 12px 6px' }}
              >冷藏</button>
              <button
                onClick={() => setForm({ ...form, category: 'freezer' })}
                className={cn("flex-1 py-2 rounded-lg text-lg font-bold transition-all font-hand", form.category === 'freezer' ? "bg-white shadow-sm text-blue-600 border-2 border-blue-100" : "text-slate-500")}
                style={{ borderRadius: '6px 12px 6px 12px/12px 6px 12px 6px' }}
              >冷凍</button>
            </div>
          </div>

          {/* 自動計算保存天數 */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 ml-1 font-hand">保存期限</label>
            <div className={cn(
              "flex items-center justify-center gap-1.5 h-[46px] rounded-xl border-2 font-bold font-hand text-lg",
              expiryDays < 0 ? "bg-rose-50 border-rose-200 text-rose-600" :
              expiryDays <= 3 ? "bg-amber-50 border-amber-200 text-amber-600" :
              "bg-emerald-50 border-emerald-200 text-emerald-700"
            )}>
              <CalendarDays className="w-4 h-4" />
              {expiryDays < 0 ? '日期錯誤' : `${expiryDays} 天`}
            </div>
          </div>
        </div>

        <Input
          label="購入日期"
          type="date"
          value={form.purchaseDate}
          onChange={e => setForm({ ...form, purchaseDate: e.target.value })}
        />

        <Input
          label="有效期限"
          type="date"
          value={form.expiryDate}
          onChange={e => { setForm({ ...form, expiryDate: e.target.value }); setError(null); }}
        />

        <Button
          onClick={handleSubmit}
          className="w-full py-4 text-xl mt-4"
          disabled={!form.name.trim() || expiryDays < 0}
        >加入清單</Button>
      </div>
    </div>
  );
}
