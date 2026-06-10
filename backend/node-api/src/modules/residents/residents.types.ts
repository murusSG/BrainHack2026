export type ResidentTransportMode = "walking" | "mrt" | "driving" | "caregiver";
export type ResidentMobilityNeed = "none" | "elderly" | "mobility" | "child";
export type ResidentSavedPlaceType = "home" | "work" | "school" | "family" | "other";

export interface ResidentSavedPlace {
  id: string;
  label: string;
  address?: string;
  lat?: number;
  lng?: number;
  placeType: ResidentSavedPlaceType;
  isPrimary: boolean;
}

export interface ResidentProfile {
  userId: string;
  displayName?: string;
  homeAddress?: string;
  preferredTransport: ResidentTransportMode;
  mobilityNeed: ResidentMobilityNeed;
  supportNotes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  savedPlaces: ResidentSavedPlace[];
}

export interface UpdateResidentProfileInput {
  displayName?: string;
  homeAddress?: string;
  preferredTransport?: ResidentTransportMode;
  mobilityNeed?: ResidentMobilityNeed;
  supportNotes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  savedPlaces?: Array<Partial<ResidentSavedPlace>>;
}
