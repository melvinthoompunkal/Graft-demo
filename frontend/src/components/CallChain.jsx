export default function CallChain({ callChain }) {
  if (!callChain || callChain.length === 0) return null;

  return (
    <div className="space-y-0">
      {callChain.map((node, index) => (
        <div key={`${node.file}-${node.function}-${index}`} className="relative pl-10">
          {/* Connector line */}
          {index < callChain.length - 1 && <div className="node-connector" />}

          {/* Node */}
          <div className="mb-3 border border-outline-variant/15 bg-surface-container-low p-4 transition-colors hover:border-outline-variant/30">
            {/* Node header */}
            <div className="mb-2 flex items-start gap-3">
              {/* Step indicator */}
              <div className="absolute left-[12px] flex h-[18px] w-[18px] items-center justify-center border border-primary-container/30 bg-primary-container/10">
                <span className="font-mono text-[9px] font-bold text-primary-container">
                  {index + 1}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-primary-container">
                    {node.function}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                  <span className="text-on-surface-variant">{node.file}</span>
                  <span className="text-outline">
                    L{node.line_start}–{node.line_end}
                  </span>
                </div>
              </div>
            </div>

            {/* Role description */}
            <p className="text-xs leading-relaxed text-on-surface-variant/80">{node.role}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
