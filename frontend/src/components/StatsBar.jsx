export default function StatsBar({ stats }) {
  return (
    <div className="flex flex-wrap gap-4 font-mono text-xs uppercase tracking-widest">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-primary-container">
            {stat.icon}
          </span>
          <span className="font-bold text-primary-container">{stat.value}</span>
          <span className="text-outline">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
