export const FIELD_TYPES = [
  { type: "text", label: "Short text" },
  { type: "textarea", label: "Long text" },
  { type: "date", label: "Date picker" },
  { type: "select", label: "Dropdown" },
  { type: "checkbox", label: "Multi-select" },
  { type: "file", label: "File upload" },
  { type: "number", label: "Number" },
  { type: "phone", label: "Phone" },
  { type: "email", label: "Email" },
] as const;

export const REFEREE_BLOCK_FIELD_TYPE = {
  type: "referee_block" as const,
  label: "Referee block (10 fields)",
};

export const REFEREE_DEFAULT_FIELDS = [
  { fieldName: "organization_name", fieldLabel: "Organization Name", fieldType: "text", isRequired: true, isVisible: true, helpText: "Company / institution name" },
  { fieldName: "position_title", fieldLabel: "Position Title", fieldType: "text", isRequired: true, isVisible: true, helpText: "e.g. Manager, Director" },
  { fieldName: "phone_number", fieldLabel: "Phone Number", fieldType: "phone", isRequired: true, isVisible: true, helpText: "Include country code" },
  { fieldName: "email", fieldLabel: "Email", fieldType: "email", isRequired: true, isVisible: true, helpText: "Work email preferred" },
  { fieldName: "postal_address", fieldLabel: "Postal Address", fieldType: "text", isRequired: false, isVisible: true, helpText: "Street address" },
  { fieldName: "city", fieldLabel: "City", fieldType: "text", isRequired: false, isVisible: true, helpText: null },
  { fieldName: "state", fieldLabel: "State", fieldType: "text", isRequired: false, isVisible: true, helpText: null },
  { fieldName: "postcode", fieldLabel: "Postcode", fieldType: "text", isRequired: false, isVisible: true, helpText: null },
  { fieldName: "country", fieldLabel: "Country", fieldType: "text", isRequired: false, isVisible: true, helpText: null },
  { fieldName: "relationship", fieldLabel: "Relationship", fieldType: "text", isRequired: false, isVisible: true, helpText: null },
] as const;

export type FieldTypeEntry = (typeof FIELD_TYPES)[number];
