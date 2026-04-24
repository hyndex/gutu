import * as React from "react";
import { CHART_PALETTE, niceScale } from "./_helpers";
import { cn } from "@/lib/cn";

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartProps {
  data: readonly BarDatum[];
  height?: number;
  className?: string;
  valueFormatter?: (v: number) => string;
}

export function BarChart({
  data,
  height = 180,
  className,
  valueFormatter = (v) => v.toLocaleString(),
}: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 0);
  const { max: niceMax } = niceScale(max);
  const n = data.length;
  const pad = { top: 12, right: 8, bottom: 28, left: 36 };
  const w = 480;
  const h = height;
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const gap = 4;
  const barW = Math.max(4, (innerW - gap * (n - 1)) / Math.max(1, n));

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      width="100%"
      height={h}
      className={cn("block", className)}
      role="img"
      aria-label="Bar chart"
    >
      {/* Y grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <g key={i}>
          <line
            x1={pad.left}
            x2={w - pad.right}
            y1={pad.top + innerH * (1 - t)}
            y2={pad.top + innerH * (1 - t)}
            stroke="rgb(var(--border))"
            strokeDasharray={i === 0 ? undefined : "2 3"}
          />
          <text
            x={pad.left - 6}
            y={pad.top + innerH * (1 - t) + 3}
            textAnchor="end"
            className="fill-text-muted"
            fontSize="10"
          >
            {valueFormatter(niceMax * t)}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const hPx = (d.value / (niceMax || 1)) * innerH;
        const x = pad.left + i * (barW + gap);
        const y = pad.top + innerH - hPx;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={hPx}
              rx={2}
              fill={d.color ?? CHART_PALETTE[0]}
            >
              <title>
                {d.label}: {valueFormatter(d.value)}
              </title>
            </rect>
            <text
              x={x + barW / 2}
              y={h - 10}
              textAnchor="middle"
              className="fill-text-muted"
              fontSize="10"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
