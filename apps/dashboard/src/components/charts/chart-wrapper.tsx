'use client';

import { type ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface ChartWrapperProps {
  height?: number;
  isLoading?: boolean;
  children: ReactNode;
}

export function ChartWrapper({ height = 300, isLoading, children }: ChartWrapperProps) {
  if (isLoading) {
    return <Skeleton className="w-full" style={{ height }} />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      {children as React.ReactElement}
    </ResponsiveContainer>
  );
}
