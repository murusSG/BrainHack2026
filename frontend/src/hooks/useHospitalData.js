import { useEffect, useMemo, useState } from 'react';
import {
  hospitalFacilityCards,
  hospitalSummaryCards,
  specializedFacilitiesRegistry,
} from '../data/dashboardData';
import { api } from '../services/api';

export function useHospitalData() {
  const [state, setState] = useState({
    status: 'loading',
    occupancy: null,
    reference: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([api.hospitalOccupancy(), api.hospitalReference()]).then((results) => {
      if (cancelled) return;

      const [occupancyResult, referenceResult] = results;
      const occupancy = occupancyResult.status === 'fulfilled' ? occupancyResult.value : null;
      const reference = referenceResult.status === 'fulfilled' ? referenceResult.value : null;
      const failed = results.filter((result) => result.status === 'rejected');

      setState({
        status: occupancy || reference ? 'done' : 'error',
        occupancy,
        reference,
        error: failed.map((result) => result.reason?.message).filter(Boolean).join('; ') || null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const occupancyMetrics = state.occupancy?.data ?? [];
  const referenceMetrics = state.reference?.data ?? [];

  const summaryCards = useMemo(() => buildHospitalSummaryCards(occupancyMetrics), [occupancyMetrics]);
  const facilityCards = useMemo(() => buildHospitalFacilityCards(occupancyMetrics), [occupancyMetrics]);
  const registryRows = useMemo(() => buildRegistryRows(referenceMetrics), [referenceMetrics]);

  return {
    status: state.status,
    error: state.error,
    summaryCards,
    facilityCards,
    registryRows,
    liveOccupancyCount: occupancyMetrics.length,
    liveReferenceCount: referenceMetrics.length,
  };
}

function buildHospitalSummaryCards(metrics) {
  const occupancy = latestOccupancyByFacility(metrics);
  const values = Array.from(occupancy.values());
  if (values.length === 0) return hospitalSummaryCards;

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const critical = values.filter((value) => value >= 90).length;

  return hospitalSummaryCards.map((card) => {
    if (card.label === 'Total Beds Occupied') {
      return { ...card, value: `${average.toFixed(1)}%` };
    }
    if (card.label === 'Critical Facilities') {
      return {
        ...card,
        value: `${String(critical).padStart(2, '0')} / ${values.length}`,
        tone: critical > 0 ? 'critical' : card.tone,
      };
    }
    return card;
  });
}

function buildHospitalFacilityCards(metrics) {
  const occupancy = latestOccupancyByFacility(metrics);
  if (occupancy.size === 0) return hospitalFacilityCards;

  return hospitalFacilityCards.map((facility) => {
    const percent = findFacilityMetric(facility.name, occupancy);
    if (percent === undefined) return facility;

    const rounded = Math.round(percent);
    const total = facility.generalBeds.total;
    const used = Math.round((total * rounded) / 100);
    const tone = rounded >= 90 ? 'critical' : rounded >= 85 ? 'warning' : 'normal';

    return {
      ...facility,
      status: tone === 'critical' ? 'Critical' : tone === 'warning' ? 'Warning' : 'Normal',
      tone,
      generalBeds: {
        ...facility.generalBeds,
        used,
        percent: rounded,
        tone: tone === 'critical' ? 'critical' : 'normal',
      },
    };
  });
}

function buildRegistryRows(metrics) {
  if (!metrics.length) return specializedFacilitiesRegistry;

  return metrics.slice(0, 5).map((metric) => ({
    name: metric.facility_name || metric.metric_name,
    type: metric.metric_name?.replace(/^Reference\s+/, '') || 'MOH Dataset',
    isolationUnits: [metric.value, metric.unit].filter(Boolean).join(' ') || 'N/A',
    dialysisStations: metric.last_updated || 'Public data',
    traumaCenter: metric.source_name?.includes('MOH') ? 'MOH' : 'Public',
  }));
}

function latestOccupancyByFacility(metrics) {
  const map = new Map();
  metrics
    .filter((metric) => metric.metric_name?.toLowerCase().includes('occupancy'))
    .forEach((metric) => {
      const value = Number(String(metric.value ?? '').replace('%', '').trim());
      if (!metric.facility_name || Number.isNaN(value)) return;
      map.set(metric.facility_name, value);
    });
  return map;
}

function findFacilityMetric(facilityName, occupancy) {
  const target = normaliseName(facilityName);
  for (const [name, value] of occupancy.entries()) {
    const candidate = normaliseName(name);
    if (candidate.includes(target) || target.includes(candidate)) return value;
  }
  return undefined;
}

function normaliseName(name) {
  return String(name).toLowerCase().replace(/hospital|general|national|university/g, '').replace(/[^a-z0-9]/g, '');
}
