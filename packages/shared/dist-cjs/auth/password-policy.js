"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PASSWORD_POLICY = void 0;
exports.isPasswordValid = isPasswordValid;
exports.getPasswordValidationMessage = getPasswordValidationMessage;
exports.PASSWORD_POLICY = {
    minLength: 8,
    maxLength: 1024,
    requireUppercase: true,
    requireLowercase: true,
    requireDigit: true,
    requireSpecialCharacter: true,
    helperText: "Minst 8 tegn, med store og små bokstaver, tall og spesialtegn.",
    validationMessage: "Passordet må være minst 8 tegn og inneholde store og små bokstaver, tall og spesialtegn."
};
const UPPERCASE_PATTERN = /\p{Lu}/u;
const LOWERCASE_PATTERN = /\p{Ll}/u;
const DIGIT_PATTERN = /\p{Nd}/u;
const SPECIAL_CHARACTER_PATTERN = /[^\p{L}\p{N}]/u;
function isPasswordValid(password) {
    return password.length >= exports.PASSWORD_POLICY.minLength &&
        password.length <= exports.PASSWORD_POLICY.maxLength &&
        UPPERCASE_PATTERN.test(password) &&
        LOWERCASE_PATTERN.test(password) &&
        DIGIT_PATTERN.test(password) &&
        SPECIAL_CHARACTER_PATTERN.test(password);
}
function getPasswordValidationMessage(password) {
    return isPasswordValid(password) ? null : exports.PASSWORD_POLICY.validationMessage;
}
