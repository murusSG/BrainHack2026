import type { NextFunction, Request, Response } from "express";
import { BadRequestError } from "../../utils/apiError";
import { getResidentProfile } from "../residents/residents.service";
import { answerAskMurus } from "./residentAskMurus.service";
import { createResidentAlert, listResidentAlerts, updateResidentAlert } from "./residentAlerts.service";
import type { ResidentAlertFilter } from "./residentAlerts.types";

export async function getResidentAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await listResidentAlerts(parseFilter(req));
    res.json({
      data,
      source: "MURUS resident alert system",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function postResidentAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await createResidentAlert(req.body ?? {});
    res.status(201).json({
      data,
      source: "MURUS resident alert system",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function patchResidentAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await updateResidentAlert(String(req.params.id), req.body ?? {});
    res.json({
      data,
      source: "MURUS resident alert system",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function postAskMurus(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await answerAskMurus(await buildAskMurusInput(req));
    res.json({
      data,
      source: "Ask MURUS resident copilot",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

async function buildAskMurusInput(req: Request) {
  const input = { ...(req.body ?? {}) };
  if (!req.user) return input;

  const profile = await getResidentProfile(req.user);
  const profileContext = {
    profile: profile.residentPersona,
    profileLabel: residentPersonaLabel(profile.residentPersona),
    residentDetails: {
      displayName: profile.displayName,
      homeAddress: profile.homeAddress,
      supportNotes: profile.supportNotes,
      emergencyContactName: profile.emergencyContactName,
      emergencyContactPhone: profile.emergencyContactPhone,
    },
    transportMode: profile.preferredTransport,
    mobilityNeed: profile.mobilityNeed,
    savedPlaces: profile.savedPlaces.map((place) => ({
      id: place.id,
      label: place.label,
      address: place.address,
      isAffected: false,
      affectedBy: null,
      affectedLocation: null,
    })),
  };
  const clientContext = input.residentContext ?? {};

  return {
    ...input,
    residentContext: {
      ...profileContext,
      ...clientContext,
      residentDetails: {
        ...profileContext.residentDetails,
        ...(clientContext.residentDetails ?? {}),
      },
      savedPlaces: clientContext.savedPlaces ?? profileContext.savedPlaces,
    },
  };
}

function residentPersonaLabel(persona: string) {
  const labels: Record<string, string> = {
    general: "General",
    elderly: "Elderly",
    parent: "Parent",
    driver: "Driver",
    tourist: "Tourist",
    mobility: "Mobility support",
  };
  return labels[persona] ?? "General";
}

function parseFilter(req: Request): ResidentAlertFilter {
  const lat = parseOptionalNumber(req.query.lat, "lat");
  const lng = parseOptionalNumber(req.query.lng, "lng");
  const radiusMeters = parseOptionalNumber(req.query.radiusMeters, "radiusMeters");

  if ((lat == null) !== (lng == null)) {
    throw new BadRequestError("lat and lng must be provided together.");
  }
  if (radiusMeters != null && radiusMeters <= 0) {
    throw new BadRequestError("radiusMeters must be positive.", { radiusMeters });
  }

  return { lat, lng, radiusMeters };
}

function parseOptionalNumber(value: unknown, name: string): number | undefined {
  if (value == null) return undefined;
  if (typeof value !== "string") throw new BadRequestError(`${name} must be a number.`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new BadRequestError(`${name} must be a number.`, { [name]: value });
  return parsed;
}
