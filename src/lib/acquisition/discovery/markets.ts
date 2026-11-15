/**
 * Rotating US SMB markets for continuous acquisition discovery.
 * Coordinates are approximate city centers; Overpass uses a ~12km radius.
 */

export type DiscoveryMarket = {
  city: string;
  state: string; // USPS 2-letter
  lat: number;
  lon: number;
  /** Overpass around radius in meters */
  radiusM?: number;
};

/** Priority markets — rotate daily; expand nationally over time. */
export const DISCOVERY_MARKETS: DiscoveryMarket[] = [
  { city: "Chicago", state: "IL", lat: 41.8781, lon: -87.6298 },
  { city: "Milwaukee", state: "WI", lat: 43.0389, lon: -87.9065 },
  { city: "Madison", state: "WI", lat: 43.0731, lon: -89.4012 },
  { city: "Indianapolis", state: "IN", lat: 39.7684, lon: -86.1581 },
  { city: "Detroit", state: "MI", lat: 42.3314, lon: -83.0458 },
  { city: "Grand Rapids", state: "MI", lat: 42.9634, lon: -85.6681 },
  { city: "Minneapolis", state: "MN", lat: 44.9778, lon: -93.265 },
  { city: "St. Louis", state: "MO", lat: 38.627, lon: -90.1994 },
  { city: "Columbus", state: "OH", lat: 39.9612, lon: -82.9988 },
  { city: "Cincinnati", state: "OH", lat: 39.1031, lon: -84.512 },
  { city: "Nashville", state: "TN", lat: 36.1627, lon: -86.7816 },
  { city: "Louisville", state: "KY", lat: 38.2527, lon: -85.7585 },
  { city: "Kansas City", state: "MO", lat: 39.0997, lon: -94.5786 },
  { city: "Pittsburgh", state: "PA", lat: 40.4406, lon: -79.9959 },
  { city: "Cleveland", state: "OH", lat: 41.4993, lon: -81.6944 },
  { city: "Denver", state: "CO", lat: 39.7392, lon: -104.9903 },
  { city: "Austin", state: "TX", lat: 30.2672, lon: -97.7431 },
  { city: "Dallas", state: "TX", lat: 32.7767, lon: -96.797 },
  { city: "Phoenix", state: "AZ", lat: 33.4484, lon: -112.074 },
  { city: "Charlotte", state: "NC", lat: 35.2271, lon: -80.8431 },
  { city: "Raleigh", state: "NC", lat: 35.7796, lon: -78.6382 },
  { city: "Tampa", state: "FL", lat: 27.9506, lon: -82.4572 },
  { city: "Orlando", state: "FL", lat: 28.5383, lon: -81.3792 },
  { city: "Portland", state: "OR", lat: 45.5152, lon: -122.6784 },
  { city: "Seattle", state: "WA", lat: 47.6062, lon: -122.3321 },
  { city: "Atlanta", state: "GA", lat: 33.749, lon: -84.388 },
  { city: "Boston", state: "MA", lat: 42.3601, lon: -71.0589 },
  { city: "Philadelphia", state: "PA", lat: 39.9526, lon: -75.1652 },
  { city: "San Diego", state: "CA", lat: 32.7157, lon: -117.1611 },
  { city: "Sacramento", state: "CA", lat: 38.5816, lon: -121.4944 },
  // Expanded mid-size markets — rotate nationally without lowering quality gates
  { city: "Omaha", state: "NE", lat: 41.2565, lon: -95.9345 },
  { city: "Des Moines", state: "IA", lat: 41.5868, lon: -93.625 },
  { city: "Oklahoma City", state: "OK", lat: 35.4676, lon: -97.5164 },
  { city: "Tulsa", state: "OK", lat: 36.154, lon: -95.9928 },
  { city: "Richmond", state: "VA", lat: 37.5407, lon: -77.436 },
  { city: "Norfolk", state: "VA", lat: 36.8508, lon: -76.2859 },
  { city: "Buffalo", state: "NY", lat: 42.8864, lon: -78.8784 },
  { city: "Rochester", state: "NY", lat: 43.1566, lon: -77.6088 },
  { city: "Providence", state: "RI", lat: 41.824, lon: -71.4128 },
  { city: "Hartford", state: "CT", lat: 41.7658, lon: -72.6734 },
  { city: "Boise", state: "ID", lat: 43.615, lon: -116.2023 },
  { city: "Salt Lake City", state: "UT", lat: 40.7608, lon: -111.891 },
  { city: "Albuquerque", state: "NM", lat: 35.0844, lon: -106.6504 },
  { city: "Tucson", state: "AZ", lat: 32.2226, lon: -110.9747 },
  { city: "Fresno", state: "CA", lat: 36.7378, lon: -119.7871 },
  { city: "Spokane", state: "WA", lat: 47.6588, lon: -117.426 },
  { city: "Knoxville", state: "TN", lat: 35.9606, lon: -83.9207 },
  { city: "Birmingham", state: "AL", lat: 33.5186, lon: -86.8104 },
  { city: "New Orleans", state: "LA", lat: 29.9511, lon: -90.0715 },
  { city: "Jacksonville", state: "FL", lat: 30.3322, lon: -81.6557 },
];

/** Stable day index into markets (UTC date). */
export function marketForUtcDay(now = new Date(), offset = 0): DiscoveryMarket {
  const day =
    Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000) +
    offset;
  const idx = ((day % DISCOVERY_MARKETS.length) + DISCOVERY_MARKETS.length) % DISCOVERY_MARKETS.length;
  return DISCOVERY_MARKETS[idx]!;
}

/** Several markets for one discovery run (primary + neighbors). */
export function marketsForDiscoveryRun(
  now = new Date(),
  count = 3,
  offset = 0
): DiscoveryMarket[] {
  const out: DiscoveryMarket[] = [];
  // Hour + offset rotates geography within the same day so autofill batches don't
  // hammer the same city repeatedly.
  const hourBump = now.getUTCHours() + Math.floor(offset);
  for (let i = 0; i < count; i++) out.push(marketForUtcDay(now, hourBump + i));
  return out;
}
