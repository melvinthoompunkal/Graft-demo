export default function BundlesPage({ features, traces, repoName, repoOwner, sessionId, onBundle, isBundling }) {
  const tracedFeatures = features.filter((f) => traces[f.slug]);

  return (
    <section className="relative flex flex-1 flex-col overflow-hidden bg-surface">
      {/* Header */}
      <div className="scan-grid border-b border-[#2a2a2a] p-6 md:p-8">
        <div className="mx-auto max-w-5xl">
          <p className="mono-label mb-2">Export &amp; Transplant</p>
          <h2 className="font-headline text-3xl font-bold tracking-tight">
            Feature <span className="text-primary-container">Bundles</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
            A bundle is a portable ZIP archive containing every file needed to transplant a feature
            into a new project — source code slices, dependency manifests, environment variable
            templates, and a wiring guide. Download a bundle, drop it into your project, and follow
            the included README to integrate.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 pb-24 md:p-8">
        <div className="mx-auto max-w-5xl">
          {tracedFeatures.length > 0 ? (
            <>
              {/* What's in a bundle */}
              <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    icon: "code",
                    title: "Source Slices",
                    description:
                      "Only the code that powers the feature — trimmed to the exact functions and classes involved.",
                  },
                  {
                    icon: "package_2",
                    title: "Dependency Manifest",
                    description:
                      "A list of third-party packages the feature relies on, ready to paste into your package manager.",
                  },
                  {
                    icon: "key",
                    title: "Env Template",
                    description:
                      "A .env template listing every environment variable the feature reads, so nothing is missed.",
                  },
                  {
                    icon: "menu_book",
                    title: "Wiring Guide",
                    description:
                      "Step-by-step instructions on how to connect the feature into your own app's routing, state, and config.",
                  },
                ].map((item) => (
                  <div
                    className="panel-shell animate-fade-up space-y-2 p-5"
                    key={item.title}
                  >
                    <div className="flex h-10 w-10 items-center justify-center border border-outline-variant/30 bg-surface-container-low">
                      <span className="material-symbols-outlined text-lg text-primary-container">
                        {item.icon}
                      </span>
                    </div>
                    <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-on-surface">
                      {item.title}
                    </h4>
                    <p className="text-xs leading-relaxed text-on-surface-variant">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Available bundles */}
              <h3 className="mono-label mb-4">Available for Bundling</h3>
              <div className="space-y-3">
                {tracedFeatures.map((feature, index) => {
                  const trace = traces[feature.slug];
                  const fileCount = new Set(
                    (trace.call_chain || []).map((n) => n.file)
                  ).size;
                  const depCount = trace.third_party_deps?.length || 0;
                  const envCount = trace.env_vars?.length || 0;

                  return (
                    <div
                      className="panel-shell animate-fade-up flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                      key={feature.slug}
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-3">
                          <h4 className="font-headline text-base font-bold text-on-surface">
                            {feature.name}
                          </h4>
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-container">
                            Ready
                          </span>
                        </div>
                        <p className="mb-2 text-xs text-on-surface-variant">
                          {feature.description}
                        </p>
                        <div className="flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-widest text-outline">
                          <span>{trace.call_chain?.length || 0} nodes</span>
                          <span>{fileCount} files</span>
                          <span>{depCount} deps</span>
                          <span>{envCount} env vars</span>
                        </div>
                      </div>

                      <button
                        className="flex shrink-0 items-center gap-2 bg-primary-container px-5 py-3 font-mono text-xs uppercase tracking-[0.2em] text-[#003919] transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => onBundle(feature.slug)}
                        disabled={isBundling}
                        type="button"
                      >
                        {isBundling ? (
                          <>
                            <span>Bundling...</span>
                            <svg
                              className="h-4 w-4 animate-spin"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                          </>
                        ) : (
                          <>
                            <span>Download</span>
                            <span className="material-symbols-outlined text-base">
                              download
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* How-to section */}
              <div className="mt-10 border border-outline-variant/20 bg-surface-container-lowest p-6 md:p-8">
                <h3 className="mono-label mb-4">How to Use a Bundle</h3>
                <div className="space-y-5">
                  {[
                    {
                      step: "01",
                      title: "Download & Extract",
                      description:
                        "Click the download button above. Unzip the archive into your project's root directory.",
                    },
                    {
                      step: "02",
                      title: "Install Dependencies",
                      description:
                        "Open the included dependency manifest and install any packages you don't already have.",
                    },
                    {
                      step: "03",
                      title: "Set Environment Variables",
                      description:
                        "Copy the values from the .env template into your project's environment. Fill in real credentials where indicated.",
                    },
                    {
                      step: "04",
                      title: "Wire It Up",
                      description:
                        "Follow the wiring guide to connect the feature's entry point into your application's routing or initialization code.",
                    },
                    {
                      step: "05",
                      title: "Test & Iterate",
                      description:
                        "Run your project and verify the feature works. The trace explanation in the Traces tab can help you debug unfamiliar paths.",
                    },
                  ].map((item, index) => (
                    <div
                      className="flex gap-4"
                      key={item.step}
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-primary-container/40 font-mono text-xs font-bold text-primary-container">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="mb-0.5 text-sm font-bold text-on-surface">{item.title}</h4>
                        <p className="text-xs leading-relaxed text-on-surface-variant">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center border border-outline-variant/30 bg-surface-container-low">
                <span className="material-symbols-outlined text-4xl text-outline">
                  inventory_2
                </span>
              </div>
              <h3 className="mb-2 font-headline text-xl font-bold text-on-surface">
                No bundles available
              </h3>
              <p className="max-w-md text-sm leading-relaxed text-on-surface-variant">
                Bundles are generated from traced features. Go to{" "}
                <span className="text-primary-container">Repositories</span>, ingest a repo,
                run a trace on a feature, and then come back here to download its portable bundle.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
