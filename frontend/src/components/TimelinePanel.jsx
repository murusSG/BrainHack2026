import { timelineItems } from '../data/dashboardData';

export function TimelinePanel({ commandItems = [] }) {
  const items = [...commandItems, ...timelineItems];

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Live Event Timeline</h2>
        <span className="pill live-feed-pill">{commandItems.length ? 'Command + live feed' : 'Live feed'}</span>
      </div>

      <div className="timeline-list">
        {items.map((item) => (
          <article key={item.id ?? `${item.time}-${item.title}`} className="timeline-item">
            <div className={`timeline-dot severity-${item.severity}`} />
            <div className="timeline-body">
              <div className="timeline-meta-row">
                <span className="timeline-time">{item.time}</span>
                <span className="timeline-location">{item.location}</span>
              </div>
              <h3>{item.title}</h3>
              <p className="muted-copy">{item.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
