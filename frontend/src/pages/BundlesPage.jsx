import { useEffect, useState } from "react";

export default function BundlesPage({ apiBase, onNavigate }) {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    async function fetchBundles() {
      try {
        const response = await fetch(`${apiBase}/api/demo/bundles`);
        if (!response.ok) throw new Error("Failed to load bundles.");
        const data = await response.json();
        setBundles(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchBundles();
  }, [apiBase]);

  async function handleDownload(slug, name) {
    setDownloading(slug);
    try {
      const response = await fetch(`${apiBase}/api/demo/repos/${slug}/download`);
      if (!response.ok) throw new Error("Download failed.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}_analysis.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(null);
    }
  }

  const bundleIcons = {
    openbb_charting: "candlestick_chart",
    openclaw_telegram: "smart_toy",
    mirofish_subagent: "hub",
  };

  const bundleColors = {
    openbb_charting: "from-amber-500/15 to-orange-500/5",
    openclaw_telegram: "from-sky-500/15 to-cyan-500/5",
    mirofish_subagent: "from-violet-500/15 to-purple-500/5",
  };

  const bundleAccents = {
    openbb_charting: "border-amber-500/30 text-amber-400",
    openclaw_telegram: "border-sky-500/30 text-sky-400",
    mirofish_subagent: "border-violet-500/30 text-violet-400",
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="scan-grid border-b border-outline-variant/10">
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center border border-primary-container/30 bg-primary-container/10">
              <span className="material-symbols-outlined text-lg text-primary-container">
                package_2
              </span>
            </div>
            <p className="mono-label">Analysis Bundles</p>
          </div>
          <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
            Downloadable <span className="text-primary-container">Bundles</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
            Pre-computed deep-dive analyses of specific architectural patterns. Each bundle contains
            features, call chains, dependency graphs, and AI explanations. Download the JSON or
            explore interactively.
          </p>

          <div className="mt-6 flex flex-wrap gap-6 font-mono text-xs uppercase tracking-widest animate-fade-up">
            <div>
              <span className="text-primary-container">{bundles.length}</span>{" "}
              <span className="text-outline">bundles</span>
            </div>
            <div>
              <span className="text-primary-container">
                {bundles.reduce((sum, b) => sum + b.feature_count, 0)}
              </span>{" "}
              <span className="text-outline">features</span>
            </div>
            <div>
              <span className="text-primary-container">
                {bundles.reduce((sum, b) => sum + b.file_count, 0).toLocaleString()}
              </span>{" "}
              <span className="text-outline">files analyzed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bundle cards */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="mb-4 h-8 w-8 animate-spin border-2 border-outline-variant/30 border-t-primary-container" />
            <p className="font-mono text-xs uppercase tracking-widest text-outline">Loading bundles...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24">
            <span className="material-symbols-outlined mb-4 text-4xl text-outline">error</span>
            <p className="text-sm text-on-surface-variant">{error}</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {bundles.map((bundle, index) => {
              const icon = bundleIcons[bundle.slug] || "inventory_2";
              const gradient = bundleColors[bundle.slug] || "from-primary-container/15 to-primary-container/5";
              const accent = bundleAccents[bundle.slug] || "border-primary-container/30 text-primary-container";

              return (
                <div
                  key={bundle.slug}
                  className="animate-fade-up group relative flex flex-col overflow-hidden border border-outline-variant/15 bg-surface-container-lowest transition-all duration-300 hover:border-outline-variant/30"
                  style={{ animationDelay: `${index * 100}ms` }}
                  id={`bundle-card-${bundle.slug}`}
                >
                  {/* Gradient header */}
                  <div className={`bg-gradient-to-br ${gradient} px-6 pt-6 pb-5`}>
                    <div className="flex items-start justify-between">
                      <div className={`flex h-12 w-12 items-center justify-center border ${accent} bg-background/50`}>
                        <span className={`material-symbols-outlined text-2xl ${accent.split(" ").pop()}`}>
                          {icon}
                        </span>
                      </div>
                      <span className="rounded-sm border border-primary-container/20 bg-primary-container/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary-container">
                        Bundle
                      </span>
                    </div>

                    <div className="mt-4">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-outline">
                        {bundle.owner}
                      </p>
                      <h3 className="mt-1 font-headline text-xl font-bold tracking-tight text-on-surface">
                        {bundle.name}
                      </h3>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col px-6 pb-6 pt-4">
                    <p className="mb-5 flex-1 text-sm leading-relaxed text-on-surface-variant">
                      {bundle.description}
                    </p>

                    {/* Stats */}
                    <div className="mb-5 flex flex-wrap gap-3">
                      <span className="stat-chip">
                        <span className="material-symbols-outlined text-sm text-primary-container">
                          description
                        </span>
                        <span className="text-on-surface-variant">{bundle.file_count} files</span>
                      </span>
                      <span className="stat-chip">
                        <span className="material-symbols-outlined text-sm text-primary-container">
                          auto_awesome
                        </span>
                        <span className="text-on-surface-variant">{bundle.feature_count} features</span>
                      </span>
                      <span className="stat-chip">
                        <span className="material-symbols-outlined text-sm text-primary-container">
                          code
                        </span>
                        <span className="text-on-surface-variant">{bundle.language}</span>
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => onNavigate(`#/repo/${bundle.slug}`)}
                        className="btn-secondary flex-1 text-xs"
                        type="button"
                        id={`bundle-view-${bundle.slug}`}
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        View Analysis
                      </button>
                      <button
                        onClick={() => handleDownload(bundle.slug, bundle.name)}
                        disabled={downloading === bundle.slug}
                        className="btn-primary flex-1 text-xs"
                        type="button"
                        id={`bundle-download-${bundle.slug}`}
                      >
                        {downloading === bundle.slug ? (
                          <>
                            <div className="h-3.5 w-3.5 animate-spin border border-transparent border-t-current" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-sm">download</span>
                            Download JSON
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* How bundles work */}
        <div className="mt-16 border-t border-outline-variant/10 pt-12">
          <p className="mono-label mb-3">What's in a bundle?</p>
          <h2 className="mb-8 font-headline text-xl font-bold tracking-tight">
            Each bundle contains a <span className="text-primary-container">complete analysis</span>
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "auto_awesome", title: "Feature Extraction", desc: "AI-identified features with descriptions" },
              { icon: "account_tree", title: "Call Chains", desc: "Entry points → function call paths" },
              { icon: "share", title: "Graph Edges", desc: "Dependency relationships between modules" },
              { icon: "psychology", title: "AI Explanations", desc: "Natural language architecture walkthroughs" },
            ].map((item, i) => (
              <div
                key={item.title}
                className="border border-outline-variant/15 bg-surface-container-low p-5 animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="material-symbols-outlined mb-3 text-xl text-primary-container">
                  {item.icon}
                </span>
                <h4 className="mb-1 font-headline text-sm font-bold text-on-surface">{item.title}</h4>
                <p className="text-xs leading-relaxed text-on-surface-variant">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
