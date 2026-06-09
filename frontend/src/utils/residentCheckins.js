export const RESIDENT_CHECKIN_STORAGE_KEY = 'murusResidentCheckins';

export const CHECK_IN_OPTIONS = [
  {
    id: 'safe',
    label: "I'm safe",
    detail: 'No assistance needed right now.',
    tone: 'safe',
  },
  {
    id: 'need_help',
    label: 'I need help',
    detail: 'Flag this resident for command review.',
    tone: 'help',
  },
  {
    id: 'moving',
    label: "I'm moving away",
    detail: 'Resident is leaving the affected area.',
    tone: 'moving',
  },
  {
    id: 'with_family',
    label: "I'm with family",
    detail: 'Resident has connected with family.',
    tone: 'family',
  },
  {
    id: 'accessible',
    label: 'I need accessible assistance',
    detail: 'Needs lift-accessible or assisted routing.',
    tone: 'accessible',
  },
];

export function readResidentCheckins() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RESIDENT_CHECKIN_STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveResidentCheckin(checkin) {
  const current = readResidentCheckins();
  const next = [
    {
      ...checkin,
      id: `${checkin.alertId}:${checkin.status}:${Date.now()}`,
      updatedAt: new Date().toISOString(),
    },
    ...current.filter((item) => item.alertId !== checkin.alertId),
  ].slice(0, 30);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(RESIDENT_CHECKIN_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('murusResidentCheckinsUpdated'));
  }

  return next;
}

export function summarizeResidentCheckins(checkins) {
  const counts = CHECK_IN_OPTIONS.reduce(
    (acc, option) => ({
      ...acc,
      [option.id]: checkins.filter((item) => item.status === option.id).length,
    }),
    {}
  );
  const priority = checkins.filter((item) => item.status === 'need_help' || item.status === 'accessible');

  return {
    total: checkins.length,
    counts,
    priority,
    latest: checkins[0] ?? null,
  };
}
