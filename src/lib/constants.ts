import type { BookingStatus, ProfessionalType } from "@/lib/types";

/** Share of the visit price a professional keeps. Mirrors the backend's
 * PLATFORM_COMMISSION_PCT (20) — used only in marketing copy; real earnings come from the API. */
export const PROFESSIONAL_SHARE_PCT = 80;

export const PROFESSIONS: { type: ProfessionalType; label: string; blurb: string }[] = [
  { type: "nurse", label: "Nurse", blurb: "GNM / ANM / B.Sc nursing" },
  { type: "physiotherapist", label: "Physiotherapist", blurb: "BPT / MPT" },
  { type: "caretaker", label: "Caretaker / attendant", blurb: "Elder & patient care" },
  { type: "baby_care_specialist", label: "Baby care specialist", blurb: "Mother & newborn care" },
  { type: "lab_technician", label: "Lab technician", blurb: "Sample collection (DMLT)" },
  { type: "doctor", label: "Doctor", blurb: "MBBS and above" },
];

export const PROFESSION_LABEL = Object.fromEntries(
  PROFESSIONS.map((p) => [p.type, p.label]),
) as Record<ProfessionalType, string>;

export function registrationLabel(type: ProfessionalType): string {
  switch (type) {
    case "nurse":
      return "Nursing council registration no.";
    case "doctor":
      return "Medical council registration no.";
    case "physiotherapist":
      return "Physiotherapy council / IAP registration no.";
    default:
      return "Certificate / license no.";
  }
}

type Tone = "gray" | "amber" | "blue" | "green" | "red" | "violet";

export const STATUS: Record<BookingStatus, { label: string; tone: Tone }> = {
  created: { label: "Created", tone: "gray" },
  searching: { label: "Finding a professional", tone: "amber" },
  assigned: { label: "Confirmed", tone: "blue" },
  confirmed: { label: "Confirmed", tone: "blue" },
  en_route: { label: "On the way", tone: "violet" },
  in_progress: { label: "Visit in progress", tone: "violet" },
  completed: { label: "Completed", tone: "green" },
  cancelled: { label: "Cancelled", tone: "red" },
  no_show: { label: "No-show", tone: "red" },
  failed: { label: "Not fulfilled", tone: "red" },
};

/** Bookings that are still going to happen (or are happening). */
export const ACTIVE_STATUSES: BookingStatus[] = [
  "created",
  "searching",
  "assigned",
  "confirmed",
  "en_route",
  "in_progress",
];

export const CANCELLABLE_STATUSES: BookingStatus[] = [
  "created",
  "searching",
  "assigned",
  "confirmed",
  "en_route",
  "failed",
];

export const LANGUAGES = [
  "English",
  "Hindi",
  "Kannada",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Punjabi",
  "Odia",
  "Urdu",
];

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

/** Fallback copy for catalogue services that don't have a description yet. */
export const PROFESSION_SERVICE_COPY: Record<ProfessionalType, string> = {
  nurse: "A qualified nurse at home — injections, wound care, vitals, post-surgery care.",
  physiotherapist: "A physiotherapist at home for pain, mobility and post-surgery recovery.",
  caretaker: "A trained attendant for daily care, mobility help and companionship.",
  baby_care_specialist: "Help for new mothers — newborn bathing, feeding and sleep routines.",
  lab_technician: "A technician collects blood and other samples at home.",
  doctor: "A doctor's consultation at home.",
};
