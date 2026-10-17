import { Card, CardContent } from '../../components/ui/card';

export const ORANGE = '#E86825';
export const DIAVERUM_GREEN = '#004138';

export function Kpi({ icon, bg, label, value, hint }: { icon: React.ReactNode; bg: string; label: string; value: string; hint?: string }) {
  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
          {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
