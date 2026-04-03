import { useState } from "react";
import CallChainTree from "./CallChainTree.jsx";

function TraceCard({ featureSlug, featureName, featureDescription, trace, isExpanded, onToggle }) {
  const fileCount = new Set((trace.call_chain || []).map((n) => n.file)).size;
  const depCount = trace.third_party_deps?.length || 0;
  const envCount = trace.env_vars?.length || 0;

  return (
    <div className="panel-shell animate-fade-up overflow-hidden">
      <button
        className="flex w-full items-center justify-between gap-3 p-5 text-left transition hover:bg-surface-container-high/40 md:p-6"
        onClick={onToggle}
        type="button"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-3">
            <h3 className="font-headline text-lg font-bold tracking-tight text-on-surface">
              {featureName}
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-container">
              Traced
            </span>
          </div>
          <p className="text-xs leading-relaxed text-on-surface-variant">{featureDescription}</p>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="hidden gap-4 font-mono text-[10px] uppercase tracking-widest text-outline sm:flex">
            <span>{trace.call_chain?.length || 0} nodes</span>
            <span>{fileCount} files</span>
            <span>{depCount} deps</span>
          </div>
          <span
            className={`material-symbols-outlined text-xl text-outline transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            expand_more
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[#2a2a2a] p-5 md:p-6">
          {/* Stats bar */}
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Call chain nodes", value: trace.call_chain?.length || 0, icon: "account_tree" },
              { label: "Files involved", value: fileCount, icon: "description" },
              { label: "Dependencies", value: depCount, icon: "package_2" },
              { label: "Env variables", value: envCount, icon: "key" },
            ].map((stat) => (
              <div
                className="border border-outline-variant/20 bg-surface-container-low p-3"
                key={stat.label}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary-container">
                    {stat.icon}
                  </span>
                  <span className="font-mono text-lg font-bold text-on-surface">{stat.value}</span>
                </div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-outline">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Entry point */}
          {trace.entry_point?.file && (
            <div className="mb-8">
              <h4 className="mono-label mb-3">Entry Point</h4>
              <div className="flex items-center gap-3 border border-primary-container/30 bg-primary-container/5 px-4 py-3">
                <span className="material-symbols-outlined text-base text-primary-container">
                  play_arrow
                </span>
                <div className="font-mono text-sm">
                  <span className="text-on-surface">{trace.entry_point.file}</span>
                  <span className="mx-2 text-outline">→</span>
                  <span className="font-bold text-primary-container">{trace.entry_point.function}</span>
                </div>
              </div>
            </div>
          )}

          {/* Call chain */}
          <div className="mb-8">
            <h4 className="mono-label mb-4">Call Chain</h4>
            <CallChainTree callChain={trace.call_chain} />
          </div>

          {/* Dependencies & Env Vars side-by-side */}
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h4 className="mono-label mb-3">Dependencies</h4>
              <div className="border border-outline-variant/20 bg-surface-container-low p-4">
                {trace.third_party_deps?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {trace.third_party_deps.map((dep) => (
                      <span
                        className="border border-outline-variant/30 bg-surface px-2.5 py-1 font-mono text-[11px] text-on-surface"
                        key={dep}
                      >
                        {dep}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-on-surface-variant">No third-party dependencies.</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="mono-label mb-3">Environment Variables</h4>
              <div className="space-y-2">
                {trace.env_vars?.length ? (
                  trace.env_vars.map((v) => (
                    <div
                      className="flex items-center justify-between border border-outline-variant/20 bg-surface-container-low px-3 py-2 font-mono text-[11px]"
                      key={v}
                    >
                      <span className="text-primary-container">{v}</span>
                      <span className="text-outline">required</span>
                    </div>
                  ))
                ) : (
                  <div className="border border-outline-variant/20 bg-surface-container-low p-4">
                    <p className="text-sm text-on-surface-variant">No env vars detected.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Explanation */}
          {trace.explanation && (
            <div>
              <h4 className="mono-label mb-3">AI Explanation</h4>
              <div className="border border-outline-variant/20 bg-surface-container-low p-5 text-sm leading-7 text-on-surface-variant">
                {trace.explanation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TracesPage({ features, traces }) {
  const [expandedSlug, setExpandedSlug] = useState(null);

  const tracedFeatures = features.filter((f) => traces[f.slug]);
  const totalNodes = Object.values(traces).reduce(
    (sum, t) => sum + (t.call_chain?.length || 0),
    0
  );
  const totalFiles = new Set(
    Object.values(traces).flatMap((t) => (t.call_chain || []).map((n) => n.file))
  ).size;
  const totalDeps = new Set(
    Object.values(traces).flatMap((t) => t.third_party_deps || [])
  ).size;

  return (
    <section className="relative flex flex-1 flex-col overflow-hidden bg-surface">
      {/* Header */}
      <div className="scan-grid border-b border-[#2a2a2a] p-6 md:p-8">
        <div className="mx-auto max-w-5xl">
          <p className="mono-label mb-2">Trace History</p>
          <h2 className="font-headline text-3xl font-bold tracking-tight">
            Feature <span className="text-primary-container">Traces</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
            Every trace maps a feature's implementation across the codebase — the call chain, files
            touched, third-party dependencies, and environment variables needed to transplant it.
            Think of each trace as the "blueprint" you'd hand to someone recreating that feature
            from scratch.
          </p>

          {/* Summary stats */}
          {tracedFeatures.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-6 font-mono text-xs uppercase tracking-widest">
              <div>
                <span className="text-primary-container">{tracedFeatures.length}</span>{" "}
                <span className="text-outline">traced features</span>
              </div>
              <div>
                <span className="text-primary-container">{totalNodes}</span>{" "}
                <span className="text-outline">total nodes</span>
              </div>
              <div>
                <span className="text-primary-container">{totalFiles}</span>{" "}
                <span className="text-outline">unique files</span>
              </div>
              <div>
                <span className="text-primary-container">{totalDeps}</span>{" "}
                <span className="text-outline">unique deps</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 pb-24 md:p-8">
        <div className="mx-auto max-w-5xl space-y-4">
          {tracedFeatures.length > 0 ? (
            tracedFeatures.map((feature, index) => (
              <div key={feature.slug} style={{ animationDelay: `${index * 60}ms` }}>
                <TraceCard
                  featureSlug={feature.slug}
                  featureName={feature.name}
                  featureDescription={feature.description}
                  trace={traces[feature.slug]}
                  isExpanded={expandedSlug === feature.slug}
                  onToggle={() =>
                    setExpandedSlug(expandedSlug === feature.slug ? null : feature.slug)
                  }
                />
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center border border-outline-variant/30 bg-surface-container-low">
                <span className="material-symbols-outlined text-4xl text-outline">
                  account_tree
                </span>
              </div>
              <h3 className="mb-2 font-headline text-xl font-bold text-on-surface">
                No traces yet
              </h3>
              <p className="max-w-md text-sm leading-relaxed text-on-surface-variant">
                Head to the <span className="text-primary-container">Repositories</span> tab, ingest
                a GitHub repo, select a feature, and run your first trace. Each trace will appear
                here with its full call chain and dependency breakdown.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
