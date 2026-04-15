import { Refrigerator } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui';

export function LoginView({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-warm-bg flex flex-col items-center justify-center px-8 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 max-w-xs"
      >
        <div className="w-24 h-24 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-100" style={{ borderRadius: '24px 48px 24px 48px/48px 24px 48px 24px' }}>
          <Refrigerator className="w-12 h-12 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-slate-900 font-hand">鮮存 FreshTrack</h1>
          <p className="text-slate-500 font-hand text-lg">模組化冰箱管理，讓食材不再過期。</p>
        </div>
        <Button onClick={onLogin} size="lg" className="w-full gap-3 py-4">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" className="w-5 h-5" alt="Google" />
          使用 Google 登入
        </Button>
      </motion.div>
    </div>
  );
}
