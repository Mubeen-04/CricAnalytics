import '../styles/Loader.css';

export function Loader({ full = false, text = 'Loading...' }) {
  return (
    <div className={`loader ${full ? 'loader--full' : ''}`}>
      <div className="loader__spinner" />
      {text && <span className="loader__text">{text}</span>}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
        <div className="skeleton" style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-line skeleton-line--medium" />
          <div className="skeleton skeleton-line skeleton-line--short" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8 }} />
        ))}
      </div>
    </div>
  );
}

export default Loader;