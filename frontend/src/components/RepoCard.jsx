export default function RepoCard({ repo, onNavigate }) {
  return (
    <button
      onClick={() => onNavigate(`#/repo/${repo.slug}`)}
      className="glass-card glow-border group flex flex-col p-6 text-left transition-all duration-300 hover:-translate-y-1"
      type="button"
      id={`repo-card-${repo.slug}`}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border border-primary-container/20 bg-primary-container/5 transition-colors group-hover:border-primary-container/40 group-hover:bg-primary-container/10">
            <span className="material-symbols-outlined text-xl text-primary-container">
              folder_open
            </span>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-outline">
              {repo.owner}
            </p>
            <h3 className="font-headline text-lg font-bold tracking-tight text-on-surface">
              {repo.name}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1 font-mono text-xs text-outline">
          <span className="material-symbols-outlined text-sm">star</span>
          {repo.stars}
        </div>
      </div>

      {/* Description */}
      <p className="mb-5 flex-1 text-sm leading-relaxed text-on-surface-variant">
        {repo.description}
      </p>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <span className="stat-chip">
          <span className="material-symbols-outlined text-sm text-primary-container">
            description
          </span>
          <span className="text-on-surface-variant">{repo.file_count} files</span>
        </span>
        <span className="stat-chip">
          <span className="material-symbols-outlined text-sm text-primary-container">
            auto_awesome
          </span>
          <span className="text-on-surface-variant">{repo.feature_count} features</span>
        </span>
        <span className="stat-chip">
          <span className="material-symbols-outlined text-sm text-primary-container">
            code
          </span>
          <span className="text-on-surface-variant">{repo.language}</span>
        </span>
      </div>
    </button>
  );
}
