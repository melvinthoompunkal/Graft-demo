import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ─── helpers ─── */

function extensionColor(path) {
  if (!path) return "#00FF88";
  const ext = path.split(".").pop().toLowerCase();
  const map = {
    py: "#3572A5",
    js: "#f1e05a",
    jsx: "#f1e05a",
    ts: "#3178c6",
    tsx: "#3178c6",
    go: "#00ADD8",
    rs: "#dea584",
    java: "#b07219",
    rb: "#701516",
    css: "#563d7c",
    html: "#e34c26",
    md: "#083fa1",
    json: "#292929",
    yaml: "#cb171e",
    yml: "#cb171e",
    toml: "#9c4221",
    sql: "#e38c00",
  };
  return map[ext] || "#00FF88";
}

function shortFile(path) {
  if (!path) return "unknown";
  const parts = path.replace(/\\/g, "/").split("/");
  return parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : path;
}

function extensionBadge(path) {
  if (!path || !path.includes(".")) return "SRC";
  return path.split(".").pop().slice(0, 4).toUpperCase();
}

/* ─── Layout: simple vertical flow with file grouping ─── */

const NODE_W = 280;
const NODE_H = 88;
const GAP_Y = 56;
const GROUP_PAD = 20;

function computeLayout(callChain) {
  if (!callChain?.length) return { nodes: [], edges: [], groups: [], width: 0, height: 0 };

  // Build nodes
  const nodes = callChain.map((item, i) => ({
    id: i,
    file: item.file,
    fn: item.function,
    lineStart: item.line_start,
    lineEnd: item.line_end,
    role: item.role || "Trace node",
    x: 0,
    y: 0,
  }));

  // Simple vertical layout with horizontal offset for variety
  const totalH = nodes.length * (NODE_H + GAP_Y) - GAP_Y;
  const centerX = 400;
  const offsets = [0, -60, 40, -30, 60, -50, 20];

  nodes.forEach((n, i) => {
    n.x = centerX + offsets[i % offsets.length] - NODE_W / 2;
    n.y = i * (NODE_H + GAP_Y);
  });

  // Edges
  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ from: i, to: i + 1 });
  }

  // File groups (consecutive nodes with same file)
  const groups = [];
  let gi = 0;
  while (gi < nodes.length) {
    const file = nodes[gi].file;
    let gj = gi;
    while (gj < nodes.length && nodes[gj].file === file) gj++;
    if (gj - gi >= 1) {
      const slice = nodes.slice(gi, gj);
      const minX = Math.min(...slice.map((n) => n.x)) - GROUP_PAD;
      const minY = Math.min(...slice.map((n) => n.y)) - GROUP_PAD;
      const maxX = Math.max(...slice.map((n) => n.x + NODE_W)) + GROUP_PAD;
      const maxY = Math.max(...slice.map((n) => n.y + NODE_H)) + GROUP_PAD;
      groups.push({ file, x: minX, y: minY, w: maxX - minX, h: maxY - minY, color: extensionColor(file) });
    }
    gi = gj;
  }

  const maxX = Math.max(...nodes.map((n) => n.x + NODE_W)) + 120;
  const maxY = totalH + 120;

  return { nodes, edges, groups, width: Math.max(maxX, 800), height: maxY };
}

/* ─── Curved path between nodes ─── */

function edgePath(fromNode, toNode) {
  const x1 = fromNode.x + NODE_W / 2;
  const y1 = fromNode.y + NODE_H;
  const x2 = toNode.x + NODE_W / 2;
  const y2 = toNode.y;
  const cy = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
}

/* ─── Arrow marker (SVG def) ─── */

