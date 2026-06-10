import { useEffect, useMemo, useState } from 'react';
import { resourceLedgerEntries, resourceLedgerMeta, resourceSummaryCards, supplyLedgerEntries } from '../data/dashboardData';
import { api } from '../services/api';

export function useScdfResources() {
  const [state, setState] = useState({
    status: 'loading',
    resources: [],
    error: null,
  });
  const [aedCount, setAedCount] = useState(null);

  useEffect(() => {
    let cancelled = false;

    api
      .scdfResources()
      .then((resources) => {
        if (!cancelled) {
          setState({ status: 'done', resources: Array.isArray(resources) ? resources : [], error: null });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ status: 'error', resources: [], error: err.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .scdfResources('aed')
      .then((resources) => {
        if (!cancelled) setAedCount(Array.isArray(resources) ? resources.length : 0);
      })
      .catch(() => {
        if (!cancelled) setAedCount(0);
      });
    return () => { cancelled = true; };
  }, []);

  const summaryCards = useMemo(
    () => buildResourceSummary(state.resources, aedCount),
    [state.resources, aedCount],
  );
  const ledgerEntries = useMemo(() => buildLedgerEntries(state.resources), [state.resources]);
  const ledgerMeta = useMemo(
    () =>
      state.resources.length
        ? {
            ...resourceLedgerMeta,
            syncStatus: `SCDF public resources loaded: ${state.resources.length} records`,
          }
        : resourceLedgerMeta,
    [state.resources.length]
  );

  return {
    status: state.status,
    error: state.error,
    resources: state.resources,
    summaryCards,
    ledgerEntries,
    ledgerMeta,
  };
}

function buildResourceSummary(resources, aedCount) {
  if (!resources.length) return resourceSummaryCards;

  const fireStations = countType(resources, 'FIRE_STATION');
  const shelters = countType(resources, 'SHELTER');
  const aeds = aedCount ?? countType(resources, 'AED');
  const mapped = resources.filter((resource) => resource.latitude != null && resource.longitude != null).length;

  return [
    {
      label: 'Fire Stations',
      value: String(fireStations),
      detail: 'SCDF public station records',
      icon: 'fleet',
      change: 'Live',
      tone: 'up',
    },
    {
      label: 'Shelters',
      value: String(shelters),
      detail: 'Civil defence shelter locations',
      icon: 'shelter',
      change: 'Live',
      tone: 'up',
    },
    {
      label: 'AED Network',
      value: aedCount == null ? 'Loading…' : String(aeds),
      detail: 'Public AED locations',
      icon: 'beds',
      change: aedCount == null ? '…' : 'Live',
      tone: 'up',
    },
    {
      label: 'Mapped Assets',
      value: String(mapped),
      detail: 'Records with coordinates',
      icon: 'water',
      change: `${Math.round((mapped / Math.max(resources.length, 1)) * 100)}%`,
      tone: 'up',
    },
  ];
}

function buildLedgerEntries(resources) {
  if (!resources.length) return [...resourceLedgerEntries, ...supplyLedgerEntries];

  const infraEntries = resources
    .filter((r) => r.resource_type === 'FIRE_STATION')
    .slice(0, 8)
    .map((resource, index) => {
      const isMapped = resource.latitude != null && resource.longitude != null;
      return {
        unitId: resource.raw_source_id || resource.id || `SCDF-${index + 1}`,
        type: resourceTypeLabel(resource.resource_type),
        baseStation: resource.name,
        crew: resource.address || resource.operating_hours || 'Public resource record',
        capacity: isMapped ? 100 : 45,
        status: isMapped ? 'Mapped' : 'Listed',
        statusTone: isMapped ? 'available' : 'maintenance',
      };
    });

  const shelterEntries = resources
    .filter((r) => r.resource_type === 'SHELTER')
    .slice(0, 5)
    .map((resource, index) => {
      const isMapped = resource.latitude != null && resource.longitude != null;
      return {
        unitId: resource.raw_source_id || resource.id || `SHELTER-${index + 1}`,
        type: resourceTypeLabel(resource.resource_type),
        baseStation: resource.name,
        crew: resource.address || resource.operating_hours || 'Civil defence shelter',
        capacity: isMapped ? 100 : 45,
        status: isMapped ? 'Mapped' : 'Listed',
        statusTone: isMapped ? 'available' : 'maintenance',
      };
    });

  return [...infraEntries, ...shelterEntries, ...supplyLedgerEntries];
}

function countType(resources, type) {
  return resources.filter((resource) => resource.resource_type === type).length;
}

function resourceTypeLabel(type) {
  if (type === 'FIRE_STATION') return 'Fire Station';
  if (type === 'SHELTER') return 'Shelter';
  if (type === 'AED') return 'AED';
  return 'SCDF Resource';
}
