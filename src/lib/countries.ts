const ISO_CODES =
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ " +
  "CA CD CF CG CH CI CK CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR " +
  "GA GB GD GE GH GI GM GN GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG " +
  "KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR " +
  "MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PR PS PT PW PY QA RO RS RU " +
  "RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ " +
  "UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW";

export type CountryOption = { code: string; name: string };

/** Build on the server and pass down so client and server render the same names. */
export function countryOptions(): CountryOption[] {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  return ISO_CODES.split(" ")
    .map((code) => ({ code, name: names.of(code) || code }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}

export function countryNameFor(code: string | null | undefined) {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) || null;
  } catch {
    return null;
  }
}
