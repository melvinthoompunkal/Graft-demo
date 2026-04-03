function extensionBadge(path) {
  if (!path || !path.includes(".")) {
    return "SRC";
  }
  return path.split(".").pop().slice(0, 3).toUpperCase();
}

export default function CallChainTree({ callChain }) {
  if (!callChain?.length) {
    return <div className="text-sm text-on-surface-variant">No trace yet.</div>;
  }

  return (
    <div className="space-y-10">
      {callChain.map((item, index) => (
        <div className="relative animate-fade-up pl-12" key={`${item.file}-${item.function}-${item.line_start}`}>
          {index < callChain.length - 1 ? <div className="node-connector" /> : null}
          <div
            className={`absolute left-0 top-0 z-10 flex h-10 w-10 items-center justify-center bg-surface ${
              index === 0 ? "border-2 border-primary-container" : "border border-outline-variant"
            }`}
          >
            <span className="font-mono text-[10px] font-bold text-primary-container">
              {extensionBadge(item.file)}
            </span>
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2 font-mono text-sm">
              <span className="text-on-surface-variant">{item.file}</span>
              <span className="h-1 w-1 rounded-full bg-outline" />
              <span className="font-bold text-on-surface">{item.function}</span>
              <span className="text-[11px] text-outline">
                L{item.line_start}-{item.line_end}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">{item.role || "Load-bearing trace node."}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
