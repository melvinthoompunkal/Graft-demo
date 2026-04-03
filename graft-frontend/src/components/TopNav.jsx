export default function TopNav({ apiStatus, onReset, currentPage, onNavigate }) {
  const pages = [
    { id: "repositories", label: "Repositories" },
    { id: "traces", label: "Traces" },
    { id: "bundles", label: "Bundles" },
    { id: "map", label: "Map" },
  ];

  return (
    <header className="relative z-10 flex h-14 items-center justify-between border-b border-[#2a2a2a] bg-[#131313] px-6">
      <div className="flex items-center gap-4">
        <span className="font-mono text-xl tracking-tighter text-[#00FF88]">GRAFT</span>
        <div className="h-4 w-px bg-outline-variant/30" />
        <nav className="hidden gap-6 text-xs font-mono uppercase tracking-widest md:flex">
          {pages.map((page) => (
            <button
              className={`transition-colors duration-150 ${
                currentPage === page.id
                  ? "font-bold text-[#00FF88]"
                  : "text-zinc-400 hover:text-[#00FF88]"
              }`}
              key={page.id}
              onClick={() => onNavigate(page.id)}
              type="button"
            >
              {page.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-on-surface-variant md:inline">
          {apiStatus}
        </span>
        <button
          className="border border-outline-variant px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-on-surface-variant transition-all duration-200 hover:bg-[#2a2a2a] hover:text-[#00FF88] active:opacity-80"
          onClick={onReset}
          type="button"
        >
          Reset
        </button>
      </div>
    </header>
  );
}
