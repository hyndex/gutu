import * as React from "react";
import { CHART_PALETTE } from "./_helpers";
import { cn } from "@/lib/cn";

export interface DonutSlice {
  label: string;
  value: number;
  color?: string;
}

export interface DonutProps {
  data: readonly DonutSlice[];
  size?: number;
  className?: string;
  centerLabel?: React.ReactNode;
}

export function Donut({ data, size = 160, className, centerLabel }: DonutProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - 6;
  const cx = size / 2;
  const cy = size / 2;
  let angle = -Math.PI / 2;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <svg width={size} height={size} role="img" aria-label="Donut chart">
        {data.map((d, i) => {
          const portion = d.value / total;
          const start = angle;
          const end = angle + portion * Math.PI * 2;
          angle = end;
          const large = end - start > Math.PI ? 1 : 0;
          const x1 = cx + r * Math.cos(start);
          const y1 = cy + r * Math.sin(start);
          const x2 = cx + r * Math.cos(end);
          const y2 = cy + r * Math.sin(end);
          const path = [
            `M ${cx} ${cy}`,
            `L ${x1} ${y1}`,
            `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
            "Z",
          ].join(" ");
          return (
            <path
              key={i}
              d={path}
              fill={d.color ?? CHART_PALETTE[i % CHART_PALETTE.length]}
              opacity={0.9}
            >
              <title>
                {d.label}: {d.value.toLocaleString()} (
                {Math.round(portion * 100)}%)
              </title>
            </path>
          );
        })}
        <circle
          cx={cx}
          cy={cy}
          r={r * 0.58}
          fill="rgb(var(--surface-0))"
        />
        {centerLabel && (
          <foreignObject
            x={cx - r * 0.55}
            y={cy - r * 0.3}
            width={r * 1.1}
            height={r * 0.6}
          >
            <div className="w-full h-full flex flex-col items-center justify-center text-center">
              {centerLabel}
            </div>
          </foreignObject>
        )}
      </svg>
      <ul className="flex flex-col gap-1 text-sm min-w-0">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2 text-text-secondary">
            <span
              className="inline-block w-3 h-3 rounded-sm shrink-0"
              style={{
                background: d.color ?? CHART_PALETTE[i % CHART_PALETTE.length],
              }}
              aria-hidden
            />
            <span className="truncate">{d.label}</span>
            <span className="text-text-muted ml-auto tabular-nums">
              {d.value.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
