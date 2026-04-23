export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-outline-variant/10 bg-surface-container-lowest/50">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-base text-outline">eco</span>
          <span className="font-mono text-xs text-outline">
            Graft Demo — Pre-analyzed repository explorer
          </span>
        </div>

        <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-widest text-outline">
          <span>Zero API Cost</span>
          <span className="text-outline-variant/30">•</span>
          <span>Static JSON</span>
          <span className="text-outline-variant/30">•</span>
          <span>Open Source</span>
        </div>
      </div>
    </footer>
  );
}
