"use client";

import { api, query } from "@/lib/api";
import { INDIAN_STATES } from "@/lib/constants";
import type { GeoAddress, GeoLocation } from "@/lib/types";

export interface Coords {
  latitude: number;
  longitude: number;
  label: string;
  precision?: GeoLocation["precision"];
}

/** The browser's current position. Rejects with a human-readable message. */
export function currentPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Your browser can't share your location — enter the pincode instead."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) =>
        reject(
          new Error(
            error.code === error.PERMISSION_DENIED
              ? "Location access was blocked — enter the pincode instead."
              : "Couldn't get your location — enter the pincode instead.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

/** Address fields (area, city, state, pincode) for a point, to prefill a form. */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeoAddress | null> {
  try {
    return await api<GeoAddress>(`/geo/reverse${query({ latitude, longitude })}`);
  } catch {
    return null;
  }
}

/** Coordinates for a pincode (falls back to the city). Throws ApiError when not found. */
export function locatePincode(pincode: string, city?: string, state?: string): Promise<GeoLocation> {
  return api<GeoLocation>(`/geo/locate${query({ pincode, city, state })}`);
}

/** Map a geocoder's state name onto our dropdown's spelling, if it's one of them. */
export function matchState(name: string | null): string {
  if (!name) return "";
  const lower = name.toLowerCase();
  return (
    INDIAN_STATES.find((s) => s.toLowerCase() === lower) ??
    INDIAN_STATES.find((s) => lower.includes(s.toLowerCase())) ??
    ""
  );
}
