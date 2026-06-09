import { supabase } from "../config/supabase";
import type { UserRole } from "../middlewares/auth";

export interface AuthProfile {
  id: string;
  role: UserRole;
  agency?: string;
  fullName?: string;
  phone?: string;
}

type ProfileRow = {
  id: string;
  role: string | null;
  agency: string | null;
  full_name: string | null;
  phone: string | null;
};

const validRoles: UserRole[] = ["public", "responder", "leader"];

export const authRepo = {
  async getProfile(userId: string): Promise<AuthProfile | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, agency, full_name, phone")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[authRepo.getProfile]", error.message);
      return null;
    }
    if (!data) return null;

    return mapProfile(data as ProfileRow);
  },
};

function mapProfile(row: ProfileRow): AuthProfile {
  const role = validRoles.includes(row.role as UserRole) ? (row.role as UserRole) : "public";

  return {
    id: row.id,
    role,
    agency: row.agency ?? undefined,
    fullName: row.full_name ?? undefined,
    phone: row.phone ?? undefined,
  };
}
