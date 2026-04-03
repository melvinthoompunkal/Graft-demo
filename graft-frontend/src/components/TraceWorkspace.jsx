import CallChainTree from "./CallChainTree.jsx";

function FilesPanel({ callChain }) {
  const uniqueFiles = [];
  const seen = new Set();

  for (const item of callChain || []) {
    if (!seen.has(item.file)) {
      seen.add(item.file);
      uniqueFiles.push(item);
    }
  }

  if (!uniqueFiles.length) {
    return <div className="text-sm text-on-surface-variant">Waiting for trace output.</div>;
  }

  return uniqueFiles.map((item) => (
    <div className="flex items-center justify-between gap-4 text-[11px] font-mono" key={`${item.file}-${item.line_start}`}>
      <div className="min-w-0 flex items-center gap-2">
        <span className="material-symbols-outlined text-sm text-primary-container">description</span>
        <span className="truncate text-on-surface">{item.file}</span>
      </div>
      <span className="whitespace-nowrap text-outline">
        L{item.line_start}-{item.line_end}
      </span>
    </div>
  ));
}

function EnvPanel({ envVars }) {
  if (!envVars?.length) {
    return <p className="text-on-surface-variant">No env vars detected yet.</p>;
  }

  return envVars.map((name) => (
    <div
      className="flex items-center justify-between border border-outline-variant/20 bg-surface-container-low px-3 py-2"
      key={name}
    >
      <span className="text-primary-container">{name}</span>
      <span className="text-outline">CHANGE_ME</span>
    </div>
  ));
}

function SessionCard({ sessionId, repoOwner, repoName, fileCount, languages, tracedFeatures }) {
  if (!sessionId) {
    return <p>No active session.</p>;
  }

  return (
    <>
      <div>
        <p className="mono-label mb-1">Session ID</p>
        <p className="break-all font-mono text-[11px] text-on-surface">{sessionId}</p>
      </div>
      <div>
        <p className="mono-label mb-1">Repository</p>
        <p className="text-on-surface">
          {repoOwner}/{repoName}
        </p>
      </div>
      <div>
        <p className="mono-label mb-1">Inventory</p>
        <p>
          {fileCount} files · {languages.join(", ") || "Unknown languages"}
        </p>
      </div>
      <div>
        <p className="mono-label mb-1">Traced Features</p>
        <p>{tracedFeatures.length ? tracedFeatures.join(", ") : "None yet"}</p>
      </div>
    </>
  );
}

export default function TraceWorkspace({
  selectedFeature,
  query,
  onQueryChange,
  onTrace,
  onBundle,
  trace,
  canBundle,
  session,
  isTracing,
}) {
  return (
    <section className="relative flex flex-1 flex-col overflow-hidden bg-surface">
      <div className="flex flex-col gap-5 border-b border-[#2a2a2a] p-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-2xl">
          <p className="mono-label mb-2">Trace Workspace</p>
          <h2 className="font-headline text-3xl font-bold tracking-tight">
            {selectedFeature ? (
              <>
                {selectedFeature.name} <span className="text-primary-container">Trace</span>
              </>
            ) : (
              <>
                Portable feature transplant <span className="text-primary-container">console</span>
              </>
            )}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
            {selectedFeature
              ? selectedFeature.description
              : "Ingest a repository, choose a feature, then ask Graft how it works. The trace, dependencies, env vars, and bundle action will all populate here."}
          </p>
        </div>

        <form className="w-full space-y-3 xl:w-[30rem]" onSubmit={onTrace}>
          <label className="mono-label block" htmlFor="nl-query">
            Natural language query
          </label>
          <textarea
            id="nl-query"
            className="input-shell min-h-28 resize-none bg-surface-container-low"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="How does authentication work?"
            required
            value={query}
          />
          <div className="flex gap-3">
            <button
              className="flex flex-1 items-center justify-between border border-primary-container px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-primary-container transition hover:bg-primary-container/10 disabled:opacity-40 disabled:cursor-not-allowed"
              type="submit"
              disabled={isTracing}
            >
              {isTracing ? (
                <>
                  <span>Tracing...</span>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </>
              ) : (
                <>
                  <span>Run Trace</span>
                  <span className="material-symbols-outlined text-base">account_tree</span>
                </>
              )}
            </button>
            <button
              className="border border-outline-variant/40 bg-surface-container-high px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-on-surface transition hover:border-primary-container hover:text-primary-container disabled:opacity-40"
              disabled={!canBundle || isTracing}
              onClick={onBundle}
              type="button"
            >
              Bundle
            </button>
          </div>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-24 md:p-8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.3fr)_23rem]">
          <div className="space-y-10">
            <section className="panel-shell animate-fade-up p-5 shadow-neon md:p-6">
              <h3 className="mono-label mb-6">Call Chain Tree</h3>
              <CallChainTree callChain={trace?.call_chain} />
            </section>

            <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <h3 className="mono-label">Files Involved</h3>
                <div className="panel-shell min-h-40 space-y-3 p-4">
                  <FilesPanel callChain={trace?.call_chain} />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="mono-label">Dependencies</h3>
                <div className="min-h-40 border border-outline-variant/20 bg-surface-container-low p-4">
                  <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-on-surface">
                    {trace?.third_party_deps?.length
                      ? trace.third_party_deps.join("\n")
                      : "No dependency slice yet."}
                  </pre>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="mono-label">Explanation</h3>
              <div className="panel-shell p-5 text-sm leading-7 text-on-surface-variant">
                {trace?.explanation || "The portable explanation will appear here after a trace runs."}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="panel-shell p-5">
              <h3 className="mono-label mb-4">Session State</h3>
              <div className="space-y-3 text-sm text-on-surface-variant">
                <SessionCard {...session} />
              </div>
            </section>

            <section className="panel-shell p-5">
              <h3 className="mono-label mb-4">Environment Variables</h3>
              <div className="space-y-2 font-mono text-[11px]">
                <EnvPanel envVars={trace?.env_vars} />
              </div>
            </section>

            <section className="panel-shell p-5">
              <h3 className="mono-label mb-4">Entry Point</h3>
              <div className="text-sm text-on-surface-variant">
                {trace?.entry_point?.file ? (
                  <>
                    <p className="font-mono text-on-surface">{trace.entry_point.file}</p>
                    <p className="mt-1">{trace.entry_point.function}</p>
                  </>
                ) : (
                  "No entry point yet."
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
