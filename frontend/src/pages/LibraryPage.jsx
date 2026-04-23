import { useEffect, useState } from "react";
import RepoCard from "../components/RepoCard.jsx";

export default function LibraryPage({ apiBase, onNavigate }) {
  const [repos, setRepos] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchRepos() {
      try {
        const response = await fetch(`${apiBase}/api/demo/repos`);
        if (!response.ok) throw new Error("Failed to load repository library.");
        const data = await response.json();
        setRepos(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchRepos();
  }, [apiBase]);

  const filtered = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(search.toLowerCase()) ||
      repo.description.toLowerCase().includes(search.toLowerCase()) ||
      repo.owner.toLowerCase().includes(search.toLowerCase())
  );

  const totalFeatures = repos.reduce((sum, r) => sum + r.feature_count, 0);
  const totalFiles = repos.reduce((sum, r) => sum + r.file_count, 0);

  return (
    <div className="relative">
      {/* Header */}
      <div className="scan-grid border-b border-outline-variant/10">
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-12">
          <p className="mono-label mb-3">Demo Library</p>
          <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
            Pre-Analyzed <span className="text-primary-container">Repositories</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
            Each repository has been analyzed by Graft's AI pipeline. Features have been extracted,
            implementation paths traced, and dependencies mapped — all served as static JSON.
          </p>

          {/* Stats */}
          <div className="mt-6 flex flex-wrap gap-6 font-mono text-xs uppercase tracking-widest animate-fade-up">
            <div>
              <span className="text-primary-container">{repos.length}</span>{" "}
              <span className="text-outline">repositories</span>
            </div>
            <div>
              <span className="text-primary-container">{totalFeatures}</span>{" "}
              <span className="text-outline">features extracted</span>
            </div>
            <div>
              <span className="text-primary-container">{totalFiles.toLocaleString()}</span>{" "}
              <span className="text-outline">files scanned</span>
            </div>
          </div>

          {/* Search */}
          <div className="mt-8 max-w-lg">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lg text-outline">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search repositories..."
                className="input-shell pl-11"
                id="library-search"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="mb-4 h-8 w-8 animate-spin border-2 border-outline-variant/30 border-t-primary-container" />
            <p className="font-mono text-xs uppercase tracking-widest text-outline">Loading library...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24">
            <span className="material-symbols-outlined mb-4 text-4xl text-outline">error</span>
            <p className="text-sm text-on-surface-variant">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <span className="material-symbols-outlined mb-4 text-4xl text-outline">search_off</span>
            <p className="text-sm text-on-surface-variant">
              No repositories match "{search}"
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((repo, index) => (
              <div
                key={repo.slug}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <RepoCard repo={repo} onNavigate={onNavigate} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
