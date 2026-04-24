import * as React from "react";
import { cn } from "@/lib/cn";

export interface SparklineProps {
  data: readonly number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
  area?: boolean;
}

export function Sparkline({
  data,
  width = 120,
  height = 28,
  color = "rgb(var(--accent))",
  className,
  area = true,
}: SparklineProps) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const dx = width / (data.length - 1 || 1);
  const y = (v: number) => height - ((v - min) / range) * height;
  const poly = data.map((v, i) => `${i * dx},${y(v)}`).join(" ");
  const areaPath =
    `M 0,${y(data[0])} ` +
    data.map((v, i) => `L ${i * dx},${y(v)}`).join(" ") +
    ` L ${(data.length - 1) * dx},${height} L 0,${height} Z`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("inline-block", className)}
      role="img"
      aria-label="Sparkline"
    >
      {area && <path d={areaPath} fill={color} opacity={0.16} />}
      <polyline
        points={poly}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
