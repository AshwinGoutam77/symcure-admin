export interface Qualification {
  degree: string;
  college: string;
  specialty?: string;
  completion_year: string;
}
export interface Professional {
  designation?: string;
  department?: string;
  institute?: string;
  state?: string;
  city?: string;
  experience?: string;
} 
export type ProfileFormData = {
  [x: string]:
    | string
    | number
    | boolean
    | string[]
    | Qualification[]
    | Professional[]
    | undefined;
  id?: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  clinicName: string;
  address: string;
  area: string;
  city: string;
  pincode: string;
  state: string;
  council: string;
  specialty: string;
  experience: string;
  other_qualification: string;
  qualifications: Qualification[];
  professionals: Professional[];
  registration_number: string;
  registration_year: string;
  online_fee: string;
  clinic_fee: string;
  show_fees_on_app: boolean;
  online_booking_window: string;
  clinic_booking_window: string;
  languages: string[];
  otherLanguage: string;
  bio: string;
  app_appointment_token_start: string;
  aadhaar: string;
  abha: string;
  hpid: string;
  // New Fields Added
  registered_date: string;
  account_status: "active" | "inactive" | "suspended";
  application_status: "pending" | "approve" | "reject";
  commission: number;
};