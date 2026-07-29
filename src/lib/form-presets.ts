/**
 * Signup-form presets: Email Signup, Text Signup, Email and Text Signup.
 * The hosted form renders a separate SMS consent checkbox (never prechecked)
 * whenever a phone field is present.
 */

export interface FormFieldDef {
  key: string;
  label: string;
  type: "email" | "text" | "checkbox" | "phone";
  required: boolean;
}

export type FormRequirementMode =
  | "email-required"
  | "phone-required"
  | "either-required"
  | "both-required";

export interface FormPreset {
  requirementMode: FormRequirementMode;
  collectPhone: boolean;
  fields: FormFieldDef[];
}

export const FORM_PRESETS: Record<"email" | "text" | "email-and-text", FormPreset> = {
  email: {
    requirementMode: "email-required",
    collectPhone: false,
    fields: [
      { key: "email", label: "Email", type: "email", required: true },
      { key: "firstName", label: "First name", type: "text", required: false },
    ],
  },
  text: {
    requirementMode: "phone-required",
    collectPhone: true,
    fields: [
      { key: "phone", label: "Mobile phone", type: "phone", required: true },
      { key: "firstName", label: "First name", type: "text", required: false },
    ],
  },
  "email-and-text": {
    requirementMode: "either-required",
    collectPhone: true,
    fields: [
      { key: "email", label: "Email", type: "email", required: false },
      { key: "phone", label: "Mobile phone", type: "phone", required: false },
      { key: "firstName", label: "First name", type: "text", required: false },
    ],
  },
};
