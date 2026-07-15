import { formatBirthDateForApi, formatBirthDateForDisplay, formatNorwegianPhoneForApi, getAvatarPreviewUri, isFutureBirthDate, normalizeNorwegianPhoneNational, parseBirthDateFromApi, parseBirthDateFromDisplay, parsePhoneFromApi } from "./profileValidation";

function equal<T>(actual: T, expected: T) { if (actual !== expected) throw new Error(`Expected ${String(expected)}, got ${String(actual)}`); }
function deepEqual(actual: unknown, expected: unknown) { equal(JSON.stringify(actual), JSON.stringify(expected)); }

const jan5 = { year: 1985, month: 1, day: 5 };
equal(formatBirthDateForDisplay(jan5), "05.01.1985");
equal(formatBirthDateForApi(jan5), "1985-01-05");
deepEqual(parseBirthDateFromApi("1985-01-05"), jan5);
deepEqual(parseBirthDateFromDisplay("05.01.1985"), jan5);
equal(formatBirthDateForApi({ year: 2024, month: 2, day: 29 }), "2024-02-29");
equal(parseBirthDateFromApi("2023-02-29"), null);
equal(isFutureBirthDate({ year: 2999, month: 1, day: 1 }, new Date(2026, 6, 15)), true);
equal(formatBirthDateForApi(parseBirthDateFromApi("1985-01-05")), "1985-01-05");

deepEqual(normalizeNorwegianPhoneNational("99 99 99 99"), { value: "99999999", error: null });
equal(normalizeNorwegianPhoneNational("123").error, "Norske telefonnummer må ha nøyaktig 8 sifre.");
equal(normalizeNorwegianPhoneNational("12345678901234").error, "Norske telefonnummer må ha nøyaktig 8 sifre.");
equal(normalizeNorwegianPhoneNational("abcd1234").error, "Telefonnummer kan bare inneholde tall og mellomrom.");
equal(formatNorwegianPhoneForApi("99 99 99 99"), "+4799999999");
deepEqual(parsePhoneFromApi("+47 99 99 99 99"), { countryCode: "+47", nationalNumber: "99999999" });
equal(getAvatarPreviewUri("file://local", "https://server"), "file://local");
equal(getAvatarPreviewUri(null, "https://server"), "https://server");
