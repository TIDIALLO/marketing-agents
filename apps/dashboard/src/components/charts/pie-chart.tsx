'use client';

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartWrapper } from './chart-wrapper';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

interface PieChartDataItem {
  name: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: PieChartDataItem[];
  height?: number;
  isLoading?: boolean;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

export function PieChartComponent({
  data,
  height = 300,
  isLoading,
  showLegend = true,
  innerRadius = 60,
  outerRadius = 100,
}: PieChartProps) {
  return (
    <ChartWrapper height={height} isLoading={isLoading}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell
              key={entry.name}
              fill={entry.color ?? COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--color-card))',
            border: '1px solid hsl(var(--color-border))',
            borderRadius: '0.375rem',
          }}
        />
        {showLegend && <Legend />}
      </RechartsPieChart>
    </ChartWrapper>
  );
}
