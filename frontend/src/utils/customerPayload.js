/**
 * Build API payload for customer add/update from form state.
 * Form uses camelCase; API expects snake_case.
 * @param {{ name: string, fatherName?: string, phonePrimary: string, phoneSecondary?: string, email?: string, address?: string, city?: string, pincode?: string, gender?: string, country?: string }} formData
 * @returns {Record<string, unknown>}
 */
export function customerFormToPayload(formData) {
  return {
    name: formData.name ?? "",
    father_name: formData.fatherName ?? null,
    primary_phone: formData.phonePrimary ?? "",
    secondary_phone: formData.phoneSecondary || null,
    address: formData.address || null,
    city: formData.city || null,
    pincode: formData.pincode || null,
    gender: formData.gender || "Male",
    country: formData.country || "India",
    email: formData.email || null,
  };
}

export const CUSTOMER_FORM_INITIAL = {
  name: "",
  fatherName: "",
  phonePrimary: "",
  phoneSecondary: "",
  email: "",
  address: "",
  city: "",
  pincode: "",
  gender: "Male",
  country: "India",
};
