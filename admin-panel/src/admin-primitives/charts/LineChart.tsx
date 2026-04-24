import * as React from "react";
import { CHART_PALETTE, niceScale } from "./_helpers";
import { cn } from "@/lib/cn";

export interface LineSeries {
  label: string;
  data: readonly number[];
  color?: string;
}

export interface LineChartProps {
  xLabels: readonly string[];
  series: readonly LineSeries[];
  height?: number;
  className?: string;
  valueFormatter?: (v: number) => string;
  area?: boolean;
}

export function LineChart({
  xLabels,
  series,
  height = 200,
  className,
  valueFormatter = (v) => v.toLocaleString(),
  area = true,
}: LineChartProps) {
  const maxVal = Math.max(...series.flatMap((s) => s.data), 0);
  const { max: niceMax } = niceScale(maxVal);
  const pad = { top: 14, right: 8, bottom: 28, left: 40 };
  const w = 480;
  const h = height;
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top - pad.bottom;
  const n = xLabels.length;
  const xAt = (i: number) =>
    n <= 1 ? pad.left + iw / 2 : pad.left + (i * iw) / (n - 1);
  const yAt = (v: number) => pad.top + ih - (v / (niceMax || 1)) * ih;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      width="100%"
      height={h}
      className={cn("block", className)}
      role="img"
      aria-label="Line chart"
    >
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <g key={i}>
          <line
            x1={pad.left}
            x2={w - pad.right}
            y1={pad.top + ih * (1 - t)}
            y2={pad.top + ih * (1 - t)}
            stroke="rgb(var(--border))"
            strokeDasharray={i === 0 ? undefined : "2 3"}
          />
          <text
            x={pad.left - 6}
            y={pad.top + ih * (1 - t) + 3}
            textAnchor="end"
            className="fill-text-muted"
            fontSize="10"
          >
            {valueFormatter(niceMax * t)}
          </text>
        </g>
      ))}
      {series.map((s, si) => {
        const color = s.color ?? CHART_PALETTE[si % CHART_PALETTE.length];
        const points = s.data
          .map((v, i) => `${xAt(i)},${yAt(v)}`)
          .join(" ");
        const areaPath =
          `M ${xAt(0)},${yAt(s.data[0] ?? 0)} ` +
          s.data.map((v, i) => `L ${xAt(i)},${yAt(v)}`).join(" ") +
          ` L ${xAt(s.data.length - 1)},${pad.top + ih} L ${xAt(0)},${pad.top + ih} Z`;
        return (
          <g key={si}>
            {area && (
              <path
                d={areaPath}
                fill={color}
                opacity={0.12}
              />
            )}
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {s.data.map((v, i) => (
              <circle
                key={i}
                cx={xAt(i)}
                cy={yAt(v)}
                r={2}
                fill={color}
              >
                <title>
                  {s.label} @ {xLabels[i]}: {valueFormatter(v)}
                </title>
              </circle>
            ))}
          </g>
        );
      })}
      {xLabels.map((l, i) => (
        <text
          key={i}
          x={xAt(i)}
          y={h - 10}
          textAnchor="middle"
          className="fill-text-muted"
          fontSize="10"
        >
          {l}
        </text>
      ))}
    </svg>
  );
}
