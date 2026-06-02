export function AgencyFeedPanel() {
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Operational Intent</h2>
        <span className="pill">Shared command view</span>
      </div>
      <div className="intent-grid">
        <article className="intent-card">
          <h3>Respond faster</h3>
          <p className="muted-copy">
            Reduce time lag between incident detection, leadership confirmation, and unit dispatch.
          </p>
        </article>
        <article className="intent-card">
          <h3>Relay clearly</h3>
          <p className="muted-copy">
            Push verified top-down instructions and field feedback through a single operational layer.
          </p>
        </article>
        <article className="intent-card">
          <h3>Inform residents</h3>
          <p className="muted-copy">
            Keep communities aligned with the latest public safety advisories without conflicting messages.
          </p>
        </article>
      </div>
    </section>
  );
}
