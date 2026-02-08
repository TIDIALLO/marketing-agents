'use client';

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartWrapper } from './chart-wrapper';

interface LineChartSeries {
  dataKey: string;
  name: string;
  color?: string;
}

interface LineChartProps {
  data: Record<string, unknown>[];
  xDataKey: string;
  series: LineChartSeries[];
  height?: number;
  isLoading?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
}

export function LineChartComponent({
  data,
  xDataKey,
  series,
  height = 300,
  isLoading,
  showGrid = true,
  showLegend = true,
}: LineChartProps) {
  return (
    <ChartWrapper height={height} isLoading={isLoading}>
      <RechartsLineChart data={data}>
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
          <Line
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            name={s.name}
            stroke={s.color ?? 'hsl(var(--color-primary))'}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </RechartsLineChart>
    </ChartWrapper>
  );
}
