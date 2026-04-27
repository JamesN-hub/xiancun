import { useState } from 'react';
import { Button, Card, Input } from '../components/ui';

export function OnboardingView({ onCreate, onJoin, onLogout }: {
  onCreate: (name: string) => void;
  onJoin: (id: string) => Promise<void>;
  onLogout: () => void;
}) {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const switchMode = (next: 'select' | 'create' | 'join') => {
    setValue('');
    setError('');
    setMode(next);
  };

  const handleJoin = async () => {
    setError('');
    setLoading(true);
    try {
      await onJoin(value);
    } catch (err: any) {
      setError(err.message || '加入失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center px-6">
      <Card className="w-full max-w-sm p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-slate-900 font-hand">歡迎使用鮮存</h2>
          <p className="text-slate-500 font-hand text-lg">請先建立或加入一個家庭群組</p>
        </div>

        {mode === 'select' && (
          <div className="space-y-4">
            <Button onClick={() => switchMode('create')} className="w-full py-4 text-xl" variant="primary">建立新家庭</Button>
            <Button onClick={() => switchMode('join')} className="w-full py-4 text-xl" variant="outline">加入現有家庭</Button>
            <Button onClick={onLogout} className="w-full font-hand" variant="ghost">登出</Button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4">
            <Input label="家庭名稱" placeholder="例如：王小明的家" value={value} onChange={e => setValue(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={() => switchMode('select')} variant="ghost" className="flex-1">返回</Button>
              <Button onClick={() => onCreate(value)} className="flex-1" disabled={!value.trim()}>建立</Button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-4">
            <Input
              label="家庭 ID"
              placeholder="貼上邀請碼"
              value={value}
              onChange={e => { setValue(e.target.value); setError(''); }}
            />
            {error && <p className="text-sm text-rose-600 font-hand">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={() => switchMode('select')} variant="ghost" className="flex-1" disabled={loading}>返回</Button>
              <Button onClick={handleJoin} className="flex-1" disabled={!value.trim() || loading}>
                {loading ? '加入中...' : '加入'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
