export function RecommendationPanel({ recommendations }) {
  return (
    <section className="recommendation-panel">
      <div className="section-heading light">
        <div>
          <h2>AI Recommendations</h2>
          <p>Based on real-time incident density and historical response trends.</p>
        </div>
      </div>

      <div className="recommendation-list">
        {recommendations.map((item) => (
          <article key={item.category} className="recommendation-card">
            <div className="recommendation-header">
              <p>{item.category}</p>
              <span className="priority-tag">{item.priority}</span>
            </div>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
