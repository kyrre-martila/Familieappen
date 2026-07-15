import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, formatBirthDateForApi, formatBirthDateForDisplay, formatNorwegianPhoneForApi, getAvatarSource, isFutureBirthDate, normalizeNorwegianPhoneNational, normalizePhoneForApi, parseBirthDateFromApi, parseBirthDateFromDisplay, parsePhoneFromApi, shouldShowLocalAvatarError, shouldUseBackendProfileName } from "./profileValidation";

function equal<T>(actual: T, expected: T) { if (actual !== expected) throw new Error(`Expected ${String(expected)}, got ${String(actual)}`); }
function deepEqual(actual: unknown, expected: unknown) { equal(JSON.stringify(actual), JSON.stringify(expected)); }
const country = (iso: string) => PHONE_COUNTRIES.find((c) => c.iso === iso)!;

const jan5 = { year: 1985, month: 1, day: 5 };
equal(formatBirthDateForDisplay(jan5), "05.01.1985");
equal(formatBirthDateForApi(jan5), "1985-01-05");
deepEqual(parseBirthDateFromApi("1985-01-05"), jan5);
deepEqual(parseBirthDateFromDisplay("05.01.1985"), jan5);
equal(formatBirthDateForApi({ year: 2024, month: 2, day: 29 }), "2024-02-29");
equal(parseBirthDateFromApi("2023-02-29"), null);
equal(isFutureBirthDate({ year: 2999, month: 1, day: 1 }, new Date(2026, 6, 15)), true);
equal(formatBirthDateForApi(parseBirthDateFromApi("1985-08-03")), "1985-08-03");
equal(formatBirthDateForDisplay(parseBirthDateFromApi("1985-08-03")), "03.08.1985");

deepEqual(normalizeNorwegianPhoneNational("99 99 99 99"), { value: "99999999", error: null });
equal(normalizeNorwegianPhoneNational("123").error, "Norske telefonnummer må ha nøyaktig 8 sifre.");
equal(normalizeNorwegianPhoneNational("12345678901234").error, "Norske telefonnummer må ha nøyaktig 8 sifre.");
equal(normalizeNorwegianPhoneNational("abcd1234").error, "Telefonnummer kan bare inneholde tall og mellomrom.");
equal(formatNorwegianPhoneForApi("99 99 99 99"), "+4799999999");
equal(normalizePhoneForApi(country("SE"), "70 123 45 67").value, "+46701234567");
equal(normalizePhoneForApi(country("FI"), "40 123 4567").value, "+358401234567");
equal(normalizePhoneForApi(country("DK"), "12 34 56 78").value, "+4512345678");
equal(normalizePhoneForApi(country("SE"), "70A").error, "Telefonnummer kan bare inneholde tall og mellomrom.");
deepEqual(parsePhoneFromApi("+47 99 99 99 99"), { country: DEFAULT_PHONE_COUNTRY, nationalNumber: "99999999" });
equal(parsePhoneFromApi("+46701234567").country.iso, "SE");
equal(parsePhoneFromApi("+358401234567").country.iso, "FI");
equal(parsePhoneFromApi("+4512345678").country.iso, "DK");
equal(parsePhoneFromApi("+99912345").unmatchedValue, "+99912345");
equal(parsePhoneFromApi("+99912345").nationalNumber, "+99912345");

equal(shouldUseBackendProfileName("Kari", "kyma@svk.no"), true);
equal(shouldUseBackendProfileName("kyma", "kyma@svk.no"), false);
equal(shouldUseBackendProfileName("", "kyma@svk.no"), false);

deepEqual(getAvatarSource("file://local", "https://server"), { uri: "file://local", kind: "local" });
deepEqual(getAvatarSource(null, "https://server"), { uri: "https://server", kind: "server" });
equal(shouldShowLocalAvatarError(getAvatarSource("file://old", "https://server"), "file://old"), true);
equal(shouldShowLocalAvatarError(getAvatarSource(null, "https://server"), "file://old"), false);
equal(shouldShowLocalAvatarError(getAvatarSource("file://new", "https://server"), "file://old"), false);
