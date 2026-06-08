import { useEffect, useMemo, useState } from 'react';
import { allocationRecommendations } from '../data/dashboardData';

const STATUS_LABEL = {
  pending_approval: 'Pending approval',
  approved: 'Approved',
  contacted: 'Contacted',
  rejected: 'Rejected',
};

function buildInitialStatus(agencies) {
  return Object.fromEntries(agencies.map((agency) => [agency.id, agency.status]));
}

function buildInitialSelection(agencies) {
  return Object.fromEntries(agencies.map((agency) => [agency.id, agency.status !== 'rejected']));
}

export function AllocationApprovalPanel({
  recommendation = allocationRecommendations[0],
  commandStateStatus = 'done',
  onAgencyStatusChange,
  showContactAction = true,
  showGeneratedAt = true,
}) {
  const [agencyStatus, setAgencyStatus] = useState(() => buildInitialStatus(recommendation.agencies));
  const [selectedAgencies, setSelectedAgencies] = useState(() => buildInitialSelection(recommendation.agencies));
  const [draftMessage, setDraftMessage] = useState(recommendation.draftMessage);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setAgencyStatus(buildInitialStatus(recommendation.agencies));
    setSelectedAgencies(buildInitialSelection(recommendation.agencies));
    setDraftMessage(recommendation.draftMessage);
  }, [recommendation]);

  const counts = useMemo(() => {
    return recommendation.agencies.reduce(
      (summary, agency) => {
        const status = agencyStatus[agency.id];
        if (selectedAgencies[agency.id]) summary.selected += 1;
        if (status === 'pending_approval') summary.pending += 1;
        if (status === 'approved') summary.approved += 1;
        if (status === 'contacted') summary.contacted += 1;
        return summary;
      },
      { selected: 0, pending: 0, approved: 0, contacted: 0 }
    );
  }, [agencyStatus, recommendation.agencies, selectedAgencies]);

  const approvalTrail = useMemo(() => {
    return recommendation.agencies
      .map((agency) => ({
        agency: agency.agency,
        status: agencyStatus[agency.id],
      }))
      .filter((item) => item.status !== 'pending_approval');
  }, [agencyStatus, recommendation.agencies]);

  async function persistAgencyStatus(agencyIds, status) {
    if (!onAgencyStatusChange || !recommendation.id) return null;
    setIsSyncing(true);
    try {
      return await onAgencyStatusChange(recommendation.id, agencyIds, status);
    } finally {
      setIsSyncing(false);
    }
  }

  async function updateAgencyStatus(agencyId, status) {
    setAgencyStatus((current) => ({ ...current, [agencyId]: status }));
    if (status === 'rejected') {
      setSelectedAgencies((current) => ({ ...current, [agencyId]: false }));
    }
    await persistAgencyStatus([agencyId], status);
  }

  async function approveSelected() {
    const agencyIds = recommendation.agencies
      .filter((agency) => selectedAgencies[agency.id] && agencyStatus[agency.id] === 'pending_approval')
      .map((agency) => agency.id);

    setAgencyStatus((current) => {
      const next = { ...current };
      recommendation.agencies.forEach((agency) => {
        if (selectedAgencies[agency.id] && next[agency.id] === 'pending_approval') {
          next[agency.id] = 'approved';
        }
      });
      return next;
    });
    if (agencyIds.length) await persistAgencyStatus(agencyIds, 'approved');
  }

  async function contactApproved() {
    const agencyIds = recommendation.agencies
      .filter((agency) => selectedAgencies[agency.id] && agencyStatus[agency.id] === 'approved')
      .map((agency) => agency.id);

    setAgencyStatus((current) => {
      const next = { ...current };
      recommendation.agencies.forEach((agency) => {
        if (selectedAgencies[agency.id] && next[agency.id] === 'approved') {
          next[agency.id] = 'contacted';
        }
      });
      return next;
    });
    if (agencyIds.length) await persistAgencyStatus(agencyIds, 'contacted');
  }

  function toggleSelected(agencyId) {
    setSelectedAgencies((current) => ({ ...current, [agencyId]: !current[agencyId] }));
  }

  return (
    <section
      id="dispatcher-review-queue"
      className="allocation-panel panel"
      aria-labelledby="allocation-title"
    >
      <div className="section-heading allocation-heading">
        <div>
          <p className="eyebrow">AI-assisted allocation</p>
          <h2 id="allocation-title">Dispatcher Review Queue</h2>
          <p>Dispatcher approval is required before any agency is contacted.</p>
        </div>
        <span className="allocation-risk-pill">{recommendation.severity}</span>
      </div>

      {recommendation.generatedFrom && (
        <div className="allocation-origin">
          <span>{recommendation.generatedFrom}</span>
          {recommendation.linkedPrediction && <strong>{recommendation.linkedPrediction}</strong>}
          <em>
            {commandStateStatus === 'error'
              ? 'Local fallback'
              : commandStateStatus === 'loading'
                ? 'Loading command state'
                : 'Saved to command state'}
          </em>
        </div>
      )}

      <div className="allocation-incident">
        <div>
          <span className="allocation-code">{recommendation.incidentId}</span>
          <h3>{recommendation.incidentTitle}</h3>
          <p>
            {recommendation.confidence}% model confidence
            {showGeneratedAt ? ` / generated ${recommendation.generatedAt}` : ''}
          </p>
        </div>
        <span className="allocation-model">{recommendation.modelVersion}</span>
      </div>

      <div className="allocation-signal-row" aria-label="Trigger signals">
        {recommendation.triggerSignals.map((signal) => (
          <span key={signal}>{signal}</span>
        ))}
      </div>

      <div className="allocation-agency-list">
        {recommendation.agencies.map((agency) => {
          const status = agencyStatus[agency.id];
          const isSelected = Boolean(selectedAgencies[agency.id]);
          const isLocked = status === 'contacted';

          return (
            <article key={agency.id} className={`allocation-agency-row is-${status}`}>
              <label className="allocation-select">
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isLocked}
                  onChange={() => toggleSelected(agency.id)}
                  aria-label={`Select ${agency.agency}`}
                />
              </label>
              <div className="agency-token" aria-hidden="true">
                {agency.agency}
              </div>
              <div className="allocation-agency-copy">
                <div className="allocation-agency-top">
                  <div>
                    <h3>{agency.agency}</h3>
                    <p>{agency.channel}</p>
                  </div>
                  <span className={`allocation-status is-${status}`}>{STATUS_LABEL[status]}</span>
                </div>
                <p className="allocation-reason">{agency.reason}</p>
                <p className="allocation-action">{agency.suggestedAction}</p>
              </div>
              <div className="allocation-agency-controls">
                <span>{agency.confidence}%</span>
                <button
                  type="button"
                  className="allocation-mini-button"
                  disabled={status !== 'pending_approval' || isSyncing}
                  onClick={() => updateAgencyStatus(agency.id, 'approved')}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="allocation-mini-button muted"
                  disabled={status !== 'pending_approval' || isSyncing}
                  onClick={() => updateAgencyStatus(agency.id, 'rejected')}
                >
                  Reject
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <label className="allocation-message">
        <span>Draft coordination note</span>
        <textarea
          rows="3"
          value={draftMessage}
          onChange={(event) => setDraftMessage(event.target.value)}
        />
      </label>

      <div className="allocation-footer">
        <div className="allocation-summary">
          <span>{counts.selected} selected</span>
          <span>{counts.approved} approved</span>
          <span>{counts.contacted} contacted</span>
        </div>
        <div className="allocation-bulk-actions">
          <button
            type="button"
            className="ghost-button compact-button"
            disabled={counts.pending === 0 || counts.selected === 0 || isSyncing}
            onClick={approveSelected}
          >
            Approve selected
          </button>
          {showContactAction && (
            <button
              type="button"
              className="primary-button compact-button"
              disabled={counts.approved === 0 || isSyncing}
              onClick={contactApproved}
            >
              Contact agencies
            </button>
          )}
        </div>
      </div>

      <div className="allocation-trail">
        <p>Approval trail</p>
        {approvalTrail.length ? (
          approvalTrail.map((item) => (
            <span key={`${item.agency}-${item.status}`}>
              {item.agency}: {STATUS_LABEL[item.status]}
            </span>
          ))
        ) : (
          <span>Awaiting dispatcher decision</span>
        )}
      </div>
    </section>
  );
}
