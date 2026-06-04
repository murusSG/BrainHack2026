export function QuickActionsPanel({ actions, onAction, activeAction }) {
  return (
    <section className="quick-actions-panel">
      <div className="section-heading quick-actions-heading">
        <div>
          <h2>Quick Actions</h2>
          <p>High-priority response shortcuts for command operators.</p>
        </div>
      </div>

      <div className="quick-actions-list">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`quick-action-button ${action.featured ? 'featured' : ''} ${
              activeAction === action.label ? 'active' : ''
            }`}
            onClick={() => onAction?.(action)}
          >
            <span className={`quick-action-icon icon-${action.icon}`} aria-hidden="true" />
            <span className="quick-action-copy">
              <span className="quick-action-label">{action.label}</span>
              <span className="quick-action-note">{action.note}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
