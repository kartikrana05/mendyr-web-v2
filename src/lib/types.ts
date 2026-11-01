// Shapes returned by the Mendyr API (the `data` of each `{success, data, meta, error}`
// envelope). Mirrors app/schemas/* in Mendyr-Backend — keep the two in step.

export type Role = "patient" | "professional" | "admin" | "super_admin" | "ops";

export type ProfessionalType =
  | "nurse"
  | "physiotherapist"
  | "caretaker"
  | "lab_technician"
  | "doctor"
  | "baby_care_specialist";

export type BookingStatus =
  | "created"
  | "searching"
  | "assigned"
  | "confirmed"
  | "en_route"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"
  | "failed";

export type VerificationStatus = "pending" | "in_review" | "approved" | "rejected";

export interface User {
  id: string;
  phone_number: string;
  email: string | null;
  full_name: string;
  gender: "male" | "female" | "other" | "unspecified";
  date_of_birth: string | null;
  avatar_url: string | null;
  role: Role;
  status: "active" | "suspended" | "deleted";
  referral_code: string;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
}

export interface Service {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  required_professional_type: ProfessionalType;
  duration_minutes: number;
  base_price: number;
  is_recurring_eligible: boolean;
  requires_prescription: boolean;
  image_url?: string | null;
  tagline?: string | null;
  badge?: string | null;
  includes?: string[];
  excludes?: string[];
  faqs?: Faq[];
  rating_avg?: number | null;
  rating_count?: number;
  bookings_count?: number;
}

export interface Faq {
  q: string;
  a: string;
}

export interface Address {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  contact_name: string | null;
  contact_phone: string | null;
  instructions_for_professional: string | null;
  latitude: number;
  longitude: number;
}

export interface Quote {
  base_price: number;
  discount_amount: number;
  platform_fee: number;
  tax_amount: number;
  total_amount: number;
}

export interface PublicProfessional {
  id: string;
  full_name: string;
  avatar_url: string | null;
  professional_type: ProfessionalType;
  years_of_experience: number;
  average_rating: number;
  total_ratings: number;
  languages_spoken: string[] | null;
}

export interface NearbyProfessional extends PublicProfessional {
  distance_km: number;
}

export interface AssignedProfessional extends PublicProfessional {
  /** Withheld (null) once contact details are hidden — never render it as a dial link then. */
  phone_number: string | null;
  user_ref: string;
  is_verified: boolean;
  gender: string;
}

export type CancelledBy = "patient" | "professional" | "admin" | "system";

export interface StatusEvent {
  status: BookingStatus;
  at: string;
  note: string | null;
}

/** A booking as its patient sees it. */
export interface Booking {
  id: string;
  booking_code: string;
  status: BookingStatus;
  service_id: string;
  service_name_snapshot: string;
  address_snapshot: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  base_price: number;
  discount_amount: number;
  /** Mendyr's commission, taken from the professional's payout — never shown to patients. */
  platform_fee: number;
  tax_amount: number;
  total_amount: number;
  patient_notes: string | null;
  cancellation_reason: string | null;
  cancellation_fee_amount: number;
  cancelled_by: CancelledBy | null;
  professional: AssignedProfessional | null;
  visit_summary_notes: string | null;
  vitals_recorded: string | null;
  review_rating: number | null;
  visit_pin: string | null;
  preferred_gender: string | null;
  en_route_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  contact_hidden: boolean;
  timeline: StatusEvent[];
  created_at: string;
}

export interface BookingListItem {
  id: string;
  booking_code: string;
  status: BookingStatus;
  service_name_snapshot: string;
  scheduled_start_at: string;
  total_amount: number;
  professional_name: string | null;
}

export interface ProfessionalProfile {
  id: string;
  professional_type: ProfessionalType;
  years_of_experience: number;
  bio: string | null;
  license_number: string | null;
  council_registration_number: string | null;
  languages_spoken: string[] | null;
  verification_status: VerificationStatus;
  rejection_reason: string | null;
  is_accepting_bookings: boolean;
  latitude: number | null;
  longitude: number | null;
  service_radius_km: number;
  average_rating: number;
  total_ratings: number;
  total_visits_completed: number;
  created_at: string;
}

/** An open booking a professional may accept — area only, no street address yet. */
export interface BookingRequest {
  id: string;
  booking_code: string;
  service_id: string;
  service_name: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  area: string;
  distance_km: number;
  earning_amount: number;
  patient_notes: string | null;
  preferred_gender: string | null;
  created_at: string;
}

/** A booking as its assigned professional sees it. */
export interface ProBooking {
  id: string;
  booking_code: string;
  status: BookingStatus;
  service_name: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  address: string;
  landmark: string | null;
  instructions: string | null;
  latitude: number | null;
  longitude: number | null;
  patient_name: string;
  patient_phone: string | null;
  patient_ref: string;
  patient_notes: string | null;
  earning_amount: number;
  en_route_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  visit_summary_notes: string | null;
  vitals_recorded: string | null;
  cancellation_reason: string | null;
  cancelled_by: CancelledBy | null;
  requires_visit_pin: boolean;
  contact_hidden: boolean;
  created_at: string;
}

export interface AvailabilitySlot {
  day_of_week: number; // 0 = Monday
  start_time: string; // "HH:MM" (the API returns "HH:MM:SS")
  end_time: string;
}

export interface MyService {
  service_id: string;
  service_name: string;
  category_name: string;
  base_price: number;
  is_opted_in: boolean;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  label: string;
  precision: "pincode" | "city";
}

export interface GeoAddress {
  latitude: number;
  longitude: number;
  label: string;
  area: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
}

export interface AppNotification {
  id: string;
  title: string | null;
  body: string;
  template_key: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationInbox {
  items: AppNotification[];
  unread_count: number;
}
