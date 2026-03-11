export const STAFF_ACCOUNT_EMAIL = "staff@falowen.app";
export const STAFF_ACCOUNT_PASSWORD = "Office123/";

export function isStaffEmail(email = "") {
  return email.trim().toLowerCase() === STAFF_ACCOUNT_EMAIL;
}
