'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartWrapper } from './chart-wrapper';

interface BarChartSeries {
  dataKey: string;
  name: string;
  color?: string;
  stackId?: string;
}

interface BarChartProps {
  data: Record<string, unknown>[];
  xDataKey: string;
  series: BarChartSeries[];
  height?: number;
  isLoading?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
}

export function BarChartComponent({
  data,
  xDataKey,
  series,
  height = 300,
  isLoading,
  showGrid = true,
  showLegend = true,
}: BarChartProps) {
  return (
    <ChartWrapper height={height} isLoading={isLoading}>
      <RechartsBarChart data={data}>
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
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            name={s.name}
            fill={s.color ?? 'hsl(var(--color-primary))'}
            stackId={s.stackId}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ChartWrapper>
  );
}
