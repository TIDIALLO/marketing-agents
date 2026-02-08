'use client';

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartWrapper } from './chart-wrapper';

interface AreaChartSeries {
  dataKey: string;
  name: string;
  color?: string;
}

interface AreaChartProps {
  data: Record<string, unknown>[];
  xDataKey: string;
  series: AreaChartSeries[];
  height?: number;
  isLoading?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
}

export function AreaChartComponent({
  data,
  xDataKey,
  series,
  height = 300,
  isLoading,
  showGrid = true,
  showLegend = true,
}: AreaChartProps) {
  return (
    <ChartWrapper height={height} isLoading={isLoading}>
      <RechartsAreaChart data={data}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.dataKey} id={`gradient-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color ?? 'hsl(var(--color-primary))'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={s.color ?? 'hsl(var(--color-primary))'} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
        <XAxis dataKey={xDataKey} className="text-xs fill-muted-foreground" />
        <YAxis className="text-xs fill-muted-foreground" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--color-card))',
            border: '1px solid hsl(var(--color-border))',
            borderRadius: '0.375rem',
          }}
        />
        {showLegend && <Legend />}
        {series.map((s) => (
          <Area
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            name={s.name}
            stroke={s.color ?? 'hsl(var(--color-primary))'}
            fill={`url(#gradient-${s.dataKey})`}
            strokeWidth={2}
          />
        ))}
      </RechartsAreaChart>
    </ChartWrapper>
  );
}
