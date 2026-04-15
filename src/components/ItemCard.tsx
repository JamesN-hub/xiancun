import { Refrigerator, Snowflake, Clock, Trash2 } from 'lucide-react';
import { differenceInDays, addDays, parseISO, isPast, isToday } from 'date-fns';
import { cn } from '../lib/utils';
import { FoodItem } from '../types';
import { Card, Button } from './ui';

export function ItemCard({ item, onDelete }: { item: FoodItem; onDelete: () => void }) {
  const purchaseDate = parseISO(item.purchaseDate);
  const expiryDate = addDays(purchaseDate, item.expiryDays);
  const daysLeft = differenceInDays(expiryDate, new Date());
  const daysSinceAdded = differenceInDays(new Date(), parseISO(item.createdAt));

  const isExpired = isPast(expiryDate) && !isToday(expiryDate);
  const isExpiringSoon = daysLeft <= 3 && daysLeft >= 0;

  return (
    <Card className={cn(
      "p-4 flex items-center justify-between group transition-all border-2",
      isExpired ? "border-rose-300 bg-rose-50/50" : isExpiringSoon ? "border-amber-300 bg-amber-50/50" : "border-slate-200"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center border-2",
          isExpired ? "bg-rose-100 text-rose-600 border-rose-200" : isExpiringSoon ? "bg-amber-100 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-600 border-emerald-100"
        )} style={{ borderRadius: '12px 24px 12px 24px/24px 12px 24px 12px' }}>
          {item.category === 'fridge' ? <Refrigerator className="w-6 h-6" /> : <Snowflake className="w-6 h-6" />}
        </div>
        <div className="space-y-0.5">
          <h3 className="font-bold text-slate-900 font-hand text-lg">{item.name}</h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-500 font-hand">
            <span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-1.5 rounded-md border border-emerald-100">
              {item.addedByName || '未知'}
            </span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 已入庫 {daysSinceAdded} 天</span>
            <span>•</span>
            <span className={cn(
              "font-bold",
              isExpired ? "text-rose-600" : isExpiringSoon ? "text-amber-600" : "text-emerald-600"
            )}>
              {isExpired ? '已過期' : isExpiringSoon ? `剩餘 ${daysLeft} 天` : `剩餘 ${daysLeft} 天`}
            </span>
          </div>
        </div>
      </div>
      <Button onClick={onDelete} variant="danger" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 className="w-4 h-4" />
      </Button>
    </Card>
  );
}
