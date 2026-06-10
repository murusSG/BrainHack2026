import { z } from "zod";
import type { AuthUser } from "../../middlewares/auth";
import { residentProfilesRepo } from "../../repositories/residentProfiles.repo";
import { BadRequestError, ConfigurationError } from "../../utils/apiError";
import type { ResidentProfile, UpdateResidentProfileInput } from "./residents.types";

const transportModes = ["walking", "mrt", "driving", "caregiver"] as const;
const mobilityNeeds = ["none", "elderly", "mobility", "child"] as const;
const placeTypes = ["home", "work", "school", "family", "other"] as const;
const residentPersonas = ["general", "elderly", "parent", "driver", "tourist", "mobility"] as const;

const savedPlaceSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1).max(80),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  lat: z.number().finite().optional(),
  lng: z.number().finite().optional(),
  placeType: z.enum(placeTypes).optional(),
  isPrimary: z.boolean().optional(),
});

const updateProfileSchema = z.object({
  displayName: z.string().trim().max(100).optional().or(z.literal("")),
  homeAddress: z.string().trim().max(200).optional().or(z.literal("")),
  residentPersona: z.enum(residentPersonas).optional(),
  preferredTransport: z.enum(transportModes).optional(),
  mobilityNeed: z.enum(mobilityNeeds).optional(),
  supportNotes: z.string().trim().max(300).optional().or(z.literal("")),
  emergencyContactName: z.string().trim().max(100).optional().or(z.literal("")),
  emergencyContactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  savedPlaces: z.array(savedPlaceSchema).max(12).optional(),
});

export async function getResidentProfile(user: AuthUser): Promise<ResidentProfile> {
  const existing = await residentProfilesRepo.getProfile(user.id);
  return existing ?? buildDefaultProfile(user);
}

export async function updateResidentProfile(
  user: AuthUser,
  rawInput: unknown
): Promise<ResidentProfile> {
  const parsed = updateProfileSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw new BadRequestError("Resident profile payload is invalid.", {
      issues: parsed.error.issues.map((issue) => issue.message),
    });
  }

  const input = normalizeInput(parsed.data);
  const saved = await residentProfilesRepo.upsertProfile(user.id, {
    ...input,
    savedPlaces: input.savedPlaces ?? buildDefaultSavedPlaces(input),
  });
  if (!saved) {
    throw new ConfigurationError("Resident profiles are unavailable. Run migration 007_resident_profiles.sql.");
  }
  return saved;
}

function buildDefaultProfile(user: AuthUser): ResidentProfile {
  return {
    userId: user.id,
    displayName: user.fullName ?? user.email?.split("@")[0] ?? "Resident",
    homeAddress: "",
    residentPersona: "general",
    preferredTransport: "walking",
    mobilityNeed: "none",
    supportNotes: "",
    emergencyContactName: "",
    emergencyContactPhone: user.phone ?? "",
    savedPlaces: [],
  };
}

function normalizeInput(input: z.infer<typeof updateProfileSchema>): UpdateResidentProfileInput {
  return {
    displayName: input.displayName?.trim() || undefined,
    homeAddress: input.homeAddress?.trim() || undefined,
    residentPersona: input.residentPersona,
    preferredTransport: input.preferredTransport,
    mobilityNeed: input.mobilityNeed,
    supportNotes: input.supportNotes?.trim() || undefined,
    emergencyContactName: input.emergencyContactName?.trim() || undefined,
    emergencyContactPhone: input.emergencyContactPhone?.trim() || undefined,
    savedPlaces: input.savedPlaces?.map((place) => ({
      id: place.id,
      label: place.label.trim(),
      address: place.address?.trim() || undefined,
      lat: place.lat,
      lng: place.lng,
      placeType: place.placeType ?? "other",
      isPrimary: Boolean(place.isPrimary),
    })),
  };
}

function buildDefaultSavedPlaces(input: UpdateResidentProfileInput) {
  if (!input.homeAddress) return [];
  return [
    {
      label: "Home",
      address: input.homeAddress,
      placeType: "home" as const,
      isPrimary: true,
    },
  ];
}
