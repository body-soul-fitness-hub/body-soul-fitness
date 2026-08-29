export const GYM_SETTINGS_ID = 1;

export type GymSettings = {
  id: number;
  gym_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  gstin: string | null;
  tax_label: string;
  tax_rate: number;
  thank_you_message: string;
  updated_at: string;
};

// Used to fill in gaps until the settings row exists / has been saved for the first time.
export const DEFAULT_GYM_SETTINGS: Omit<GymSettings, "id" | "updated_at"> = {
  gym_name: "Body & Soul Fitness Center",
  address: null,
  phone: null,
  email: null,
  website: null,
  gstin: null,
  tax_label: "GST",
  tax_rate: 0,
  thank_you_message: "Thank you for choosing Body & Soul Fitness Center. See you at the gym!",
};
