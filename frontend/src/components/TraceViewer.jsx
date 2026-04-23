import CallChain from "./CallChain.jsx";

export default function TraceViewer({ trace, featureName }) {
  if (!trace) return null;

  const fileCount = new Set((trace.call_chain || []).map((n) => n.file)).size;
  const depCount = trace.third_party_deps?.length || 0;
  const envCount = trace.env_vars?.length || 0;

  return (
    <div className="animate-fade-up space-y-8">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Call Chain Nodes", value: trace.call_chain?.length || 0, icon: "account_tree" },
          { label: "Files Involved", value: fileCount, icon: "description" },
          { label: "Dependencies", value: depCount, icon: "package_2" },
          { label: "Env Variables", value: envCount, icon: "key" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-outline-variant/15 bg-surface-container-low p-4"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-primary-container">
                {stat.icon}
              </span>
              <span className="font-mono text-xl font-bold text-on-surface">{stat.value}</span>
            </div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-outline">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Entry point */}
      {trace.entry_point?.file && (
        <div>
          <h4 className="mono-label mb-3">Entry Point</h4>
          <div className="flex items-center gap-3 border border-primary-container/25 bg-primary-container/5 px-5 py-4">
            <span className="material-symbols-outlined text-lg text-primary-container">
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
      {trace.call_chain?.length > 0 && (
        <div>
          <h4 className="mono-label mb-4">Call Chain</h4>
          <CallChain callChain={trace.call_chain} />
        </div>
      )}

      {/* Dependencies & Env vars */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h4 className="mono-label mb-3">Third-Party Dependencies</h4>
          <div className="border border-outline-variant/15 bg-surface-container-low p-4">
            {trace.third_party_deps?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {trace.third_party_deps.map((dep) => (
                  <span
                    key={dep}
                    className="border border-outline-variant/25 bg-surface px-3 py-1.5 font-mono text-[11px] text-on-surface transition-colors hover:border-primary-container/30"
                  >
                    {dep}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">No third-party dependencies detected.</p>
            )}
          </div>
        </div>

        <div>
          <h4 className="mono-label mb-3">Environment Variables</h4>
          <div className="space-y-2">
            {trace.env_vars?.length > 0 ? (
              trace.env_vars.map((v) => (
                <div
                  key={v}
                  className="flex items-center justify-between border border-outline-variant/15 bg-surface-container-low px-4 py-2.5 font-mono text-[11px]"
                >
                  <span className="text-primary-container">{v}</span>
                  <span className="text-outline">required</span>
                </div>
              ))
            ) : (
              <div className="border border-outline-variant/15 bg-surface-container-low p-4">
                <p className="text-sm text-on-surface-variant">No environment variables detected.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Explanation */}
      {trace.explanation && (
        <div>
          <h4 className="mono-label mb-3">AI Explanation</h4>
          <div className="border border-outline-variant/15 bg-surface-container-low p-6 text-sm leading-7 text-on-surface-variant">
            {trace.explanation}
          </div>
        </div>
      )}

      {/* Candidate files */}
      {trace.candidate_files?.length > 0 && (
        <div>
          <h4 className="mono-label mb-3">Analyzed Files</h4>
          <div className="flex flex-wrap gap-2">
            {trace.candidate_files.map((file) => (
              <span
                key={file}
                className="border border-outline-variant/15 bg-surface-container-low px-3 py-1.5 font-mono text-[10px] text-on-surface-variant"
              >
                {file}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
