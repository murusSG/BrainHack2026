import { supabase } from "../config/supabase";
import type {
  ResidentMobilityNeed,
  ResidentProfile,
  ResidentSavedPlace,
  ResidentSavedPlaceType,
  ResidentTransportMode,
  UpdateResidentProfileInput,
} from "../modules/residents/residents.types";

type ResidentProfileRow = {
  user_id: string;
  display_name: string | null;
  home_address: string | null;
  preferred_transport: string | null;
  mobility_need: string | null;
  support_notes: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};

type ResidentSavedPlaceRow = {
  id: string;
  label: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  place_type: string | null;
  is_primary: boolean | null;
};

const transportModes: ResidentTransportMode[] = ["walking", "mrt", "driving", "caregiver"];
const mobilityNeeds: ResidentMobilityNeed[] = ["none", "elderly", "mobility", "child"];
const placeTypes: ResidentSavedPlaceType[] = ["home", "work", "school", "family", "other"];

export const residentProfilesRepo = {
  async getProfile(userId: string): Promise<ResidentProfile | null> {
    if (!supabase) return null;

    const [{ data: profile, error: profileError }, { data: places, error: placesError }] =
      await Promise.all([
        supabase
          .from("resident_profiles")
          .select(
            "user_id, display_name, home_address, preferred_transport, mobility_need, support_notes, emergency_contact_name, emergency_contact_phone"
          )
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("resident_saved_places")
          .select("id, label, address, lat, lng, place_type, is_primary")
          .eq("user_id", userId)
          .order("is_primary", { ascending: false })
          .order("created_at", { ascending: true }),
      ]);

    if (profileError) {
      console.error("[residentProfilesRepo.getProfile]", profileError.message);
      return null;
    }
    if (placesError) {
      console.error("[residentProfilesRepo.getPlaces]", placesError.message);
    }
    if (!profile) return null;

    return mapResidentProfile(profile as ResidentProfileRow, (places ?? []) as ResidentSavedPlaceRow[]);
  },

  async upsertProfile(userId: string, input: UpdateResidentProfileInput): Promise<ResidentProfile | null> {
    if (!supabase) return null;

    const { error } = await supabase.from("resident_profiles").upsert({
      user_id: userId,
      display_name: input.displayName ?? null,
      home_address: input.homeAddress ?? null,
      preferred_transport: input.preferredTransport ?? "walking",
      mobility_need: input.mobilityNeed ?? "none",
      support_notes: input.supportNotes ?? null,
      emergency_contact_name: input.emergencyContactName ?? null,
      emergency_contact_phone: input.emergencyContactPhone ?? null,
    });

    if (error) {
      console.error("[residentProfilesRepo.upsertProfile]", error.message);
      return null;
    }

    if (input.savedPlaces) {
      const { error: deleteError } = await supabase
        .from("resident_saved_places")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        console.error("[residentProfilesRepo.replacePlaces.delete]", deleteError.message);
        return null;
      }

      const rows = input.savedPlaces
        .filter((place) => place.label?.trim())
        .map((place) => ({
          user_id: userId,
          label: place.label?.trim(),
          address: place.address?.trim() || null,
          lat: finiteOrNull(place.lat),
          lng: finiteOrNull(place.lng),
          place_type: placeTypes.includes(place.placeType as ResidentSavedPlaceType)
            ? place.placeType
            : "other",
          is_primary: Boolean(place.isPrimary),
        }));

      if (rows.length > 0) {
        const { error: insertError } = await supabase.from("resident_saved_places").insert(rows);
        if (insertError) {
          console.error("[residentProfilesRepo.replacePlaces.insert]", insertError.message);
          return null;
        }
      }
    }

    return this.getProfile(userId);
  },
};

function mapResidentProfile(row: ResidentProfileRow, places: ResidentSavedPlaceRow[]): ResidentProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name ?? undefined,
    homeAddress: row.home_address ?? undefined,
    preferredTransport: parseTransport(row.preferred_transport),
    mobilityNeed: parseMobility(row.mobility_need),
    supportNotes: row.support_notes ?? undefined,
    emergencyContactName: row.emergency_contact_name ?? undefined,
    emergencyContactPhone: row.emergency_contact_phone ?? undefined,
    savedPlaces: places.map(mapSavedPlace),
  };
}

function mapSavedPlace(row: ResidentSavedPlaceRow): ResidentSavedPlace {
  return {
    id: row.id,
    label: row.label,
    address: row.address ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    placeType: placeTypes.includes(row.place_type as ResidentSavedPlaceType)
      ? (row.place_type as ResidentSavedPlaceType)
      : "other",
    isPrimary: Boolean(row.is_primary),
  };
}

function parseTransport(value: string | null): ResidentTransportMode {
  return transportModes.includes(value as ResidentTransportMode) ? (value as ResidentTransportMode) : "walking";
}

function parseMobility(value: string | null): ResidentMobilityNeed {
  return mobilityNeeds.includes(value as ResidentMobilityNeed) ? (value as ResidentMobilityNeed) : "none";
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
