export default function LandingPage({ onNavigate }) {
  const highlights = [
    {
      icon: "bolt",
      title: "Zero API Cost",
      description:
        "Browse pre-analyzed repos instantly. All analysis is pre-computed — no API calls, no waiting, no token costs.",
    },
    {
      icon: "inventory_2",
      title: "10 Popular Repos",
      description:
        "Explore feature extraction and code traces from requests, flask, fastapi, rich, pydantic, and more.",
    },
    {
      icon: "account_tree",
      title: "Full Trace Data",
      description:
        "Entry points, call chains, dependency graphs, environment variables, and AI-generated explanations.",
    },
  ];

  return (
    <div className="relative">
      {/* Hero */}
      <section className="scan-grid relative overflow-hidden">
        {/* Floating glow orbs */}
        <div className="pointer-events-none absolute -top-20 right-1/4 h-80 w-80 rounded-full bg-primary-container/5 blur-[100px] animate-float" />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 h-60 w-60 rounded-full bg-primary-container/3 blur-[80px] animate-float" style={{ animationDelay: "3s" }} />

        <div className="mx-auto max-w-5xl px-6 pb-24 pt-20 sm:pt-28 md:pb-32">
          <div className="animate-fade-up">
            <p className="mono-label mb-5 flex items-center gap-2">
              <span className="inline-block h-2 w-2 animate-glow-pulse bg-primary-container" />
              AI-Powered Repository Analysis
            </p>
            <h1 className="font-headline text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Explore how open source
              <br />
              <span className="gradient-text">actually works.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-on-surface-variant">
              Graft extracts features, traces implementation paths, and maps dependencies
              across codebases using AI sub-agents. Browse our pre-analyzed library of popular
              Python repositories — zero cost, zero setup.
            </p>
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap gap-4 animate-fade-up" style={{ animationDelay: "150ms" }}>
            <button
              onClick={() => onNavigate("#/library")}
              className="btn-primary"
              type="button"
              id="cta-library"
            >
              <span className="material-symbols-outlined text-lg">library_books</span>
              Explore Library
            </button>
            <button
              onClick={() => onNavigate("#/try")}
              className="btn-secondary"
              type="button"
              id="cta-try"
            >
              <span className="material-symbols-outlined text-lg">science</span>
              Try Your Own
            </button>
          </div>

          {/* Hero stats */}
          <div className="mt-14 flex flex-wrap gap-8 font-mono text-sm animate-fade-up" style={{ animationDelay: "300ms" }}>
            {[
              { value: "10", label: "Repos Analyzed" },
              { value: "65+", label: "Features Extracted" },
              { value: "25+", label: "Traces Generated" },
              { value: "$0", label: "Per-Request Cost" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary-container">{stat.value}</span>
                <span className="text-xs uppercase tracking-widest text-outline">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="border-t border-outline-variant/10 bg-surface-container-lowest/40">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <p className="mono-label mb-4">How It Works</p>
          <h2 className="font-headline text-2xl font-bold tracking-tight sm:text-3xl">
            Pre-analyzed. <span className="text-primary-container">Pre-computed.</span> Pre-loaded.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
            We ran Graft's full AI pipeline on each repository once. The results are stored as static
            JSON — the demo serves them instantly with zero runtime cost.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {highlights.map((item, index) => (
              <div
                key={item.title}
                className="glass-card glow-border p-6 animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center border border-primary-container/20 bg-primary-container/5">
                  <span className="material-symbols-outlined text-2xl text-primary-container">
                    {item.icon}
                  </span>
                </div>
                <h3 className="mb-2 font-headline text-lg font-bold text-on-surface">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-on-surface-variant">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Repo preview strip */}
      <section className="border-t border-outline-variant/10">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="mono-label mb-2">Featured Repositories</p>
              <h2 className="font-headline text-xl font-bold tracking-tight">
                Popular <span className="text-primary-container">Python</span> projects
              </h2>
            </div>
            <button
              onClick={() => onNavigate("#/library")}
              className="btn-secondary text-xs"
              type="button"
              id="cta-view-all"
            >
              View All
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {["requests", "flask", "fastapi", "rich"].map((name, index) => (
              <button
                key={name}
                onClick={() => onNavigate(`#/repo/${name}`)}
                className="glass-card glow-border p-5 text-left animate-fade-up"
                style={{ animationDelay: `${index * 80}ms` }}
                type="button"
                id={`preview-${name}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-primary-container">
                    folder_open
                  </span>
                  <span className="font-headline font-bold text-on-surface">{name}</span>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-outline">
                  Click to explore →
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
