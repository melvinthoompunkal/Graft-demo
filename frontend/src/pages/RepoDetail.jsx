import { useEffect, useState } from "react";
import FeaturePanel from "../components/FeaturePanel.jsx";
import TraceViewer from "../components/TraceViewer.jsx";

export default function RepoDetail({ apiBase, slug, onNavigate }) {
  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);

  useEffect(() => {
    async function fetchRepo() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${apiBase}/api/demo/repos/${slug}`);
        if (!response.ok) throw new Error(`Repository "${slug}" not found.`);
        const data = await response.json();
        setRepo(data);
        // Auto-select first feature that has a trace
        const tracedSlugs = Object.keys(data.traces || {});
        if (tracedSlugs.length > 0) {
          setSelectedFeature(tracedSlugs[0]);
        } else if (data.features?.length > 0) {
          setSelectedFeature(data.features[0].slug);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchRepo();
  }, [apiBase, slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="mb-4 h-8 w-8 animate-spin border-2 border-outline-variant/30 border-t-primary-container" />
        <p className="font-mono text-xs uppercase tracking-widest text-outline">Loading analysis...</p>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <span className="material-symbols-outlined mb-4 text-5xl text-outline">error</span>
        <h2 className="mb-2 font-headline text-xl font-bold text-on-surface">Not Found</h2>
        <p className="mb-6 text-sm text-on-surface-variant">{error || "Repository data not available."}</p>
        <button onClick={() => onNavigate("#/library")} className="btn-secondary" type="button">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Library
        </button>
      </div>
    );
  }

  const tracedSlugs = Object.keys(repo.traces || {});
  const selectedTrace = selectedFeature ? repo.traces?.[selectedFeature] : null;
  const selectedFeatureObj = repo.features?.find((f) => f.slug === selectedFeature);

  return (
    <div className="relative">
      {/* Header */}
      <div className="scan-grid border-b border-outline-variant/10">
        <div className="mx-auto max-w-7xl px-6 pb-8 pt-10">
          {/* Breadcrumb */}
          <div className="mb-4 flex items-center gap-2 font-mono text-xs text-outline">
            <button
              onClick={() => onNavigate("#/library")}
              className="transition-colors hover:text-primary-container"
              type="button"
            >
              Library
            </button>
            <span>→</span>
            <span className="text-on-surface-variant">{repo.repo_owner}/{repo.repo_name}</span>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center border border-primary-container/30 bg-primary-container/10">
                  <span className="material-symbols-outlined text-2xl text-primary-container">
                    folder_open
                  </span>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-outline">
                    {repo.repo_owner}
                  </p>
                  <h1 className="font-headline text-2xl font-bold tracking-tight sm:text-3xl">
                    {repo.repo_name}
                  </h1>
                </div>
              </div>
            </div>

            <a
              href={repo.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              View on GitHub
            </a>
          </div>

          {/* Repo stats */}
          <div className="mt-6 flex flex-wrap gap-4">
            {[
              { icon: "description", label: `${repo.file_count} files` },
              { icon: "code", label: repo.languages_detected?.join(", ") || "Python" },
              { icon: "auto_awesome", label: `${repo.features?.length || 0} features` },
              { icon: "account_tree", label: `${tracedSlugs.length} traces` },
            ].map((stat) => (
              <span key={stat.label} className="stat-chip">
                <span className="material-symbols-outlined text-sm text-primary-container">
                  {stat.icon}
                </span>
                <span className="text-on-surface-variant">{stat.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Content: sidebar + trace viewer */}
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row">
          {/* Feature sidebar */}
          <aside className="w-full shrink-0 border-b border-outline-variant/10 lg:w-80 lg:border-b-0 lg:border-r">
            <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto">
              <div className="px-6 py-5">
                <p className="mono-label mb-1">Features</p>
                <p className="text-xs text-on-surface-variant">
                  {repo.features?.length || 0} extracted · {tracedSlugs.length} traced
                </p>
              </div>

              <div className="divide-y divide-outline-variant/10">
                {repo.features?.map((feature) => (
                  <FeaturePanel
                    key={feature.slug}
                    feature={feature}
                    isSelected={selectedFeature === feature.slug}
                    hasTrace={tracedSlugs.includes(feature.slug)}
                    onSelect={() => setSelectedFeature(feature.slug)}
                  />
                ))}
              </div>
            </div>
          </aside>

          {/* Trace detail */}
          <div className="flex-1 px-6 py-8 lg:px-10">
            {selectedFeatureObj && (
              <div className="mb-8">
                <p className="mono-label mb-2">Selected Feature</p>
                <h2 className="font-headline text-xl font-bold tracking-tight">
                  {selectedFeatureObj.name}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  {selectedFeatureObj.description}
                </p>
              </div>
            )}

            {selectedTrace ? (
              <TraceViewer trace={selectedTrace} featureName={selectedFeatureObj?.name} />
            ) : selectedFeature ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center border border-outline-variant/20 bg-surface-container-low">
                  <span className="material-symbols-outlined text-3xl text-outline">
                    info
                  </span>
                </div>
                <h3 className="mb-2 font-headline text-lg font-bold text-on-surface">
                  No trace available
                </h3>
                <p className="max-w-md text-sm text-on-surface-variant">
                  This feature was extracted from the README but hasn't been traced yet.
                  In the full Graft tool, you could run a trace to map its implementation path.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center border border-outline-variant/20 bg-surface-container-low">
                  <span className="material-symbols-outlined text-3xl text-outline">
                    touch_app
                  </span>
                </div>
                <h3 className="mb-2 font-headline text-lg font-bold text-on-surface">
                  Select a feature
                </h3>
                <p className="max-w-md text-sm text-on-surface-variant">
                  Choose a feature from the sidebar to view its implementation trace.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
