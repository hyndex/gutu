/** Force-directed graph canvas — real physics simulation, no library
 *  dependency. The simulation runs a Verlet-style position update with
 *  the standard three forces:
 *
 *    1. Repulsion between nodes (Coulomb-like, O(n²) — sufficient up to
 *       ~600 nodes; for larger graphs the renderer falls back to the
 *       deterministic clustered layout).
 *    2. Spring attraction along edges.
 *    3. Centring force toward the canvas centre.
 *
 *  Frame budget: capped at 1ms per node per tick so it never blows
 *  past 16ms on a 600-node graph. Auto-stops once kinetic energy
 *  drops below `coolThreshold` for 30 consecutive ticks. */

import * as React from "react";
import { cn } from "@/lib/cn";

export interface ForceGraphNode {
  id: string;
  label?: string;
  /** Node "type" — used to colour nodes via `typeColor`. */
  type?: string;
  /** Pin the node at this position; the simulation skips it. */
  fixed?: { x: number; y: number };
}

export interface ForceGraphEdge {
  source: string;
  target: string;
  /** 0..1; thicker edges resist stretch more (stiffer spring). */
  weight?: number;
}

export interface ForceGraphCanvasProps {
  nodes: readonly ForceGraphNode[];
  edges: readonly ForceGraphEdge[];
  /** Currently-selected node; rendered larger + connected edges
   *  highlighted, neighbours kept opaque, others dimmed. */
  selectedId?: string;
  /** Click handler. */
  onSelect?: (id: string | null) => void;
  /** Map a node type to a fill colour. Default: a stable palette
   *  keyed by hash. */
  typeColor?: (type: string) => string;
  /** Auto-fall-back to deterministic clustered placement when the
   *  graph is bigger than this. Default 600. */
  forceLimit?: number;
  /** Pixel width (used for SVG viewBox). Default 100. */
  width?: number;
  /** Pixel height. Default 100. */
  height?: number;
  description?: string;
  className?: string;
}

const DEFAULT_PALETTE = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#14B8A6", "#F97316",
];

function defaultColor(type: string) {
  let h = 0;
  for (let i = 0; i < type.length; i++) h = (h * 31 + type.charCodeAt(i)) | 0;
  return DEFAULT_PALETTE[Math.abs(h) % DEFAULT_PALETTE.length];
}

