import { useEffect, useState } from "react";

export default function TryYourOwn({ apiBase, onNavigate }) {
  const [githubUrl, setGithubUrl] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    async function fetchQuota() {
      try {
        const response = await fetch(`${apiBase}/api/demo/quota`);
        if (response.ok) {
          setQuota(await response.json());
        }
      } catch {
        // Ignore quota fetch errors
      }
    }
    fetchQuota();
  }, [apiBase]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!githubUrl.trim()) return;

    setStatus("loading");
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${apiBase}/api/demo/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_url: githubUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError(`Rate limit reached. Try again in ${Math.ceil((data.reset_in || 86400) / 3600)} hours.`);
          setStatus("error");
        } else {
          setError(data.detail || "Analysis failed.");
          setStatus("error");
        }
        return;
      }

      setResult(data);
      setStatus("success");

      // Refresh quota
      try {
        const quotaRes = await fetch(`${apiBase}/api/demo/quota`);
        if (quotaRes.ok) setQuota(await quotaRes.json());
      } catch {}
    } catch (err) {
      setError(err.message || "Network error.");
      setStatus("error");
    }
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="scan-grid border-b border-outline-variant/10">
        <div className="mx-auto max-w-3xl px-6 pb-10 pt-12">
          <p className="mono-label mb-3">Live Analysis</p>
          <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
            Try <span className="text-primary-container">Your Own</span> Repository
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
            Submit a public GitHub repository URL and Graft will analyze it in real-time.
            Limited to 3 requests per day per IP to keep the demo free.
          </p>

          {/* Quota indicator */}
          {quota && (
            <div className="mt-6 flex items-center gap-3 animate-fade-up">
              <div className="flex gap-1">
                {[...Array(quota.limit || 3)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-6 transition-colors ${
                      i < (quota.remaining || 0)
                        ? "bg-primary-container"
                        : "bg-outline-variant/20"
                    }`}
                  />
                ))}
              </div>
              <span className="font-mono text-xs text-outline">
                {quota.remaining || 0} / {quota.limit || 3} requests remaining
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Form + Results */}
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Input form */}
        <form onSubmit={handleSubmit} className="mb-10">
          <label className="mono-label mb-3 block">GitHub Repository URL</label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lg text-outline">
                link
              </span>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="input-shell pl-11"
                required
                id="try-url-input"
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading" || (quota && quota.remaining <= 0)}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
              id="try-submit"
            >
              {status === "loading" ? (
                <>
                  <div className="h-4 w-4 animate-spin border-2 border-background/30 border-t-background" />
                  Analyzing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">science</span>
                  Analyze
                </>
              )}
            </button>
          </div>

          {quota && quota.remaining <= 0 && (
            <p className="mt-3 flex items-center gap-2 font-mono text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-sm text-outline">schedule</span>
              Daily limit reached. Resets in {Math.ceil((quota.reset_in || 86400) / 3600)} hours.
              <button
                type="button"
                onClick={() => onNavigate("#/library")}
                className="text-primary-container underline underline-offset-2 hover:no-underline"
              >
                Browse the library instead →
              </button>
            </p>
          )}
        </form>

        {/* Error */}
        {status === "error" && error && (
          <div className="mb-8 animate-fade-up border border-red-500/20 bg-red-500/5 p-5">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-lg text-red-400">error</span>
              <div>
                <h3 className="mb-1 font-headline text-sm font-bold text-red-400">Analysis Failed</h3>
                <p className="text-sm text-on-surface-variant">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {status === "success" && result && (
          <div className="animate-fade-up mb-10">
            <div className="border border-primary-container/20 bg-primary-container/5 p-6 md:p-8">
              <div className="flex items-start gap-3 mb-6">
                <span className="material-symbols-outlined text-2xl text-primary-container">
                  check_circle
                </span>
                <div className="w-full">
                  <h3 className="mb-1 font-headline text-xl font-bold text-on-surface">
                    {result.status === "coming_soon" ? "Coming Soon" : "Analysis Complete"}
                  </h3>
                  {result.github_url && (
                    <p className="font-mono text-sm text-outline">
                      {result.github_url}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats Bar */}
              <div className="mb-8 flex flex-wrap gap-4 font-mono text-xs uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary-container">folder</span>
                  <span className="font-bold text-primary-container">{result.file_count || 0}</span>
                  <span className="text-outline">files</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary-container">code</span>
                  <span className="font-bold text-primary-container">{(result.languages_detected || []).length}</span>
                  <span className="text-outline">languages</span>
                </div>
              </div>

              {/* Languages */}
              {result.languages_detected && result.languages_detected.length > 0 && (
                <div className="mb-8">
                  <h4 className="mono-label mb-3">Languages Detected</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.languages_detected.map(lang => (
                      <span key={lang} className="chip bg-surface-container-low border border-outline-variant/20 px-3 py-1 text-xs">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Features List */}
              {result.features && result.features.length > 0 && (
                <div>
                  <h4 className="mono-label mb-3">Extracted Features</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {result.features.map((feature) => (
                      <div key={feature.slug} className="glass-card glow-border p-4">
                        <h4 className="text-sm font-bold text-primary-container mb-1">{feature.name}</h4>
                        <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">{feature.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Idle state: show suggestions */}
        {status === "idle" && (
          <div className="animate-fade-up">
            <p className="mono-label mb-4">Or explore pre-analyzed repos</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { slug: "requests", name: "psf/requests", desc: "HTTP library" },
                { slug: "fastapi", name: "fastapi/fastapi", desc: "Modern web framework" },
                { slug: "rich", name: "Textualize/rich", desc: "Rich terminal output" },
                { slug: "pydantic", name: "pydantic/pydantic", desc: "Data validation" },
              ].map((repo) => (
                <button
                  key={repo.slug}
                  onClick={() => onNavigate(`#/repo/${repo.slug}`)}
                  className="glass-card glow-border flex items-center gap-4 p-4 text-left"
                  type="button"
                >
                  <span className="material-symbols-outlined text-lg text-primary-container">
                    folder_open
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{repo.name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-outline">
                      {repo.desc}
                    </p>
                  </div>
                  <span className="material-symbols-outlined ml-auto text-base text-outline">
                    arrow_forward
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
