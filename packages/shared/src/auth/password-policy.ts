export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 1024,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecialCharacter: true,
  helperText: "Minst 8 tegn, med store og små bokstaver, tall og spesialtegn.",
  validationMessage: "Passordet må være minst 8 tegn og inneholde store og små bokstaver, tall og spesialtegn."
} as const;

const UPPERCASE_PATTERN = /\p{Lu}/u;
const LOWERCASE_PATTERN = /\p{Ll}/u;
const DIGIT_PATTERN = /\p{Nd}/u;
const SPECIAL_CHARACTER_PATTERN = /[^\p{L}\p{N}]/u;

export function isPasswordValid(password: string): boolean {
  return password.length >= PASSWORD_POLICY.minLength &&
    password.length <= PASSWORD_POLICY.maxLength &&
    UPPERCASE_PATTERN.test(password) &&
    LOWERCASE_PATTERN.test(password) &&
    DIGIT_PATTERN.test(password) &&
    SPECIAL_CHARACTER_PATTERN.test(password);
}

export function getPasswordValidationMessage(password: string): string | null {
  return isPasswordValid(password) ? null : PASSWORD_POLICY.validationMessage;
}