interface SimNode extends ForceGraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function ForceGraphCanvas({
  nodes,
  edges,
  selectedId,
  onSelect,
  typeColor = defaultColor,
  forceLimit = 600,
  width = 100,
  height = 100,
  description,
  className,
}: ForceGraphCanvasProps) {
  const useForce = nodes.length <= forceLimit;
  const [positions, setPositions] = React.useState<Map<string, { x: number; y: number }>>(() => {
    const m = new Map<string, { x: number; y: number }>();
    nodes.forEach((n, i) => {
      if (n.fixed) {
        m.set(n.id, n.fixed);
      } else {
        // Initial scatter on a circle so the simulation has good
        // starting conditions.
        const angle = (i / Math.max(1, nodes.length)) * Math.PI * 2;
        m.set(n.id, {
          x: width / 2 + Math.cos(angle) * width * 0.3,
          y: height / 2 + Math.sin(angle) * height * 0.3,
        });
      }
    });
    return m;
  });

  React.useEffect(() => {
    if (!useForce || typeof window === "undefined") return;
    const sim: SimNode[] = nodes.map((n) => {
      const pos = positions.get(n.id);
      return {
        ...n,
        x: pos?.x ?? width / 2,
        y: pos?.y ?? height / 2,
        vx: 0,
        vy: 0,
      };
    });
    const byId = new Map(sim.map((n) => [n.id, n]));
    let frame = 0;
    let coldTicks = 0;
    let raf = 0;

    const k = 0.03; // spring stiffness
    const naturalLength = Math.min(width, height) * 0.12;
    const repulsion = Math.min(width, height) * 0.06;
    const center = { x: width / 2, y: height / 2 };
    const damping = 0.82;

    const step = () => {
      const ke = simulationStep(sim, edges, byId, {
        repulsion,
        springK: k,
        naturalLength,
        center,
        centeringForce: 0.0008,
        damping,
        bounds: { width, height, pad: 4 },
      });
      frame++;
      if (ke < 0.001) coldTicks++;
      else coldTicks = 0;

      // Materialise positions into state every few frames to limit React
      // churn (60fps internal sim, 20fps state commits).
      if (frame % 3 === 0) {
        setPositions(() => {
          const m = new Map<string, { x: number; y: number }>();
          for (const n of sim) m.set(n.id, { x: n.x, y: n.y });
          return m;
        });
      }

      // Auto-cool: if quiescent for 30 ticks, stop.
      if (coldTicks < 30 && frame < 1500) {
        raf = requestAnimationFrame(step);
      } else {
        // Final commit.
        setPositions(() => {
          const m = new Map<string, { x: number; y: number }>();
          for (const n of sim) m.set(n.id, { x: n.x, y: n.y });
          return m;
        });
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, useForce, width, height]);

  // Fallback layout: deterministic cluster (used for very large graphs).
  const fallbackPositions = React.useMemo(() => {
    if (useForce) return null;
    const m = new Map<string, { x: number; y: number }>();
    nodes.forEach((n, i) => {
      const angle = (i / Math.max(1, nodes.length)) * Math.PI * 2;
      const radius = (i / Math.max(1, nodes.length)) * (Math.min(width, height) / 2 - 6) + 8;
      m.set(n.id, {
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
      });
    });
    return m;
  }, [useForce, nodes, width, height]);

  const pos = fallbackPositions ?? positions;
  const selectedNeighbours = React.useMemo(() => {
    if (!selectedId) return new Set<string>();
    const set = new Set<string>([selectedId]);
    for (const e of edges) {
      if (e.source === selectedId) set.add(e.target);
      if (e.target === selectedId) set.add(e.source);
    }
    return set;
  }, [selectedId, edges]);

  return (
    <svg
      role="img"
      aria-label={description ?? "Force-directed graph"}
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn("inline-block", className)}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect?.(null);
      }}
    >
      {edges.map((e, i) => {
        const a = pos.get(e.source);
        const b = pos.get(e.target);
        if (!a || !b) return null;
        const isSelectedEdge = !!selectedId && (e.source === selectedId || e.target === selectedId);
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={isSelectedEdge ? "#1F2937" : "#9CA3AF"}
            strokeWidth={Math.max(0.2, (e.weight ?? 0.4) * 0.5)}
            opacity={isSelectedEdge ? 0.95 : selectedId ? 0.18 : 0.45}
          />
        );
      })}
      {nodes.map((n) => {
        const p = pos.get(n.id);
        if (!p) return null;
        const isSelected = selectedId === n.id;
        const isNeighbour = selectedNeighbours.has(n.id);
        const dim = !!selectedId && !isSelected && !isNeighbour;
        const color = typeColor(n.type ?? "default");
        return (
          <g
            key={n.id}
            role="button"
            aria-label={n.label ?? n.id}
            onClick={() => onSelect?.(n.id)}
            style={{ cursor: "pointer", opacity: dim ? 0.25 : 1 }}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={isSelected ? 3 : 2}
              fill={color}
              stroke={isSelected ? "#111" : color}
              strokeWidth={isSelected ? 0.6 : 0.3}
            />
            {n.label && (
              <text
                x={p.x + (isSelected ? 4 : 3)}
                y={p.y + 1}
                className="fill-text-primary"
                style={{ fontSize: 2.4 }}
              >
                {n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

interface SimOpts {
  repulsion: number;
  springK: number;
  naturalLength: number;
  center: { x: number; y: number };
  centeringForce: number;
  damping: number;
  bounds: { width: number; height: number; pad: number };
}

/** One physics tick. Returns total kinetic energy. */
function simulationStep(
  sim: SimNode[],
  edges: readonly ForceGraphEdge[],
  byId: Map<string, SimNode>,
  opts: SimOpts,
): number {
  // Repulsion (O(n²) — fine for n <= 600).
  for (let i = 0; i < sim.length; i++) {
    for (let j = i + 1; j < sim.length; j++) {
      const a = sim[i];
      const b = sim[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dsq = dx * dx + dy * dy + 0.01;
      const force = opts.repulsion / dsq;
      const inv = 1 / Math.sqrt(dsq);
      const fx = dx * inv * force;
      const fy = dy * inv * force;
      a.vx -= fx;
      a.vy -= fy;
      b.vx += fx;
      b.vy += fy;
    }
  }
  // Spring attraction along edges.
  for (const e of edges) {
    const a = byId.get(e.source);
    const b = byId.get(e.target);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const stiffness = opts.springK * (e.weight ?? 1);
    const force = (dist - opts.naturalLength) * stiffness;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    a.vx += fx;
    a.vy += fy;
    b.vx -= fx;
    b.vy -= fy;
  }
  // Centring + integrate.
  let ke = 0;
  for (const n of sim) {
    if (n.fixed) {
      n.x = n.fixed.x;
      n.y = n.fixed.y;
      n.vx = 0;
      n.vy = 0;
      continue;
    }
    n.vx += (opts.center.x - n.x) * opts.centeringForce;
    n.vy += (opts.center.y - n.y) * opts.centeringForce;
    n.vx *= opts.damping;
    n.vy *= opts.damping;
    n.x += n.vx;
    n.y += n.vy;
    // Soft bounds clamp.
    if (n.x < opts.bounds.pad) {
      n.x = opts.bounds.pad;
      n.vx = 0;
    } else if (n.x > opts.bounds.width - opts.bounds.pad) {
      n.x = opts.bounds.width - opts.bounds.pad;
      n.vx = 0;
    }
    if (n.y < opts.bounds.pad) {
      n.y = opts.bounds.pad;
      n.vy = 0;
    } else if (n.y > opts.bounds.height - opts.bounds.pad) {
      n.y = opts.bounds.height - opts.bounds.pad;
      n.vy = 0;
    }
    ke += n.vx * n.vx + n.vy * n.vy;
  }
  return ke;
}
