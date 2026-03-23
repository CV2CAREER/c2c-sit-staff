export function validatePasswordStrength(password: string): string | null {
  const trimmed = password.trim();

  if (trimmed.length < 8) {
    return "Password must be at least 8 characters long";
  }

  if (trimmed.length > 32) {
    return "Password can not be greater than 32 characters long";
  }

  return null;
}
