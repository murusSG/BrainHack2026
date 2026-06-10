import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLogo } from '../components/AppLogo';
import { CrisisMap } from '../components/CrisisMap';
import { LoadingSkeleton, MapLoadingSkeleton } from '../components/LoadingSkeleton';
import { MapErrorBoundary } from '../components/MapErrorBoundary';
import { ResidentAlertVisualGuide } from '../components/ResidentAlertVisualGuide';
import { PublicDashboardPage } from './PublicDashboardPage';
import { useEvents } from '../hooks/useEvents';
import { api } from '../services/api';
import { CHECK_IN_OPTIONS, saveResidentCheckin } from '../utils/residentCheckins';

function distanceMeters(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const DEFAULT_SAVED_PLACES = [
  { id: 'home', label: 'Home', sublabel: 'Tampines St 21', lat: 1.3536, lng: 103.9450 },
  { id: 'parents', label: "Mum's place", sublabel: 'Woodlands', lat: 1.4382, lng: 103.7890 },
  { id: 'work', label: 'Work', sublabel: 'Orchard Road', lat: 1.3048, lng: 103.8318 },
];

const DEFAULT_IMPACT_POINTS = [
  { id: 'current', label: 'Current area', sublabel: 'Orchard Gateway', lat: 1.3008, lng: 103.8391 },
  ...DEFAULT_SAVED_PLACES,
  { id: 'school', label: 'School', sublabel: 'River Valley', lat: 1.2950, lng: 103.8260 },
];

const RESIDENT_PROFILES = [
  {
    id: 'general',
    label: 'General',
    note: 'Fast public guidance',
  },
  {
    id: 'elderly',
    label: 'Elderly',
    note: 'Avoid stairs and crowded routes',
  },
  {
    id: 'parent',
    label: 'Parent',
    note: 'School and child pickup safety',
  },
  {
    id: 'driver',
    label: 'Driver',
    note: 'Road diversions and vehicle safety',
  },
  {
    id: 'tourist',
    label: 'Tourist',
    note: 'Simple local directions',
  },
  {
    id: 'mobility',
    label: 'Mobility support',
    note: 'Lift-accessible and assisted movement',
  },
];

const QUICK_QUESTIONS = [
  'Am I affected?',
  'What should I do now?',
  'Should I check family?',
  'Can I still take the MRT?',
  'Is it safe to go home?',
  'Where should I evacuate to?',
  'What if I am with an elderly person?',
  'Where should I avoid?',
];

const TRANSPORT_MODES = [
  { id: 'walking', label: 'Walking' },
  { id: 'mrt', label: 'MRT / bus' },
  { id: 'driving', label: 'Driving' },
  { id: 'caregiver', label: 'With dependants' },
];

const MOBILITY_NEEDS = [
  { id: 'none', label: 'No special needs' },
  { id: 'elderly', label: 'Elderly / slower walking' },
  { id: 'mobility', label: 'Wheelchair / mobility aid' },
  { id: 'child', label: 'With young child' },
];

const DEFAULT_RESIDENT_DETAILS = {
  displayName: 'Resident',
  homeAddress: 'Tampines St 21',
  currentLocationNote: 'Near Orchard Gateway, waiting at street level',
  plannedDestination: 'Home at Tampines St 21',
  supportNotes: 'Prefers sheltered routes and avoids crowded basement links',
};

const DEFAULT_EMERGENCY_CONTACT = {
  name: '',
  phone: '',
};

const SEVERITY_RANK = {
  info: 0,
  low: 1,
  advisory: 2,
  medium: 2,
  warning: 3,
  high: 3,
  danger: 4,
  critical: 4,
};

function statusTone(severity) {
  if (!severity) return 'clear';
  return (SEVERITY_RANK[severity] ?? 0) >= 3 ? 'critical' : 'warning';
}

function optionLabel(options, id) {
  return options.find((option) => option.id === id)?.label ?? id;
}

function formatGpsPoint(lat, lng, accuracyMeters) {
  const accuracy = Number.isFinite(accuracyMeters)
    ? `, accuracy about ${Math.round(accuracyMeters)}m`
    : '';
  return `GPS ${lat.toFixed(5)}, ${lng.toFixed(5)}${accuracy}`;
}

function mergeImpactPoints(savedPlaces) {
  const merged = [...DEFAULT_IMPACT_POINTS];
  savedPlaces.forEach((place) => {
    const index = merged.findIndex((point) => point.id === place.id);
    if (index >= 0) merged[index] = place;
    else merged.push(place);
  });
  return merged;
}

function applyResidentProfile(profile, setters) {
  const savedPlaces = Array.isArray(profile?.savedPlaces)
    ? profile.savedPlaces.map(savedPlaceToPoint).filter(Boolean)
    : [];
  const homePlace = savedPlaces.find((place) => place.id === 'home');

  setters.setResidentDetails((current) => ({
    ...current,
    displayName: profile?.displayName || current.displayName,
    homeAddress: profile?.homeAddress || homePlace?.sublabel || current.homeAddress,
    currentLocationNote:
      current.currentLocationNote === DEFAULT_RESIDENT_DETAILS.currentLocationNote
        ? ''
        : current.currentLocationNote,
    plannedDestination:
      profile?.homeAddress || homePlace?.sublabel
        ? `Home at ${profile?.homeAddress || homePlace?.sublabel}`
        : current.plannedDestination,
    supportNotes: profile?.supportNotes || current.supportNotes,
  }));
  setters.setEmergencyContact({
    name: profile?.emergencyContactName || '',
    phone: profile?.emergencyContactPhone || '',
  });
  if (profile?.residentPersona) setters.setActiveProfile(profile.residentPersona);
  if (profile?.preferredTransport) setters.setImpactTransport(profile.preferredTransport);
  if (profile?.mobilityNeed) setters.setImpactMobility(profile.mobilityNeed);
  setters.setPersistedPlaces(savedPlaces);
}

function savedPlaceToPoint(place) {
  if (!place?.label) return null;
  const fallback = defaultPointForPlace(place);
  return {
    id: placeIdForType(place),
    label: place.label,
    sublabel: place.address || fallback?.sublabel || 'Saved place',
    lat: Number.isFinite(place.lat) ? place.lat : fallback?.lat,
    lng: Number.isFinite(place.lng) ? place.lng : fallback?.lng,
    placeType: place.placeType || pointPlaceType(fallback?.id),
    isPrimary: Boolean(place.isPrimary),
    persistedAddress: place.address || '',
    persistedLat: Number.isFinite(place.lat) ? place.lat : undefined,
    persistedLng: Number.isFinite(place.lng) ? place.lng : undefined,
  };
}

function defaultPointForPlace(place) {
  const typeId = place.placeType === 'family' ? 'parents' : place.placeType;
  return DEFAULT_IMPACT_POINTS.find((point) => point.id === typeId || point.label === place.label);
}

function placeIdForType(place) {
  if (place.placeType === 'home') return 'home';
  if (place.placeType === 'work') return 'work';
  if (place.placeType === 'school') return 'school';
  if (place.placeType === 'family') return 'parents';
  return place.id || place.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'saved-place';
}

function buildProfileSavedPlaces(residentDetails, savedPlaces) {
  const existingPlaces = savedPlaces.length > 0 ? savedPlaces : DEFAULT_SAVED_PLACES;
  const byId = new Map(existingPlaces.map((place) => [place.id, pointToSavedPlace(place)]));
  byId.set('home', {
    ...byId.get('home'),
    label: 'Home',
    address: residentDetails.homeAddress,
    placeType: 'home',
    isPrimary: true,
  });
  return Array.from(byId.values()).filter((place) => place.address || place.lat != null || place.lng != null);
}

function pointToSavedPlace(point) {
  return {
    label: point.label,
    address: point.persistedAddress ?? point.sublabel,
    lat: point.persistedLat ?? point.lat,
    lng: point.persistedLng ?? point.lng,
    placeType: point.placeType ?? pointPlaceType(point.id),
    isPrimary: point.id === 'home',
  };
}

function pointPlaceType(id) {
  if (id === 'home') return 'home';
  if (id === 'work') return 'work';
  if (id === 'school') return 'school';
  if (id === 'parents') return 'family';
  return 'other';
}

function createSavedPlaceDraft() {
  const id = `saved-${Date.now().toString(36)}`;
  return {
    id,
    label: 'New place',
    sublabel: 'Add address',
    lat: DEFAULT_IMPACT_POINTS[0].lat,
    lng: DEFAULT_IMPACT_POINTS[0].lng,
    placeType: 'other',
    isPrimary: false,
    persistedAddress: '',
  };
}

export function ResidentPage({ session }) {
  const { events, status, error } = useEvents();
  const [activeResidentTab, setActiveResidentTab] = useState('brief');
  const [activePoint, setActivePoint] = useState(DEFAULT_SAVED_PLACES[0].id);
  const [activeProfile, setActiveProfile] = useState(RESIDENT_PROFILES[0].id);
  const [shelterNote, setShelterNote] = useState(null);
  const [shelterLoading, setShelterLoading] = useState(false);
  const [residentAlerts, setResidentAlerts] = useState([]);
  const [residentAlertStatus, setResidentAlertStatus] = useState('loading');
  const [residentAlertError, setResidentAlertError] = useState(null);
  const [acknowledgedAlertIds, setAcknowledgedAlertIds] = useState(() => new Set());
  const [copilotAnswers, setCopilotAnswers] = useState({});
  const [copilotDrafts, setCopilotDrafts] = useState({});
  const [checkInStatuses, setCheckInStatuses] = useState({});
  const [rumorText, setRumorText] = useState('');
  const [rumorCheck, setRumorCheck] = useState(null);
  const [impactPointId, setImpactPointId] = useState('current');
  const [impactTransport, setImpactTransport] = useState('walking');
  const [impactMobility, setImpactMobility] = useState('none');
  const [impactResult, setImpactResult] = useState(null);
  const [simpleMode, setSimpleMode] = useState(false);
  const [preparedItemIds, setPreparedItemIds] = useState(() => new Set());
  const [statusMessageCopied, setStatusMessageCopied] = useState(false);
  const [residentDetails, setResidentDetails] = useState(DEFAULT_RESIDENT_DETAILS);
  const [emergencyContact, setEmergencyContact] = useState(DEFAULT_EMERGENCY_CONTACT);
  const [residentProfileStatus, setResidentProfileStatus] = useState(session?.token ? 'loading' : 'demo');
  const [residentProfileMessage, setResidentProfileMessage] = useState(
    session?.token ? 'Loading your saved resident profile...' : 'Demo profile active. Log in to save resident details.'
  );
  const [isResidentProfileEditorOpen, setIsResidentProfileEditorOpen] = useState(!session?.token);
  const [persistedPlaces, setPersistedPlaces] = useState([]);
  const [liveLocation, setLiveLocation] = useState(null);
  const [liveLocationStatus, setLiveLocationStatus] = useState('idle');
  const isLoading = status === 'loading';
  const demoEventCount = events.filter((event) => event.isDemo).length;
  const liveEventCount = events.length - demoEventCount;
  const feedLabel =
    status === 'loading'
      ? 'Syncing'
      : status === 'error'
        ? 'Demo fallback'
        : `${liveEventCount} live / ${demoEventCount} demo`;
  const watchPoints = useMemo(() => {
    const savedPlacePoints = persistedPlaces.length > 0 ? persistedPlaces : DEFAULT_SAVED_PLACES;
    if (!liveLocation) return savedPlacePoints;
    return [liveLocation.point, ...savedPlacePoints];
  }, [liveLocation, persistedPlaces]);
  const impactPoints = useMemo(() => {
    const base = mergeImpactPoints(persistedPlaces.length > 0 ? persistedPlaces : DEFAULT_SAVED_PLACES);
    if (!liveLocation) return base;
    return [liveLocation.point, ...base.filter((point) => point.id !== 'current')];
  }, [liveLocation, persistedPlaces]);

  useEffect(() => {
    if (!watchPoints.some((point) => point.id === activePoint)) {
      setActivePoint(watchPoints[0]?.id ?? DEFAULT_SAVED_PLACES[0].id);
    }
  }, [activePoint, watchPoints]);

  useEffect(() => {
    if (!impactPoints.some((point) => point.id === impactPointId)) {
      setImpactPointId(impactPoints[0]?.id ?? 'current');
    }
  }, [impactPointId, impactPoints]);

  useEffect(() => {
    let cancelled = false;

    async function loadResidentProfile() {
      if (!session?.token) {
        setResidentProfileStatus('demo');
        setResidentProfileMessage('Demo profile active. Log in to save resident details.');
        setPersistedPlaces([]);
        setIsResidentProfileEditorOpen(true);
        return;
      }

      setResidentProfileStatus('loading');
      setResidentProfileMessage('Loading your saved resident profile...');
      setIsResidentProfileEditorOpen(false);
      try {
        const profile = await api.residentProfile(session.token);
        if (cancelled) return;
        applyResidentProfile(profile, {
          setResidentDetails,
          setEmergencyContact,
          setActiveProfile,
          setImpactTransport,
          setImpactMobility,
          setPersistedPlaces,
        });
        setResidentProfileStatus('ready');
        setResidentProfileMessage('Resident profile loaded from your account. Ask MURUS uses this automatically.');
      } catch (err) {
        if (cancelled) return;
        setResidentProfileStatus('error');
        setResidentProfileMessage(`Could not load saved profile: ${err.message}`);
        setIsResidentProfileEditorOpen(true);
      }
    }

    loadResidentProfile();

    return () => {
      cancelled = true;
    };
  }, [session?.token]);

  useEffect(() => {
    let cancelled = false;

    async function loadResidentAlerts() {
      setResidentAlertStatus('loading');
      try {
        const alerts = await api.residentAlerts();
        if (cancelled) return;
        setResidentAlerts(Array.isArray(alerts) ? alerts : []);
        setResidentAlertError(null);
        setResidentAlertStatus('done');
      } catch (err) {
        if (cancelled) return;
        setResidentAlerts([]);
        setResidentAlertError(err.message);
        setResidentAlertStatus('error');
      }
    }

    loadResidentAlerts();

    return () => {
      cancelled = true;
    };
  }, []);

  const statusByPoint = useMemo(() => {
    return watchPoints.map((point) => {
      const affecting = events.filter((event) => {
        if (event.lat == null || event.lng == null) return false;
        const distance = distanceMeters(point, event);
        return distance <= (event.vicinityRadiusMeters ?? 500);
      });
      affecting.sort(
        (a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0)
      );
      return { point, affecting };
    });
  }, [events, watchPoints]);

  const active = statusByPoint.find((statusItem) => statusItem.point.id === activePoint);
  const officialAlerts = useMemo(
    () => (residentAlerts.length > 0 ? residentAlerts : events.map(eventToFallbackResidentAlert)),
    [events, residentAlerts]
  );

  const alertsByPoint = useMemo(() => {
    return watchPoints.map((point) => {
      const affecting = officialAlerts.filter((alert) => alertAffectsPoint(alert, point));
      affecting.sort(
        (a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0)
      );
      return { point, affecting };
    });
  }, [officialAlerts, watchPoints]);

  const activeAlerts = alertsByPoint.find((statusItem) => statusItem.point.id === activePoint);
  const activeSeverity = activeAlerts?.affecting[0]?.severity ?? active?.affecting[0]?.severity;
  const activeTone = isLoading || residentAlertStatus === 'loading' ? 'loading' : statusTone(activeSeverity);
  const alertFeedSource = residentAlerts.length > 0 ? 'Resident alert channel' : 'Event-derived fallback';
  const activeProfileMeta =
    RESIDENT_PROFILES.find((profile) => profile.id === activeProfile) ?? RESIDENT_PROFILES[0];
  const affectedWatchPoints = alertsByPoint.filter((item) => item.affecting.length > 0);
  const savedPlacesImpact = useMemo(
    () => buildSavedPlacesImpact(impactPoints, officialAlerts),
    [impactPoints, officialAlerts]
  );
  const emergencyPack = useMemo(
    () =>
      buildPreparednessChecklist({
        profile: activeProfile,
        point: activeAlerts?.point ?? active?.point ?? watchPoints[0],
        alert: activeAlerts?.affecting[0],
        transportMode: impactTransport,
        mobilityNeed: impactMobility,
      }),
    [active?.point, activeAlerts?.affecting, activeAlerts?.point, activeProfile, impactMobility, impactTransport, watchPoints]
  );
  const preparedCount = emergencyPack.items.filter((item) => preparedItemIds.has(item.id)).length;
  const shareStatusMessage = buildResidentStatusMessage({
    point: activeAlerts?.point ?? active?.point ?? watchPoints[0],
    alert: activeAlerts?.affecting[0],
    transportMode: impactTransport,
    mobilityNeed: impactMobility,
    profile: activeProfile,
    preparedCount,
    totalCount: emergencyPack.items.length,
  });

  useEffect(() => {
    setStatusMessageCopied(false);
  }, [shareStatusMessage]);

  async function handleNearestShelter(point) {
    setShelterLoading(true);
    setShelterNote(`Finding nearest SCDF shelter for ${point.label}...`);
    try {
      const nearest = await api.scdfNearest(point.lat, point.lng, 'SHELTER');
      const shelter = Array.isArray(nearest) ? nearest[0] : null;
      if (!shelter) {
        setShelterNote(`No configured SCDF shelter records found near ${point.label}.`);
        return;
      }
      const distance = shelter.distance_meters
        ? ` (${Math.round(shelter.distance_meters)}m away)`
        : '';
      const address = shelter.address ? `, ${shelter.address}` : '';
      setShelterNote(`Nearest shelter for ${point.label}: ${shelter.name}${address}${distance}`);
    } catch (err) {
      setShelterNote(
        `Nearest shelter for ${point.label}: ${shelterForPoint(point.id)}. Live lookup unavailable (${err.message}).`
      );
    } finally {
      setShelterLoading(false);
    }
  }

  async function handleAskCopilot(alert, point, question) {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;
    const nearestShelter = await findNearestShelterForQuestion(trimmedQuestion, point);
    const fallbackAnswer = answerResidentQuestion(trimmedQuestion, alert, point, activeProfile, {
      residentDetails,
      impactPoints,
      transportMode: impactTransport,
      mobilityNeed: impactMobility,
      nearestShelter,
    });

    setCopilotAnswers((current) => ({
      ...current,
      [alert.id]: {
        question: trimmedQuestion,
        answer: fallbackAnswer,
        mode: 'fallback',
        status: 'thinking',
      },
    }));
    setCopilotDrafts((current) => ({
      ...current,
      [alert.id]: '',
    }));

    try {
      const llmAnswer = await api.askMurus(
        {
          question: trimmedQuestion,
          deterministicAnswer: fallbackAnswer,
          alert: {
            title: alert.title,
            body: alert.body,
            publicAction: alert.publicAction,
            severity: alert.severity,
            status: alert.status,
            locationLabel: alert.locationLabel,
            radiusMeters: alert.radiusMeters,
          },
          residentContext: {
            profile: activeProfile,
            profileLabel: activeProfileMeta.label,
            residentDetails: {
              ...residentDetails,
              emergencyContactName: emergencyContact.name,
              emergencyContactPhone: emergencyContact.phone,
            },
            pointLabel: point.label,
            pointSublabel: point.sublabel,
            liveLocation: {
              label: point.label,
              address: point.sublabel,
              lat: point.lat,
              lng: point.lng,
              accuracyMeters: liveLocation?.point.id === point.id ? liveLocation.accuracyMeters : undefined,
              capturedAt: liveLocation?.point.id === point.id ? liveLocation.capturedAt : undefined,
              isInsideAlertRadius: alertAffectsPoint(alert, point),
              distanceMeters:
                alert.lat != null && alert.lng != null
                  ? Math.round(distanceMeters(point, { lat: alert.lat, lng: alert.lng }))
                  : null,
            },
            nearestShelter,
            savedPlaces: buildResidentContextPlaces(impactPoints, officialAlerts),
            emergencyPack: {
              readyCount: preparedCount,
              totalCount: emergencyPack.items.length,
              readyItems: emergencyPack.items
                .filter((item) => preparedItemIds.has(item.id))
                .map((item) => item.label),
              missingItems: emergencyPack.items
                .filter((item) => !preparedItemIds.has(item.id))
                .slice(0, 4)
                .map((item) => item.label),
            },
            currentCheckIn:
              checkInStatuses[alert.id] != null
                ? CHECK_IN_OPTIONS.find((option) => option.id === checkInStatuses[alert.id])?.label
                : null,
            shareStatusMessage,
            transportMode: optionLabel(TRANSPORT_MODES, impactTransport),
            mobilityNeed: optionLabel(MOBILITY_NEEDS, impactMobility),
          },
        },
        ...(session?.token ? [session.token] : [])
      );
      setCopilotAnswers((current) => ({
        ...current,
        [alert.id]: {
          question: trimmedQuestion,
          answer: llmAnswer.answer || fallbackAnswer,
          mode: llmAnswer.mode ?? 'llm',
          status: llmAnswer.mode === 'fallback' ? 'fallback' : 'ready',
        },
      }));
    } catch {
      setCopilotAnswers((current) => ({
        ...current,
        [alert.id]: {
          question: trimmedQuestion,
          answer: fallbackAnswer,
          mode: 'fallback',
          status: 'fallback',
        },
      }));
    }
  }

  function handleResidentCheckIn(alert, point, option) {
    saveResidentCheckin({
      alertId: alert.id,
      alertTitle: alert.title,
      alertLocation: alert.locationLabel,
      pointId: point.id,
      pointLabel: point.label,
      pointSublabel: point.sublabel,
      status: option.id,
      statusLabel: option.label,
      statusTone: option.tone,
      residentProfile: activeProfile,
      mobilityNeed: impactMobility,
      transportMode: impactTransport,
      severity: alert.severity,
      priority: option.id === 'need_help' || option.id === 'accessible' ? 'high' : 'normal',
    });
    setCheckInStatuses((current) => ({
      ...current,
      [alert.id]: option.id,
    }));
  }

  function handleResidentDetailChange(key, value) {
    setResidentDetails((current) => ({
      ...current,
      [key]: value,
    }));
    setResidentProfileMessage(session?.token ? 'Unsaved resident profile changes.' : 'Demo profile active. Log in to save resident details.');
    setResidentProfileStatus(session?.token ? 'dirty' : 'demo');
  }

  function handleEmergencyContactChange(key, value) {
    setEmergencyContact((current) => ({
      ...current,
      [key]: value,
    }));
    setResidentProfileMessage(session?.token ? 'Unsaved resident profile changes.' : 'Demo profile active. Log in to save resident details.');
    setResidentProfileStatus(session?.token ? 'dirty' : 'demo');
  }

  function markResidentProfileDirty() {
    setResidentProfileMessage(session?.token ? 'Unsaved resident profile changes.' : 'Demo profile active. Log in to save resident details.');
    setResidentProfileStatus(session?.token ? 'dirty' : 'demo');
  }

  function handleResidentPersonaChange(persona) {
    setActiveProfile(persona);
    markResidentProfileDirty();
  }

  function handleSavedPlaceChange(placeId, key, value) {
    setPersistedPlaces((current) => {
      const base = current.length > 0 ? current : DEFAULT_SAVED_PLACES;
      return base.map((place) => {
        if (place.id !== placeId) return place;
        const next = { ...place, [key]: value };
        if (key === 'persistedAddress') next.sublabel = value || 'Saved place';
        return next;
      });
    });
    markResidentProfileDirty();
  }

  function handleAddSavedPlace() {
    setPersistedPlaces((current) => [...(current.length > 0 ? current : DEFAULT_SAVED_PLACES), createSavedPlaceDraft()]);
    markResidentProfileDirty();
  }

  function handleRemoveSavedPlace(placeId) {
    if (placeId === 'home') return;
    setPersistedPlaces((current) => (current.length > 0 ? current : DEFAULT_SAVED_PLACES).filter((place) => place.id !== placeId));
    if (activePoint === placeId) setActivePoint('home');
    if (impactPointId === placeId) setImpactPointId('home');
    markResidentProfileDirty();
  }

  async function handleSaveResidentProfile() {
    if (!session?.token) {
      setResidentProfileStatus('demo');
      setResidentProfileMessage('Log in as a resident to save this profile.');
      return;
    }

    setResidentProfileStatus('saving');
    setResidentProfileMessage('Saving resident profile...');
    try {
      const profile = await api.updateResidentProfile(
        {
          displayName: residentDetails.displayName,
          homeAddress: residentDetails.homeAddress,
          residentPersona: activeProfile,
          preferredTransport: impactTransport,
          mobilityNeed: impactMobility,
          supportNotes: residentDetails.supportNotes,
          emergencyContactName: emergencyContact.name,
          emergencyContactPhone: emergencyContact.phone,
          savedPlaces: buildProfileSavedPlaces(residentDetails, persistedPlaces),
        },
        session.token
      );
      applyResidentProfile(profile, {
        setResidentDetails,
        setEmergencyContact,
        setActiveProfile,
        setImpactTransport,
        setImpactMobility,
        setPersistedPlaces,
      });
      setResidentProfileStatus('ready');
      setResidentProfileMessage('Resident profile saved. Ask MURUS will use this context automatically.');
      setIsResidentProfileEditorOpen(false);
    } catch (err) {
      setResidentProfileStatus('error');
      setResidentProfileMessage(`Could not save resident profile: ${err.message}`);
    }
  }

  async function findNearestShelterForQuestion(question, point) {
    if (detectResidentQuestionIntent(question) !== 'evacuate') return null;
    try {
      const nearest = await api.scdfNearest(point.lat, point.lng, 'SHELTER');
      const shelter = Array.isArray(nearest) ? nearest[0] : null;
      if (!shelter) return null;
      return {
        name: shelter.name,
        address: shelter.address,
        distanceMeters: shelter.distance_meters,
        source: 'SCDF public shelter lookup',
      };
    } catch {
      return null;
    }
  }

  function handleUseLiveLocation() {
    if (!navigator.geolocation) {
      setLiveLocationStatus('unsupported');
      return;
    }

    setLiveLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const point = {
          id: 'live',
          label: 'Live location',
          sublabel: formatGpsPoint(lat, lng, position.coords.accuracy),
          lat,
          lng,
        };
        setLiveLocation({
          point,
          accuracyMeters: position.coords.accuracy,
          capturedAt: new Date().toISOString(),
        });
        setActivePoint('live');
        setImpactPointId('live');
        setResidentDetails((current) => ({
          ...current,
          currentLocationNote: `Live GPS captured near ${point.sublabel}`,
        }));
        setLiveLocationStatus('ready');
      },
      () => {
        setLiveLocationStatus('error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }

  return (
    <div className="resident-page">
      <header className="resident-header">
        <div className="resident-header-brand">
          <AppLogo variant="resident" />
          <h1>Your safety brief</h1>
        </div>
        <div className="resident-header-actions">
          <span className="resident-feed-pill">{feedLabel}</span>
          <button
            type="button"
            className={`resident-simple-toggle ${simpleMode ? 'is-active' : ''}`}
            aria-pressed={simpleMode}
            onClick={() => setSimpleMode((current) => !current)}
          >
            {simpleMode ? 'Simple mode on' : 'Simplify alert'}
          </button>
          <Link to="/" className="resident-command-link">
            Command view
          </Link>
        </div>
      </header>

      <div className="resident-view-tabs" role="tablist" aria-label="Resident view tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeResidentTab === 'brief'}
          className={`resident-view-tab ${activeResidentTab === 'brief' ? 'is-active' : ''}`}
          onClick={() => setActiveResidentTab('brief')}
        >
          Safety Brief
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeResidentTab === 'public'}
          className={`resident-view-tab ${activeResidentTab === 'public' ? 'is-active' : ''}`}
          onClick={() => setActiveResidentTab('public')}
        >
          Public Dashboard
        </button>
      </div>

      {activeResidentTab === 'public' ? (
        <section className="resident-public-dashboard-tab" role="tabpanel" aria-label="Public dashboard">
          <PublicDashboardPage embedded mobileView showBackButton={false} />
        </section>
      ) : (
        <>

      <div className="resident-watch-grid" aria-label="Saved locations">
        {watchPoints.map((point) => {
          const pointStatus = statusByPoint.find((item) => item.point.id === point.id);
          const worstSeverity = pointStatus?.affecting[0]?.severity;
          const pointTone = isLoading ? 'loading' : statusTone(worstSeverity);

          return (
            <button
              key={point.id}
              type="button"
              onClick={() => {
                setActivePoint(point.id);
                setShelterNote(null);
              }}
              className={`resident-watch-button ${activePoint === point.id ? 'is-active' : ''}`}
            >
              <span className={`resident-status-dot is-${pointTone}`} aria-hidden="true" />
              <span className="resident-watch-label">{point.label}</span>
              <span className="resident-watch-sublabel">{point.sublabel}</span>
            </button>
          );
        })}
      </div>

      <section className="resident-persona-panel" aria-label="Personalized guidance profile">
        <div>
          <p className="resident-persona-title">Personalize this alert</p>
          <p className="resident-persona-copy">
            MURUS turns the same official alert into safer next steps for your situation.
          </p>
          <button type="button" className="resident-location-button" onClick={handleUseLiveLocation}>
            {liveLocationStatus === 'loading' ? 'Getting live location...' : 'Use my live location'}
          </button>
          {liveLocationStatus !== 'idle' && (
            <p className={`resident-location-status is-${liveLocationStatus}`}>
              {liveLocationStatus === 'ready'
                ? `Live location active: ${liveLocation.point.sublabel}`
                : liveLocationStatus === 'unsupported'
                  ? 'Live location is not available in this browser.'
                  : liveLocationStatus === 'error'
                    ? 'Location permission was denied or timed out.'
                    : 'Requesting permission from your browser.'}
            </p>
          )}
        </div>
        <div className="resident-persona-list">
          {RESIDENT_PROFILES.map((profile) => (
            <button
              key={profile.id}
              type="button"
              className={`resident-persona-chip ${activeProfile === profile.id ? 'is-active' : ''}`}
              aria-pressed={activeProfile === profile.id}
              onClick={() => handleResidentPersonaChange(profile.id)}
            >
              <span>{profile.label}</span>
              <small>{profile.note}</small>
            </button>
          ))}
        </div>
        <div className="resident-profile-summary" aria-label="Saved resident profile summary">
          <div>
            <p className="resident-guidance-label">
              {session?.token ? 'Saved account context' : 'Demo resident context'}
            </p>
            <p>{residentProfileMessage}</p>
          </div>
          <dl>
            <div>
              <dt>Persona</dt>
              <dd>{activeProfileMeta.label}</dd>
            </div>
            <div>
              <dt>Home</dt>
              <dd>{residentDetails.homeAddress || 'Not set'}</dd>
            </div>
            <div>
              <dt>Transport</dt>
              <dd>{optionLabel(TRANSPORT_MODES, impactTransport)}</dd>
            </div>
            <div>
              <dt>Mobility</dt>
              <dd>{optionLabel(MOBILITY_NEEDS, impactMobility)}</dd>
            </div>
          </dl>
          <button
            type="button"
            className="resident-profile-edit-button"
            onClick={() => setIsResidentProfileEditorOpen((current) => !current)}
          >
            {isResidentProfileEditorOpen ? 'Hide profile details' : 'Edit profile details'}
          </button>
        </div>
        {isResidentProfileEditorOpen && (
          <>
            <div className="resident-situation-form">
              <label>
                <span>Name or role</span>
                <input
                  value={residentDetails.displayName}
                  onChange={(event) => handleResidentDetailChange('displayName', event.target.value)}
                />
              </label>
              <label>
                <span>Home address</span>
                <input
                  value={residentDetails.homeAddress}
                  onChange={(event) => handleResidentDetailChange('homeAddress', event.target.value)}
                />
              </label>
              <label>
                <span>Current situation</span>
                <input
                  value={residentDetails.currentLocationNote}
                  onChange={(event) => handleResidentDetailChange('currentLocationNote', event.target.value)}
                />
              </label>
              <label>
                <span>Where you plan to go</span>
                <input
                  value={residentDetails.plannedDestination}
                  onChange={(event) => handleResidentDetailChange('plannedDestination', event.target.value)}
                />
              </label>
              <label className="resident-situation-wide">
                <span>Support notes</span>
                <input
                  value={residentDetails.supportNotes}
                  onChange={(event) => handleResidentDetailChange('supportNotes', event.target.value)}
                />
              </label>
              <label>
                <span>Emergency contact</span>
                <input
                  value={emergencyContact.name}
                  onChange={(event) => handleEmergencyContactChange('name', event.target.value)}
                  placeholder="Name"
                />
              </label>
              <label>
                <span>Contact phone</span>
                <input
                  value={emergencyContact.phone}
                  onChange={(event) => handleEmergencyContactChange('phone', event.target.value)}
                  placeholder="+65..."
                />
              </label>
              <div className="resident-profile-save-row">
                <p className={`resident-profile-status is-${residentProfileStatus}`}>
                  {residentProfileMessage}
                </p>
                <button
                  type="button"
                  className="resident-profile-save-button"
                  onClick={handleSaveResidentProfile}
                  disabled={residentProfileStatus === 'saving'}
                >
                  {residentProfileStatus === 'saving' ? 'Saving...' : 'Save profile'}
                </button>
              </div>
            </div>
            <div className="resident-saved-places-editor" aria-label="Saved resident places editor">
              <div className="resident-saved-places-head">
            <div>
              <p className="resident-guidance-label">Saved places</p>
              <p>Ask MURUS checks these places when you ask about home, family, work, or school.</p>
            </div>
            <button type="button" onClick={handleAddSavedPlace}>
              Add place
            </button>
              </div>
              <div className="resident-saved-places-list">
                {(persistedPlaces.length > 0 ? persistedPlaces : DEFAULT_SAVED_PLACES).map((place) => (
                  <article key={place.id} className="resident-saved-place-row">
                    <label>
                      <span>Label</span>
                      <input
                        value={place.label}
                        onChange={(event) => handleSavedPlaceChange(place.id, 'label', event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Address</span>
                      <input
                        value={place.persistedAddress ?? place.sublabel}
                        onChange={(event) => handleSavedPlaceChange(place.id, 'persistedAddress', event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Type</span>
                      <select
                        value={place.placeType ?? pointPlaceType(place.id)}
                        onChange={(event) => handleSavedPlaceChange(place.id, 'placeType', event.target.value)}
                      >
                        <option value="home">Home</option>
                        <option value="work">Work</option>
                        <option value="school">School</option>
                        <option value="family">Family</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveSavedPlace(place.id)}
                      disabled={place.id === 'home'}
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      <section className="resident-impact-panel" aria-label="Does this affect me check">
        <div>
          <p className="resident-persona-title">Does this affect me?</p>
          <p className="resident-persona-copy">
            Check your current area, home, work, school, transport mode, and mobility needs against official alerts.
          </p>
        </div>
        <div className="resident-impact-grid">
          <label>
            <span>Area to check</span>
            <select value={impactPointId} onChange={(event) => setImpactPointId(event.target.value)}>
              {impactPoints.map((point) => (
                <option key={point.id} value={point.id}>
                  {point.label} - {point.sublabel}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Transport mode</span>
            <select
              value={impactTransport}
              onChange={(event) => {
                setImpactTransport(event.target.value);
                setResidentProfileStatus(session?.token ? 'dirty' : 'demo');
                setResidentProfileMessage(
                  session?.token
                    ? 'Unsaved resident profile changes.'
                    : 'Demo profile active. Log in to save resident details.'
                );
              }}
            >
              {TRANSPORT_MODES.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Mobility needs</span>
            <select
              value={impactMobility}
              onChange={(event) => {
                setImpactMobility(event.target.value);
                setResidentProfileStatus(session?.token ? 'dirty' : 'demo');
                setResidentProfileMessage(
                  session?.token
                    ? 'Unsaved resident profile changes.'
                    : 'Demo profile active. Log in to save resident details.'
                );
              }}
            >
              {MOBILITY_NEEDS.map((need) => (
                <option key={need.id} value={need.id}>
                  {need.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          className="resident-rumor-button"
          onClick={() =>
            setImpactResult(
              buildImpactResult({
                point: impactPoints.find((point) => point.id === impactPointId) ?? impactPoints[0],
                transportMode: impactTransport,
                mobilityNeed: impactMobility,
                alerts: officialAlerts,
              })
            )
          }
        >
          Check my impact
        </button>
        {impactResult && (
          <div className={`resident-impact-result is-${impactResult.tone}`}>
            <strong>{impactResult.label}</strong>
            <p>{impactResult.message}</p>
            <ol>
              {impactResult.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        )}
      </section>

      <section className="resident-family-panel" aria-label="Family and saved places impact summary">
        <div className="resident-family-head">
          <div>
            <p className="resident-persona-title">Family and saved places</p>
            <p className="resident-persona-copy">
              One scan for your current area, home, work, school, and family locations.
            </p>
          </div>
          <span className={savedPlacesImpact.affectedCount > 0 ? 'is-affected' : 'is-clear'}>
            {savedPlacesImpact.affectedCount} affected
          </span>
        </div>
        <div className="resident-family-list">
          {savedPlacesImpact.items.map((item) => (
            <article key={item.point.id} className={`resident-family-item is-${item.tone}`}>
              <div>
                <strong>{item.point.label}</strong>
                <span>{item.point.sublabel}</span>
              </div>
              <p>{item.summary}</p>
              <button
                type="button"
                onClick={() => {
                  setImpactPointId(item.point.id);
                  setImpactResult(
                    buildImpactResult({
                      point: item.point,
                      transportMode: impactTransport,
                      mobilityNeed: impactMobility,
                      alerts: officialAlerts,
                    })
                  );
                }}
              >
                {item.affected ? 'Review steps' : 'Check anyway'}
              </button>
            </article>
          ))}
        </div>
        <p className="resident-family-message">{savedPlacesImpact.familyMessage}</p>
      </section>

      <section className="resident-preparedness-panel" aria-label="Emergency pack readiness">
        <div className="resident-preparedness-head">
          <div>
            <p className="resident-persona-title">Emergency pack mode</p>
            <p className="resident-persona-copy">
              A fast, profile-aware checklist for what to prepare before moving or sheltering.
            </p>
          </div>
          <span>{preparedCount} / {emergencyPack.items.length} ready</span>
        </div>
        <div className="resident-preparedness-list">
          {emergencyPack.items.map((item) => {
            const checked = preparedItemIds.has(item.id);
            return (
              <label key={item.id} className={`resident-preparedness-item ${checked ? 'is-ready' : ''}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setPreparedItemIds((current) => {
                      const next = new Set(current);
                      if (next.has(item.id)) {
                        next.delete(item.id);
                      } else {
                        next.add(item.id);
                      }
                      return next;
                    });
                    setStatusMessageCopied(false);
                  }}
                />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
              </label>
            );
          })}
        </div>
        <div className="resident-share-card">
          <div>
            <p className="resident-guidance-label">Share my status</p>
            <p>{shareStatusMessage}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                if (navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(shareStatusMessage);
                }
              } finally {
                setStatusMessageCopied(true);
              }
            }}
          >
            {statusMessageCopied ? 'Copied' : 'Copy status'}
          </button>
        </div>
      </section>

      <section className="resident-rumor-panel" aria-label="Rumor check">
        <div>
          <p className="resident-persona-title">Rumor check</p>
          <p className="resident-persona-copy">
            Heard something from a group chat? Check whether it matches official MURUS alerts.
          </p>
        </div>
        <label className="resident-rumor-field">
          <span>What did you hear?</span>
          <textarea
            rows="3"
            value={rumorText}
            onChange={(event) => setRumorText(event.target.value)}
            placeholder="Example: I heard Orchard MRT is closed"
          />
        </label>
        <button
          type="button"
          className="resident-rumor-button"
          onClick={() => setRumorCheck(checkResidentRumor(rumorText, officialAlerts))}
        >
          Check against official alerts
        </button>
        {rumorCheck && (
          <div className={`resident-rumor-result is-${rumorCheck.status}`}>
            <strong>{rumorCheck.label}</strong>
            <p>{rumorCheck.message}</p>
            {rumorCheck.matchedAlert && (
              <span>
                Matched official alert: {rumorCheck.matchedAlert.title} / {rumorCheck.matchedAlert.locationLabel}
              </span>
            )}
          </div>
        )}
      </section>

      <section className={`resident-crisis-card is-${activeTone}`}>
        {isLoading || residentAlertStatus === 'loading' ? (
          <>
            <p className="resident-alert-count">Syncing resident alerts</p>
            <LoadingSkeleton rows={2} compact />
          </>
        ) : activeAlerts?.affecting.length === 0 ? (
          <>
            <span className="resident-clear-badge">CLEAR</span>
            <h2>All clear at {active.point.label}</h2>
            <p>No active citizen alerts in your area right now.</p>
          </>
        ) : (
          <>
            <p className="resident-alert-count">
              {activeAlerts.affecting.length} alert{activeAlerts.affecting.length > 1 ? 's' : ''} near{' '}
              {activeAlerts.point.label}
            </p>
            <div className="resident-affects-card">
              <strong>Does this affect me?</strong>
              <span>
                Yes. {activeAlerts.point.label} is inside the active advisory radius.
                {affectedWatchPoints.length > 1
                  ? ` Also check ${affectedWatchPoints
                      .filter((item) => item.point.id !== activePoint)
                      .map((item) => item.point.label)
                      .join(', ')}.`
                  : ' Your other saved places are not currently flagged by this alert.'}
              </span>
            </div>
            <div className="resident-alert-list">
              {activeAlerts.affecting.map((alert) => {
                const acknowledged = acknowledgedAlertIds.has(alert.id);
                const guidance = buildPersonalGuidance(alert, activeAlerts.point, activeProfile);
                const copilotAnswer = copilotAnswers[alert.id];
                const copilotDraft = copilotDrafts[alert.id] ?? '';
                const selectedCheckIn = checkInStatuses[alert.id];
                const simpleAlert = buildSimpleAlert(alert, activeAlerts.point, activeProfile);
                return (
                <article key={alert.id} className={`resident-alert-card ${acknowledged ? 'is-read' : ''}`}>
                  <div className="resident-alert-meta">
                    <span className={`resident-alert-source is-${alert.sourceType}`}>
                      {alert.sourceType === 'command_broadcast' ? 'Command alert' : 'Incident active'}
                    </span>
                    <span className={`resident-alert-status is-${alert.status ?? 'active'}`}>
                      {alert.status === 'resolved' ? 'All clear' : alert.status === 'updated' ? 'Updated' : 'Active'}
                    </span>
                    <span>{alert.locationLabel}</span>
                  </div>
                  <h2>{alert.title}</h2>
                  <p>{alert.body}</p>
                  <p className="resident-action-copy">Action: {alert.publicAction}</p>
                  {simpleMode && (
                    <section className="resident-simple-card" aria-label={`Simple alert for ${alert.title}`}>
                      <p className="resident-guidance-label">Plain language</p>
                      <h3>{simpleAlert.headline}</h3>
                      <ul>
                        {simpleAlert.points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                  <section className="resident-guidance-card" aria-label={`Personalized guidance for ${alert.title}`}>
                    <div className="resident-guidance-head">
                      <div>
                        <p className="resident-guidance-label">Next safe action</p>
                        <h3>{activeProfileMeta.label} at {activeAlerts.point.label}</h3>
                      </div>
                      <span>{guidance.tone}</span>
                    </div>
                    <ol>
                      {guidance.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    <p>{guidance.reassurance}</p>
                  </section>
                  <ResidentAlertVisualGuide
                    alert={alert}
                    point={activeAlerts.point}
                    homePoint={impactPoints.find((candidate) => candidate.id === 'home')}
                    transportMode={impactTransport}
                    mobilityNeed={impactMobility}
                    profileLabel={activeProfileMeta.label}
                  />
                  <section className="resident-copilot-card" aria-label={`Ask MURUS about ${alert.title}`}>
                    <div>
                      <p className="resident-guidance-label">Ask MURUS</p>
                      <h3>Citizen-safe answers from this alert</h3>
                    </div>
                    <div className="resident-question-list">
                      {QUICK_QUESTIONS.map((question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() => handleAskCopilot(alert, activeAlerts.point, question)}
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                    <form
                      className="resident-copilot-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleAskCopilot(alert, activeAlerts.point, copilotDraft);
                      }}
                    >
                      <label htmlFor={`resident-copilot-${alert.id}`}>Ask your own question</label>
                      <div>
                        <input
                          id={`resident-copilot-${alert.id}`}
                          value={copilotDraft}
                          onChange={(event) =>
                            setCopilotDrafts((current) => ({
                              ...current,
                              [alert.id]: event.target.value,
                            }))
                          }
                          placeholder="Example: Can I go to Orchard now?"
                        />
                        <button type="submit">Ask</button>
                      </div>
                    </form>
                    {copilotAnswer && (
                      <div className="resident-copilot-answer" role="status">
                        <span>
                          You asked: {copilotAnswer.question}
                          {copilotAnswer.status === 'thinking'
                            ? ' · Thinking'
                            : copilotAnswer.mode === 'llm'
                              ? ' · Ask MURUS AI'
                              : ' · Safe fallback'}
                        </span>
                        <p>{copilotAnswer.answer}</p>
                      </div>
                    )}
                  </section>
                  <section className="resident-checkin-card" aria-label={`Resident check-in for ${alert.title}`}>
                    <div>
                      <p className="resident-guidance-label">Check in with command</p>
                      <h3>Send your current status</h3>
                    </div>
                    <div className="resident-checkin-grid">
                      {CHECK_IN_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`resident-checkin-button is-${option.tone} ${
                            selectedCheckIn === option.id ? 'is-active' : ''
                          }`}
                          aria-pressed={selectedCheckIn === option.id}
                          onClick={() => handleResidentCheckIn(alert, activeAlerts.point, option)}
                        >
                          <strong>{option.label}</strong>
                          <span>{option.detail}</span>
                        </button>
                      ))}
                    </div>
                    {selectedCheckIn && (
                      <p className="resident-checkin-confirmation" role="status">
                        Status sent to command: {CHECK_IN_OPTIONS.find((option) => option.id === selectedCheckIn)?.label}
                      </p>
                    )}
                  </section>
                  <div className="resident-card-actions">
                    <Link to="/incident-map" className="resident-primary-button resident-button-link">
                      View on map
                    </Link>
                    <button
                      type="button"
                      className="resident-secondary-button"
                      disabled={shelterLoading}
                      onClick={() => handleNearestShelter(active.point)}
                    >
                      {shelterLoading ? 'Finding shelter' : 'Nearest shelter'}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="resident-ack-button"
                    onClick={() =>
                      setAcknowledgedAlertIds((current) => {
                        const next = new Set(current);
                        next.add(alert.id);
                        return next;
                      })
                    }
                    disabled={acknowledged}
                  >
                    {acknowledged ? 'Acknowledged' : 'Mark as read'}
                  </button>
                </article>
                );
              })}
            </div>
            <p className="resident-alert-footnote">Source: {alertFeedSource}</p>
          </>
        )}
      </section>

      {shelterNote && <p className="resident-shelter-note">{shelterNote}</p>}

      {status === 'error' && (
        <p className="resident-feed-warning">
          Live feed unavailable ({error}). Showing demo scenarios only.
        </p>
      )}

      {residentAlertStatus === 'error' && (
        <p className="resident-feed-warning">
          Resident alert channel unavailable ({residentAlertError}). Showing event-derived alerts.
        </p>
      )}

      <section className="resident-map-shell" aria-label="Nearby crisis map">
        {isLoading ? (
          <MapLoadingSkeleton label="Syncing nearby hazards" />
        ) : (
          <MapErrorBoundary resetKey={events.length}>
            <CrisisMap events={events} />
          </MapErrorBoundary>
        )}
      </section>
        </>
      )}
    </div>
  );
}

function shelterForPoint(pointId) {
  if (pointId === 'work') return 'Orchard Gateway concourse, demo routing';
  if (pointId === 'parents') return 'Woodlands Community Club, demo routing';
  return 'Tampines Hub, demo routing';
}

function alertAffectsPoint(alert, point) {
  if (alert.audience?.type === 'all') return true;
  if (alert.lat == null || alert.lng == null) return false;
  return distanceMeters(point, { lat: alert.lat, lng: alert.lng }) <= (alert.radiusMeters ?? 500);
}

function eventToFallbackResidentAlert(event) {
  return {
    id: `fallback:${event.id}`,
    sourceType: event.isDemo ? 'command_broadcast' : 'incident_activated',
    title: event.title,
    body: `${event.source} signal near ${event.location}.`,
    publicAction: event.publicAction,
    severity: event.severity,
    status: 'active',
    locationLabel: event.location,
    lat: event.lat,
    lng: event.lng,
    radiusMeters: event.vicinityRadiusMeters ?? 500,
  };
}

function buildPersonalGuidance(alert, point, profile) {
  const baseAction = stripTrailingPunctuation(alert.publicAction);
  const location = alert.locationLabel || point.sublabel;
  const common = [
    `${baseAction}.`,
    `Stay away from ${location} underpasses, basement links, and blocked routes until the alert changes.`,
  ];

  const profileStep = {
    elderly: 'Use lifts or sheltered street-level paths, and ask nearby staff or family for help before moving.',
    parent: 'If collecting children nearby, confirm pickup arrangements and avoid bringing them through crowded detours.',
    driver: 'Do not drive through flood water; park outside the affected area and follow traffic diversions.',
    tourist: 'Remain inside a staffed mall or station concourse if unsure, and follow official staff directions.',
    mobility: 'Choose lift-accessible street-level exits and request assistance before entering crowded walkways.',
    general: 'Move calmly to street level or a staffed indoor area if you are already nearby.',
  }[profile] ?? 'Move calmly to street level or a staffed indoor area if you are already nearby.';

  return {
    tone: (SEVERITY_RANK[alert.severity] ?? 0) >= 3 ? 'High priority' : 'Advisory',
    steps: [
      common[0],
      profileStep,
      `Check ${point.label} again before travelling; MURUS will update this card when command changes the alert.`,
    ],
    reassurance:
      alert.status === 'resolved'
        ? 'This alert is marked all-clear, but keep following posted closures until they are removed.'
        : 'This guidance is generated from the official alert and your selected resident profile.',
  };
}

function buildSimpleAlert(alert, point, profile) {
  const location = alert.locationLabel || point.sublabel;
  const action = stripTrailingPunctuation(alert.publicAction);
  const supportPoint = {
    elderly: 'Move slowly. Ask someone nearby to help you.',
    parent: 'Keep children close. Do not use crowded shortcuts.',
    driver: 'Do not drive through water or blocked roads.',
    tourist: 'Stay inside a staffed building if you are unsure.',
    mobility: 'Use lift-accessible street-level exits. Ask for assistance.',
    general: 'Stay calm and move away from the affected area.',
  }[profile] ?? 'Stay calm and move away from the affected area.';

  return {
    headline: alert.status === 'resolved' ? `All clear near ${location}` : `Avoid ${location}`,
    points: [
      action,
      supportPoint,
      `Check ${point.label} again before you travel.`,
    ],
  };
}

function answerResidentQuestion(question, alert, point, profile, context = {}) {
  const profileLabel =
    RESIDENT_PROFILES.find((residentProfile) => residentProfile.id === profile)?.label ?? 'General';
  const action = stripTrailingPunctuation(alert.publicAction);
  const location = alert.locationLabel ?? point.sublabel;
  const intent = detectResidentQuestionIntent(question);
  const homeAddress = context.residentDetails?.homeAddress || 'your saved home';
  const destination = context.residentDetails?.plannedDestination || homeAddress;
  const support = context.residentDetails?.supportNotes
    ? ` Support note: ${context.residentDetails.supportNotes}.`
    : '';
  const shelter = context.nearestShelter;
  const shelterText = shelter?.name
    ? ` Nearest SCDF shelter lookup: ${shelter.name}${shelter.address ? `, ${shelter.address}` : ''}${
        shelter.distanceMeters ? ` (${Math.round(shelter.distanceMeters)}m away)` : ''
      }. Confirm it is usable for this incident before moving.`
    : ' MURUS has not confirmed a shelter for this alert yet.';
  const homePoint = context.impactPoints?.find((candidate) => candidate.id === 'home');
  const homeFlagged = homePoint ? alertAffectsPoint(alert, homePoint) : false;
  const currentFlagged = alertAffectsPoint(alert, point);

  if (intent === 'affected') {
    return `Yes. ${point.label} is within the advisory area for ${location}. Follow the ${profileLabel.toLowerCase()} guidance above until the alert is updated.`;
  }
  if (intent === 'family') {
    return `Check saved places first. If family members are near ${location}, send them the action: ${action}.`;
  }
  if (intent === 'mrt') {
    return `Use the MRT only if MURUS and station staff say the route is clear. Avoid basement links and sheltered walkways near ${location} until the alert changes.`;
  }
  if (intent === 'home') {
    return `${point.label} is ${currentFlagged ? 'inside' : 'not currently inside'} the alert area. ${homeAddress} is ${homeFlagged ? 'inside' : 'not currently inside'} this alert radius. Only go to ${destination} if your route avoids ${location}; MURUS has not confirmed that your route is clear. If unsure, stay at a staffed place and wait for the next official update.${support}`;
  }
  if (intent === 'evacuate') {
    return `Move away from ${location} using street-level routes and follow official staff or emergency-service directions.${shelterText} If you cannot move safely from ${point.label}, check in as needing help.${support}`;
  }
  if (intent === 'elderly') {
    return `Move slowly, use lifts or sheltered street-level paths, and keep the elderly person away from crowded shortcuts near ${location}. If needed, ask staff or family for help before moving.`;
  }
  if (intent === 'avoid') {
    return `Avoid ${location}, nearby basement links, underpasses, blocked roads, and any route that repeats the official action: ${action}.`;
  }
  return `Do this now: ${action}. Avoid rushing, stay on safer routes, and wait for the next MURUS update.`;
}

function detectResidentQuestionIntent(question) {
  const normalized = question.toLowerCase();
  if (normalized.includes('affect') || normalized.includes('affected')) return 'affected';
  if (normalized.includes('family') || normalized.includes('parent') || normalized.includes('child')) {
    return 'family';
  }
  if (normalized.includes('mrt') || normalized.includes('train') || normalized.includes('bus')) return 'mrt';
  if (normalized.includes('home') || normalized.includes('house')) return 'home';
  if (normalized.includes('evacuat') || normalized.includes('shelter') || normalized.includes('assembly')) {
    return 'evacuate';
  }
  if (normalized.includes('elderly') || normalized.includes('senior') || normalized.includes('old')) {
    return 'elderly';
  }
  if (normalized.includes('avoid') || normalized.includes('where') || normalized.includes('unsafe')) {
    return 'avoid';
  }
  return 'general';
}

function buildSavedPlacesImpact(points, alerts) {
  const items = points.map((point) => {
    const matchingAlerts = alerts
      .filter((alert) => alertAffectsPoint(alert, point))
      .sort((left, right) => (SEVERITY_RANK[right.severity] ?? 0) - (SEVERITY_RANK[left.severity] ?? 0));
    const primaryAlert = matchingAlerts[0];
    const affected = Boolean(primaryAlert);
    return {
      point,
      affected,
      tone: affected ? statusTone(primaryAlert.severity) : 'clear',
      summary: affected
        ? `${primaryAlert.title} applies near ${primaryAlert.locationLabel}.`
        : 'No active resident alert radius covers this place.',
    };
  });
  const affectedItems = items.filter((item) => item.affected);

  return {
    items,
    affectedCount: affectedItems.length,
    familyMessage:
      affectedItems.length > 0
        ? `Check ${affectedItems.map((item) => item.point.label).join(', ')} first and share the official action with anyone nearby.`
        : 'Your saved places are not currently flagged. Keep monitoring MURUS before travelling.',
  };
}

function buildResidentContextPlaces(points, alerts) {
  return points.map((point) => {
    const matchingAlert = alerts
      .filter((alert) => alertAffectsPoint(alert, point))
      .sort((left, right) => (SEVERITY_RANK[right.severity] ?? 0) - (SEVERITY_RANK[left.severity] ?? 0))[0];

    return {
      id: point.id,
      label: point.label,
      address: point.sublabel,
      lat: point.lat,
      lng: point.lng,
      isAffected: Boolean(matchingAlert),
      affectedBy: matchingAlert?.title ?? null,
      affectedLocation: matchingAlert?.locationLabel ?? null,
    };
  });
}

function buildImpactResult({ point, transportMode, mobilityNeed, alerts }) {
  const matches = alerts
    .map((alert) => ({
      alert,
      distance: alert.lat != null && alert.lng != null
        ? distanceMeters(point, { lat: alert.lat, lng: alert.lng })
        : Number.POSITIVE_INFINITY,
    }))
    .filter(({ alert, distance }) => alert.audience?.type === 'all' || distance <= (alert.radiusMeters ?? 500))
    .sort((left, right) => (SEVERITY_RANK[right.alert.severity] ?? 0) - (SEVERITY_RANK[left.alert.severity] ?? 0));

  if (matches.length === 0) {
    return {
      tone: 'clear',
      label: `${point.label} is not currently flagged`,
      message:
        'No active resident alert radius covers this area right now. Keep monitoring official updates before travelling.',
      steps: [
        `Check ${point.label} again if your route changes.`,
        'Avoid relying on forwarded messages unless MURUS or an agency confirms them.',
        'Keep your saved places updated so future alerts can be checked faster.',
      ],
    };
  }

  const primaryAlert = matches[0].alert;
  const distanceLabel = Number.isFinite(matches[0].distance)
    ? `${Math.round(matches[0].distance)}m from the alert point`
    : 'inside a broad public advisory';
  const baseAction = stripTrailingPunctuation(primaryAlert.publicAction);

  return {
    tone: (SEVERITY_RANK[primaryAlert.severity] ?? 0) >= 3 ? 'critical' : 'warning',
    label: `${point.label} is affected`,
    message: `${point.sublabel} is ${distanceLabel} for ${primaryAlert.locationLabel}.`,
    steps: [
      `${baseAction}.`,
      transportStep(transportMode, primaryAlert),
      mobilityStep(mobilityNeed, point),
    ],
  };
}

function transportStep(mode, alert) {
  const location = alert.locationLabel;
  if (mode === 'driving') {
    return `Do not drive through flood water or blocked lanes near ${location}; use diversions before entering the affected area.`;
  }
  if (mode === 'mrt') {
    return `Use street-level MRT or bus exits where possible, and avoid basement links near ${location}.`;
  }
  if (mode === 'caregiver') {
    return `Move dependants before conditions worsen; keep children or elderly family on sheltered street-level routes.`;
  }
  return `Walk on street-level sheltered routes and avoid underpasses or basement corridors near ${location}.`;
}

function mobilityStep(need, point) {
  if (need === 'mobility') {
    return `For ${point.label}, choose lift-accessible exits and ask staff or family for help before moving through crowds.`;
  }
  if (need === 'elderly') {
    return `For ${point.label}, move slowly, avoid stairs, and ask someone nearby to accompany you if possible.`;
  }
  if (need === 'child') {
    return `For ${point.label}, keep children close and confirm pickup plans before entering the affected area.`;
  }
  return `Before travelling to ${point.label}, re-check this alert for updates from command.`;
}

function buildPreparednessChecklist({ profile, point, alert, transportMode, mobilityNeed }) {
  const location = alert?.locationLabel ?? point.sublabel;
  const action = alert?.publicAction
    ? stripTrailingPunctuation(alert.publicAction)
    : 'Keep monitoring MURUS before travelling';
  const items = [
    {
      id: 'phone',
      label: 'Phone charged',
      detail: 'Keep battery above 50% so MURUS, family, and emergency services can reach you.',
    },
    {
      id: 'water',
      label: 'Water bottle ready',
      detail: `Carry water before moving away from ${location}.`,
    },
    {
      id: 'id',
      label: 'ID and essentials',
      detail: 'Bring NRIC, access cards, keys, and any cashless payment card you may need.',
    },
    {
      id: 'power-bank',
      label: 'Power bank packed',
      detail: 'A charged backup keeps location sharing and emergency calls available longer.',
    },
    {
      id: 'family',
      label: 'Tell family your status',
      detail: `Share where you are and the official action: ${action}.`,
    },
  ];

  const profileItems = {
    elderly: [
      {
        id: 'medication',
        label: 'Medication packed',
        detail: 'Carry daily medication, inhalers, glasses, and a small note of medical conditions.',
      },
      {
        id: 'walking-aid',
        label: 'Walking aid ready',
        detail: 'Use lifts or sheltered paths and avoid stairs unless assisted.',
      },
      {
        id: 'caregiver-contact',
        label: 'Caregiver contact saved',
        detail: 'Call or message a caregiver before changing route.',
      },
    ],
    parent: [
      {
        id: 'school-contact',
        label: 'School contact checked',
        detail: 'Confirm whether school pickup, dismissal, or gate access has changed.',
      },
      {
        id: 'child-pickup',
        label: 'Child pickup plan',
        detail: 'Tell children where to wait and avoid bringing them through crowded detours.',
      },
      {
        id: 'child-snacks',
        label: 'Child essentials',
        detail: 'Pack snacks, water, medication, and a small comfort item if travel is delayed.',
      },
    ],
    driver: [
      {
        id: 'fuel',
        label: 'Fuel and route checked',
        detail: 'Confirm you have enough fuel or charge before taking a diversion.',
      },
      {
        id: 'avoid-flood-roads',
        label: 'Avoid flood roads',
        detail: `Do not enter blocked lanes or flood water near ${location}.`,
      },
    ],
    tourist: [
      {
        id: 'passport-copy',
        label: 'Passport copy ready',
        detail: 'Keep a photo or copy of your passport and travel documents accessible.',
      },
      {
        id: 'hotel-contact',
        label: 'Hotel contact saved',
        detail: 'Message your hotel or host if your route or arrival time changes.',
      },
    ],
    mobility: [
      {
        id: 'accessible-route',
        label: 'Lift-accessible route',
        detail: 'Choose street-level exits, lifts, ramps, and staffed areas before moving.',
      },
      {
        id: 'helper-contact',
        label: 'Helper contact ready',
        detail: 'Ask a helper, staff member, or family contact to accompany you if crowds build up.',
      },
    ],
    general: [],
  }[profile] ?? [];

  const transportItems = {
    mrt: [
      {
        id: 'transit-exits',
        label: 'Transit exits checked',
        detail: 'Use street-level MRT or bus exits and avoid basement links unless officials say they are clear.',
      },
    ],
    driving: [
      {
        id: 'driver-detour',
        label: 'Driving detour saved',
        detail: 'Save a dry, official diversion before approaching the affected area.',
      },
    ],
    caregiver: [
      {
        id: 'dependants-ready',
        label: 'Dependants ready',
        detail: 'Keep children or elderly family together before moving through queues or detours.',
      },
    ],
    walking: [],
  }[transportMode] ?? [];

  const mobilityItems = mobilityNeed === 'mobility'
    ? [
        {
          id: 'mobility-aid',
          label: 'Mobility aid ready',
          detail: 'Check wheelchair, cane, or walking frame before taking a longer route.',
        },
      ]
    : mobilityNeed === 'child'
      ? [
          {
            id: 'child-handhold',
            label: 'Child handhold plan',
            detail: 'Keep young children beside you and away from crowded shortcuts.',
          },
        ]
      : [];

  const uniqueItems = [...items, ...profileItems, ...transportItems, ...mobilityItems].filter(
    (item, index, allItems) => allItems.findIndex((candidate) => candidate.id === item.id) === index
  );

  return { items: uniqueItems };
}

function buildResidentStatusMessage({
  point,
  alert,
  transportMode,
  mobilityNeed,
  profile,
  preparedCount,
  totalCount,
}) {
  const place = `${point.label} near ${point.sublabel}`;
  const alertLabel = alert?.locationLabel ?? point.sublabel;
  const route = {
    walking: 'street-level sheltered routes',
    mrt: 'street-level MRT or bus exits',
    driving: 'official road diversions',
    caregiver: 'a slower route with dependants kept together',
  }[transportMode] ?? 'safer official routes';
  const support = {
    elderly: 'moving slowly and avoiding stairs',
    parent: 'checking child pickup arrangements',
    driver: 'avoiding flood water and blocked lanes',
    tourist: 'staying near staffed areas if unsure',
    mobility: 'choosing lift-accessible paths',
    general: 'following official instructions',
  }[profile] ?? 'following official instructions';
  const mobilityNote = mobilityNeed !== 'none'
    ? ` I also need ${MOBILITY_NEEDS.find((need) => need.id === mobilityNeed)?.label.toLowerCase()} support.`
    : '';

  if (!alert) {
    return `I am at ${place}. There is no active MURUS alert for this saved place right now. I am ${support} and my emergency pack is ${preparedCount}/${totalCount} ready.${mobilityNote}`;
  }

  return `I am at ${place}. I have seen the MURUS alert for ${alertLabel} and am preparing to move via ${route}. My emergency pack is ${preparedCount}/${totalCount} ready, and I am ${support}.${mobilityNote}`;
}

function stripTrailingPunctuation(value = '') {
  return value.trim().replace(/[.!?]+$/, '');
}

function checkResidentRumor(value, alerts) {
  const claim = value.trim();
  if (!claim) {
    return {
      status: 'empty',
      label: 'Add a claim to check',
      message: 'Type what you heard, then MURUS will compare it with current official alerts.',
    };
  }

  const claimTokens = meaningfulTokens(claim);
  const scoredAlerts = alerts
    .map((alert) => {
      const officialText = [
        alert.title,
        alert.body,
        alert.publicAction,
        alert.locationLabel,
        alert.severity,
        alert.status,
      ].join(' ');
      const officialTokens = meaningfulTokens(officialText);
      const overlap = claimTokens.filter((token) => officialTokens.includes(token));
      return { alert, score: overlap.length, overlap };
    })
    .sort((left, right) => right.score - left.score);

  const best = scoredAlerts[0];
  if (!best || best.score === 0) {
    return {
      status: 'unverified',
      label: 'Not verified by MURUS',
      message:
        'No current official alert matches this claim. Treat it as unverified and rely on MURUS or agency updates.',
    };
  }

  const hasLocationMatch = best.overlap.some((token) =>
    meaningfulTokens(best.alert.locationLabel ?? '').includes(token)
  );
  const hasActionMatch = best.overlap.some((token) =>
    meaningfulTokens(`${best.alert.title} ${best.alert.publicAction}`).includes(token)
  );

  if (best.score >= 3 && hasLocationMatch && hasActionMatch) {
    return {
      status: 'verified',
      label: 'Matches an official alert',
      message: `This sounds consistent with MURUS guidance: ${stripTrailingPunctuation(best.alert.publicAction)}.`,
      matchedAlert: best.alert,
    };
  }

  return {
    status: 'partial',
    label: 'Partly related, not fully confirmed',
    message:
      'This mentions a similar area or hazard, but the exact claim is not confirmed in the current official alert. Follow only the official action shown below.',
    matchedAlert: best.alert,
  };
}

function meaningfulTokens(value = '') {
  const stopWords = new Set([
    'the',
    'and',
    'for',
    'from',
    'heard',
    'that',
    'near',
    'with',
    'this',
    'alert',
    'official',
    'murus',
    'avoid',
  ]);
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}