function ArrowDef() {
  return (
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#00FF88" opacity="0.7" />
      </marker>
      <marker id="arrowhead-dim" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#3b4b3d" opacity="0.5" />
      </marker>
      <marker id="arrowhead-active" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
        <polygon points="0 0, 12 4, 0 8" fill="#00FF88" />
      </marker>
      <filter id="glow">
        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

/* ─── Detail panel for walkthrough ─── */

function DetailPanel({ node, stepIndex, totalSteps, onPrev, onNext, onStop }) {
  if (!node) return null;
  return (
    <div className="border border-primary-container/30 bg-surface-container-lowest/95 backdrop-blur-md p-5 shadow-neon animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center border border-primary-container font-mono text-xs font-bold text-primary-container">
            {String(stepIndex + 1).padStart(2, "0")}
          </span>
          <p className="mono-label">
            Step {stepIndex + 1} of {totalSteps}
          </p>
        </div>
        <button
          className="font-mono text-[10px] uppercase tracking-widest text-outline hover:text-red-400 transition"
          onClick={onStop}
          type="button"
        >
          Exit
        </button>
      </div>

      <h3 className="font-headline text-lg font-bold text-on-surface mb-1">{node.fn}</h3>
      <p className="font-mono text-xs text-primary-container/80 mb-3">
        {node.file}{" "}
        <span className="text-outline">
          L{node.lineStart}–{node.lineEnd}
        </span>
      </p>
      <p className="text-sm leading-relaxed text-on-surface-variant mb-5">{node.role}</p>

      <div className="flex items-center gap-2">
        <button
          className="flex-1 border border-outline-variant/40 px-3 py-2 font-mono text-xs uppercase tracking-widest text-on-surface-variant transition hover:border-primary-container hover:text-primary-container disabled:opacity-30"
          disabled={stepIndex === 0}
          onClick={onPrev}
          type="button"
        >
          ← Prev
        </button>
        <button
          className={`flex-1 px-3 py-2 font-mono text-xs uppercase tracking-widest transition ${
            stepIndex < totalSteps - 1
              ? "bg-primary-container text-[#003919] hover:brightness-110"
              : "border border-primary-container text-primary-container hover:bg-primary-container/10"
          }`}
          onClick={onNext}
          type="button"
        >
          {stepIndex < totalSteps - 1 ? "Next →" : "Finish ✓"}
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1 w-full bg-surface-container-high overflow-hidden">
        <div
          className="h-full bg-primary-container transition-all duration-500 ease-out"
          style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Feature selector ─── */

function FeatureSelector({ features, traces, selected, onSelect }) {
  const tracedFeatures = features.filter((f) => traces[f.slug]);
  if (!tracedFeatures.length) return null;

  return (
    <div className="flex items-center gap-3">
      <label className="mono-label whitespace-nowrap" htmlFor="map-feature-select">
        Feature
      </label>
      <select
        id="map-feature-select"
        className="input-shell max-w-xs bg-surface-container-low py-2 text-sm"
        value={selected || ""}
        onChange={(e) => onSelect(e.target.value)}
      >
        {tracedFeatures.map((f) => (
          <option key={f.slug} value={f.slug}>
            {f.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ─── The SVG map ─── */

function MapCanvas({ layout, activeStep, walkthroughActive, onNodeClick }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [pan, setPan] = useState({ x: 60, y: 40 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Auto-center on active node during walkthrough
  useEffect(() => {
    if (!walkthroughActive || activeStep == null || !layout.nodes[activeStep] || !containerRef.current) return;
    const node = layout.nodes[activeStep];
    const rect = containerRef.current.getBoundingClientRect();
    const targetX = rect.width / 2 - (node.x + NODE_W / 2) * zoom;
    const targetY = rect.height / 3 - (node.y + NODE_H / 2) * zoom;
    setPan({ x: targetX, y: targetY });
  }, [activeStep, walkthroughActive, zoom, layout.nodes]);

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setZoom((z) => Math.max(0.3, Math.min(2, z + delta)));
    },
    []
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const onMouseDown = (e) => {
    if (e.target.closest("[data-node]")) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  };
  const onMouseUp = () => setDragging(false);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden bg-[#0a0a0a] cursor-grab active:cursor-grabbing"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Grid background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(0,255,136,0.04) 1px, transparent 1px)",
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      <svg
        ref={svgRef}
        className="absolute inset-0"
        width="100%"
        height="100%"
        style={{ overflow: "visible" }}
      >
        <ArrowDef />
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* File group backgrounds */}
          {layout.groups.map((g, i) => (
            <g key={`group-${i}`}>
              <rect
                x={g.x}
                y={g.y}
                width={g.w}
                height={g.h}
                rx={4}
                fill={g.color}
                opacity={0.04}
                stroke={g.color}
                strokeWidth={1}
                strokeOpacity={0.15}
                strokeDasharray="6 4"
              />
              <text
                x={g.x + 8}
                y={g.y + 14}
                fill={g.color}
                opacity={0.4}
                fontSize={10}
                fontFamily="JetBrains Mono, monospace"
              >
                {shortFile(g.file)}
              </text>
            </g>
          ))}

          {/* Edges */}
          {layout.edges.map((edge, i) => {
            const from = layout.nodes[edge.from];
            const to = layout.nodes[edge.to];
            const isActive = walkthroughActive && activeStep != null && edge.from === activeStep;
            const isVisited = walkthroughActive && activeStep != null && edge.from < activeStep;
            const isDimmed = walkthroughActive && activeStep != null && !isActive && !isVisited;

            return (
              <path
                key={`edge-${i}`}
                d={edgePath(from, to)}
                fill="none"
                stroke={isActive ? "#00FF88" : isDimmed ? "#2a2a2a" : "#3b4b3d"}
                strokeWidth={isActive ? 2.5 : 1.5}
                strokeOpacity={isDimmed ? 0.3 : isActive ? 1 : 0.6}
                markerEnd={
                  isActive
                    ? "url(#arrowhead-active)"
                    : isDimmed
                    ? "url(#arrowhead-dim)"
                    : "url(#arrowhead)"
                }
                filter={isActive ? "url(#glow)" : undefined}
                className="transition-all duration-500"
              />
            );
          })}

          {/* Nodes */}
          {layout.nodes.map((node, i) => {
            const isActive = walkthroughActive && activeStep === i;
            const isVisited = walkthroughActive && activeStep != null && i < activeStep;
            const isDimmed = walkthroughActive && activeStep != null && !isActive && !isVisited;
            const color = extensionColor(node.file);

            return (
              <g
                key={`node-${i}`}
                data-node
                className="cursor-pointer transition-all duration-300"
                onClick={() => onNodeClick(i)}
                style={{ opacity: isDimmed ? 0.25 : 1 }}
              >
                {/* Glow for active */}
                {isActive && (
                  <rect
                    x={node.x - 4}
                    y={node.y - 4}
                    width={NODE_W + 8}
                    height={NODE_H + 8}
                    rx={6}
                    fill="none"
                    stroke="#00FF88"
                    strokeWidth={2}
                    filter="url(#glow)"
                    className="animate-pulse"
                  />
                )}

                {/* Background */}
                <rect
                  x={node.x}
                  y={node.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={4}
                  fill={isActive ? "#1a2e22" : "#131313"}
                  stroke={isActive ? "#00FF88" : isVisited ? "#00FF8860" : "#2a2a2a"}
                  strokeWidth={isActive ? 2 : 1}
                />

                {/* Step number */}
                <rect
                  x={node.x}
                  y={node.y}
                  width={28}
                  height={NODE_H}
                  rx={4}
                  fill={color}
                  opacity={isActive ? 0.25 : 0.1}
                />
                <text
                  x={node.x + 14}
                  y={node.y + NODE_H / 2 + 4}
                  textAnchor="middle"
                  fill={color}
                  fontSize={11}
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                  opacity={isActive ? 1 : 0.7}
                >
                  {String(i + 1).padStart(2, "0")}
                </text>

                {/* Function name */}
                <text
                  x={node.x + 40}
                  y={node.y + 28}
                  fill={isActive ? "#00FF88" : "#e5e2e1"}
                  fontSize={13}
                  fontWeight="bold"
                  fontFamily="Inter, sans-serif"
                >
                  {node.fn.length > 26 ? node.fn.slice(0, 24) + "…" : node.fn}
                </text>

                {/* File + lines */}
                <text
                  x={node.x + 40}
                  y={node.y + 48}
                  fill="#849585"
                  fontSize={10}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {shortFile(node.file)}
                </text>
                <text
                  x={node.x + 40}
                  y={node.y + 64}
                  fill="#849585"
                  fontSize={9}
                  fontFamily="JetBrains Mono, monospace"
                  opacity={0.6}
                >
                  L{node.lineStart}–{node.lineEnd} · {extensionBadge(node.file)}
                </text>

                {/* Visited check */}
                {isVisited && !isActive && (
                  <text
                    x={node.x + NODE_W - 24}
                    y={node.y + 20}
                    fill="#00FF88"
                    fontSize={14}
                    opacity={0.6}
                  >
                    ✓
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button
          className="flex h-8 w-8 items-center justify-center border border-outline-variant/30 bg-surface-container-lowest/90 text-on-surface-variant transition hover:text-primary-container hover:border-primary-container/40"
          onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
          type="button"
          title="Zoom in"
        >
          +
        </button>
        <button
          className="flex h-8 w-8 items-center justify-center border border-outline-variant/30 bg-surface-container-lowest/90 text-on-surface-variant transition hover:text-primary-container hover:border-primary-container/40"
          onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))}
          type="button"
          title="Zoom out"
        >
          −
        </button>
        <button
          className="flex h-8 w-8 items-center justify-center border border-outline-variant/30 bg-surface-container-lowest/90 font-mono text-[9px] text-on-surface-variant transition hover:text-primary-container hover:border-primary-container/40"
          onClick={() => {
            setZoom(1);
            setPan({ x: 60, y: 40 });
          }}
          type="button"
          title="Reset view"
        >
          1:1
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 hidden border border-outline-variant/20 bg-surface-container-lowest/90 p-3 text-[10px] font-mono text-outline md:block">
        <p className="mb-1 uppercase tracking-widest text-on-surface-variant">Controls</p>
        <p>Scroll — zoom</p>
        <p>Drag — pan</p>
        <p>Click node — details</p>
      </div>
    </div>
  );
}

/* ─── Main page ─── */

export default function RepoMapPage({ features, traces }) {
  const tracedFeatures = features.filter((f) => traces[f.slug]);
  const [selectedSlug, setSelectedSlug] = useState(tracedFeatures[0]?.slug || null);
  const [walkthroughActive, setWalkthroughActive] = useState(false);
  const [activeStep, setActiveStep] = useState(null);

  // Keep selectedSlug valid
  useEffect(() => {
    if (!selectedSlug && tracedFeatures.length) {
      setSelectedSlug(tracedFeatures[0].slug);
    }
  }, [tracedFeatures, selectedSlug]);

  const trace = selectedSlug ? traces[selectedSlug] : null;
  const feature = features.find((f) => f.slug === selectedSlug);
  const layout = useMemo(() => computeLayout(trace?.call_chain), [trace?.call_chain]);

  const startWalkthrough = () => {
    if (!layout.nodes.length) return;
    setWalkthroughActive(true);
    setActiveStep(0);
  };

  const stopWalkthrough = () => {
    setWalkthroughActive(false);
    setActiveStep(null);
  };

  const goPrev = () => setActiveStep((s) => Math.max(0, (s ?? 1) - 1));
  const goNext = () => {
    setActiveStep((s) => {
      const next = (s ?? -1) + 1;
      if (next >= layout.nodes.length) {
        stopWalkthrough();
        return null;
      }
      return next;
    });
  };

  const onNodeClick = (index) => {
    if (walkthroughActive) {
      setActiveStep(index);
    } else {
      setWalkthroughActive(true);
      setActiveStep(index);
    }
  };

  // Keyboard nav
  useEffect(() => {
    if (!walkthroughActive) return;
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape") {
        stopWalkthrough();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [walkthroughActive, activeStep, layout.nodes.length]);

  if (!tracedFeatures.length) {
    return (
      <section className="relative flex flex-1 flex-col overflow-hidden bg-surface">
        <div className="scan-grid border-b border-[#2a2a2a] p-6 md:p-8">
          <div className="mx-auto max-w-5xl">
            <p className="mono-label mb-2">Interactive Map</p>
            <h2 className="font-headline text-3xl font-bold tracking-tight">
              Repository <span className="text-primary-container">Map</span>
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
              A visual walkthrough of how a feature flows through the codebase — from entry point
              through every function call, file, and dependency.
            </p>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center border border-outline-variant/30 bg-surface-container-low">
            <span className="material-symbols-outlined text-4xl text-outline">map</span>
          </div>
          <h3 className="mb-2 font-headline text-xl font-bold text-on-surface">No map available</h3>
          <p className="max-w-md text-sm leading-relaxed text-on-surface-variant">
            Go to <span className="text-primary-container">Repositories</span>, ingest a repo and
            run a trace on a feature. Then come back here to explore the interactive map.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative flex flex-1 flex-col overflow-hidden bg-surface">
      {/* Top bar */}
      <div className="flex flex-col gap-4 border-b border-[#2a2a2a] bg-surface-container-lowest p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="mono-label mb-1">Repository Map</p>
            <h2 className="font-headline text-lg font-bold tracking-tight text-on-surface">
              {feature?.name || "Select a feature"}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <FeatureSelector
            features={features}
            traces={traces}
            selected={selectedSlug}
            onSelect={(slug) => {
              setSelectedSlug(slug);
              stopWalkthrough();
            }}
          />

          {!walkthroughActive ? (
            <button
              className="flex items-center gap-2 bg-primary-container px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-[#003919] transition hover:brightness-110"
              onClick={startWalkthrough}
              type="button"
            >
              <span className="material-symbols-outlined text-base">play_arrow</span>
              <span>Start Walkthrough</span>
            </button>
          ) : (
            <button
              className="flex items-center gap-2 border border-red-500/40 px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-red-400 transition hover:bg-red-500/10"
              onClick={stopWalkthrough}
              type="button"
            >
              <span className="material-symbols-outlined text-base">stop</span>
              <span>Stop</span>
            </button>
          )}
        </div>
      </div>

      {/* Map + detail panel */}
      <div className="flex flex-1 overflow-hidden">
        <MapCanvas
          layout={layout}
          activeStep={activeStep}
          walkthroughActive={walkthroughActive}
          onNodeClick={onNodeClick}
        />

        {/* Side panel during walkthrough */}
        {walkthroughActive && activeStep != null && layout.nodes[activeStep] && (
          <div className="w-80 shrink-0 overflow-y-auto border-l border-[#2a2a2a] bg-surface-container-lowest p-4">
            <DetailPanel
              node={layout.nodes[activeStep]}
              stepIndex={activeStep}
              totalSteps={layout.nodes.length}
              onPrev={goPrev}
              onNext={goNext}
              onStop={stopWalkthrough}
            />

            {/* Mini overview */}
            <div className="mt-6">
              <p className="mono-label mb-3">All Steps</p>
              <div className="space-y-1">
                {layout.nodes.map((node, i) => (
                  <button
                    key={i}
                    className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs transition ${
                      i === activeStep
                        ? "bg-primary-container/10 text-primary-container"
                        : i < activeStep
                        ? "text-on-surface-variant/60"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                    onClick={() => setActiveStep(i)}
                    type="button"
                  >
                    <span className="w-5 shrink-0 font-mono text-[10px] text-outline">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate">{node.fn}</span>
                    {i < activeStep && (
                      <span className="ml-auto text-primary-container/50">✓</span>
                    )}
                    {i === activeStep && (
                      <span className="ml-auto text-primary-container">●</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Feature summary */}
            {trace?.explanation && (
              <div className="mt-6">
                <p className="mono-label mb-2">Feature Summary</p>
                <p className="text-xs leading-relaxed text-on-surface-variant">
                  {trace.explanation.length > 300
                    ? trace.explanation.slice(0, 300) + "…"
                    : trace.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
