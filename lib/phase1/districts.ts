/**
 * Singapore's 28 postal districts, by the names people actually use for them.
 *
 * Client-safe. A tenant reads "D15" as nothing and "Katong · Marine Parade" as
 * a place, so every public screen goes through here.
 */

export const DISTRICTS: Record<number, { name: string; areas: string }> = {
  1: { name: 'Marina Bay', areas: 'Raffles Place, Marina, People’s Park' },
  2: { name: 'Tanjong Pagar', areas: 'Anson, Chinatown' },
  3: { name: 'Tiong Bahru', areas: 'Queenstown, Alexandra' },
  4: { name: 'HarbourFront', areas: 'Telok Blangah, Sentosa' },
  5: { name: 'Pasir Panjang', areas: 'Buona Vista, Clementi, West Coast' },
  6: { name: 'City Hall', areas: 'High Street, Beach Road' },
  7: { name: 'Bugis', areas: 'Beach Road, Golden Mile' },
  8: { name: 'Little India', areas: 'Farrer Park, Jalan Besar' },
  9: { name: 'Orchard', areas: 'River Valley, Cairnhill' },
  10: { name: 'Tanglin', areas: 'Holland, Bukit Timah, Ardmore' },
  11: { name: 'Newton', areas: 'Novena, Thomson' },
  12: { name: 'Balestier', areas: 'Toa Payoh, Serangoon Road' },
  13: { name: 'Macpherson', areas: 'Braddell, Potong Pasir' },
  14: { name: 'Geylang', areas: 'Eunos, Paya Lebar' },
  15: { name: 'Katong', areas: 'Marine Parade, Joo Chiat, East Coast' },
  16: { name: 'Bedok', areas: 'Upper East Coast, Siglap' },
  17: { name: 'Changi', areas: 'Loyang, Flora' },
  18: { name: 'Tampines', areas: 'Pasir Ris, Simei' },
  19: { name: 'Sengkang', areas: 'Serangoon Garden, Hougang, Punggol' },
  20: { name: 'Bishan', areas: 'Ang Mo Kio, Thomson' },
  21: { name: 'Upper Bukit Timah', areas: 'Clementi Park, Ulu Pandan' },
  22: { name: 'Jurong', areas: 'Boon Lay, Tuas' },
  23: { name: 'Bukit Panjang', areas: 'Choa Chu Kang, Hillview' },
  24: { name: 'Lim Chu Kang', areas: 'Tengah, Kranji' },
  25: { name: 'Woodlands', areas: 'Kranji, Admiralty' },
  26: { name: 'Upper Thomson', areas: 'Springleaf, Mandai' },
  27: { name: 'Yishun', areas: 'Sembawang, Seletar Hills' },
  28: { name: 'Seletar', areas: 'Yio Chu Kang, Lentor' },
};

export const districtCode = (d: number) => `D${String(d).padStart(2, '0')}`;
export const districtLabel = (d: number) => DISTRICTS[d]?.name ?? `District ${d}`;
