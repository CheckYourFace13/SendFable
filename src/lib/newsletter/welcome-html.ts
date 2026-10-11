/**
 * TheDrinkPlace automatic welcome body.
 * Visitor benefits only — no Chicago-default links, no internal QA coverage language.
 */
export function theDrinkPlaceWelcomeHtml(): string {
  return (
    `<!DOCTYPE html><html><body style="font-family:Georgia,serif;color:#081C15;line-height:1.6;padding:24px;">` +
    `<p>Welcome to TheDrinkPlace.</p>` +
    `<p>Discover your next great drink—close to home or somewhere new. Explore drinks, bars, happy hours, and guides, and choose a destination to make your visit local.</p>` +
    `<p>Good places to start:</p>` +
    `<ul>` +
    `<li><a href="https://thedrinkplace.com/discover">Explore drinks</a></li>` +
    `<li><a href="https://thedrinkplace.com/destinations">Choose a destination</a></li>` +
    `<li><a href="https://thedrinkplace.com/happy-hour">Find happy hours</a></li>` +
    `<li><a href="https://thedrinkplace.com/guides">Browse guides</a></li>` +
    `</ul>` +
    `<p>When you’re ready, search near you or pick a city. Place pages show a source and date when we have them.</p>` +
    `<p>— TheDrinkPlace</p>` +
    `</body></html>`
  );
}
