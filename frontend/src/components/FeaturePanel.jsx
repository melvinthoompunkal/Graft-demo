export default function FeaturePanel({ feature, isSelected, hasTrace, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left transition-all duration-200 ${
        isSelected
          ? "border-l-2 border-l-primary-container bg-primary-container/5 pl-4 pr-5 py-4"
          : "border-l-2 border-l-transparent pl-4 pr-5 py-4 hover:border-l-outline-variant/40 hover:bg-surface-container-low/50"
      }`}
      type="button"
      id={`feature-${feature.slug}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h4
              className={`text-sm font-semibold ${
                isSelected ? "text-primary-container" : "text-on-surface"
              }`}
            >
              {feature.name}
            </h4>
            {hasTrace && (
              <span className="flex h-4 items-center border border-primary-container/30 bg-primary-container/10 px-1.5 font-mono text-[8px] uppercase tracking-widest text-primary-container">
                Traced
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed text-on-surface-variant line-clamp-2">
            {feature.description}
          </p>
        </div>

        <span
          className={`material-symbols-outlined mt-0.5 text-base transition-colors ${
            isSelected ? "text-primary-container" : "text-outline"
          }`}
        >
          {isSelected ? "radio_button_checked" : "radio_button_unchecked"}
        </span>
      </div>
    </button>
  );
}
