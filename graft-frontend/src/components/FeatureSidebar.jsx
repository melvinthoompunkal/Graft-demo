function MessageBox({ message }) {
  if (!message) {
    return null;
  }

  const tone =
    message.kind === "error"
      ? "border-red-500/40 bg-red-950/30 text-red-200"
      : "border-primary-container/40 bg-primary-container/10 text-on-surface";

  return <div className={`border px-4 py-3 text-sm ${tone}`}>{message.text}</div>;
}

function FeatureCard({ feature, active, traced, onSelect }) {
  return (
    <button
      className={`group relative w-full animate-fade-up border-l-2 p-5 text-left transition-all duration-200 ${
        active
          ? "border-[#00FF88] bg-surface-container-low shadow-neon"
          : "border-transparent hover:bg-surface-container-high"
      }`}
      onClick={() => onSelect(feature.slug)}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h3 className={`text-sm font-medium ${active ? "text-primary-container" : "text-on-surface"}`}>
              {feature.name}
            </h3>
            {traced ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-container">
                Traced
              </span>
            ) : null}
          </div>
          <p className="text-xs leading-relaxed text-on-surface-variant">{feature.description}</p>
        </div>
        <span className={`font-mono text-[10px] uppercase tracking-tighter ${active ? "text-primary-container" : "text-outline"}`}>
          Trace
        </span>
      </div>
    </button>
  );
}

export default function FeatureSidebar({
  repoTitle,
  repoMeta,
  githubUrl,
  githubToken,
  onGithubUrlChange,
  onGithubTokenChange,
  onIngest,
  isLoading,
  message,
  featureCountLabel,
  features,
  selectedFeatureSlug,
  traces,
  onSelectFeature,
  onRefresh,
}) {
  return (
    <section className="flex w-full flex-col border-r border-[#2a2a2a] bg-surface-container-lowest lg:w-[36%]">
      <div className="scan-grid space-y-5 border-b border-[#2a2a2a] p-6">
        <div>
          <p className="mono-label mb-3">Ingest Repository</p>
          <h1 className="font-mono text-lg font-bold tracking-tight text-on-surface">{repoTitle}</h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">{repoMeta}</p>
        </div>

        <form className="space-y-3" onSubmit={onIngest}>
          <div>
            <label className="mono-label mb-2 block" htmlFor="github-url">
              GitHub URL
            </label>
            <input
              id="github-url"
              className="input-shell"
              onChange={(event) => onGithubUrlChange(event.target.value)}
              placeholder="https://github.com/owner/repo"
              required
              type="url"
              value={githubUrl}
            />
          </div>
          <div>
            <label className="mono-label mb-2 block" htmlFor="github-token">
              GitHub Token <span className="normal-case tracking-normal text-on-surface-variant">(optional)</span>
            </label>
            <input
              id="github-token"
              className="input-shell"
              onChange={(event) => onGithubTokenChange(event.target.value)}
              placeholder="ghp_..."
              type="password"
              value={githubToken}
            />
          </div>
          <button
            className="flex w-full items-center justify-between bg-primary-container px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-[#003919] transition duration-200 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span>Ingesting...</span>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </>
            ) : (
              <>
                <span>Ingest Repo</span>
                <span className="material-symbols-outlined text-base">north_east</span>
              </>
            )}
          </button>
        </form>

        <MessageBox message={message} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] p-6">
          <div>
            <p className="mono-label mb-2">Extracted Features</p>
            <p className="text-sm text-on-surface-variant">{featureCountLabel}</p>
          </div>
          <button
            className="font-mono text-xs uppercase tracking-[0.18em] text-on-surface-variant transition hover:text-primary-container"
            onClick={onRefresh}
            type="button"
          >
            Refresh
          </button>
        </div>

        {features.length ? (
          <div className="divide-y divide-[#2a2a2a]/60">
            {features.map((feature, index) => (
              <div key={feature.slug} style={{ animationDelay: `${index * 35}ms` }}>
                <FeatureCard
                  active={feature.slug === selectedFeatureSlug}
                  feature={feature}
                  onSelect={onSelectFeature}
                  traced={Boolean(traces[feature.slug])}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-sm text-on-surface-variant">No features extracted yet.</div>
        )}
      </div>
    </section>
  );
}
