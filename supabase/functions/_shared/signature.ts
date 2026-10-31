// The brand footer appended to every outgoing email. This is the exact
// graphic from Figma (a single flattened image — logo + wordmark, not
// separately-styled text), not a hand-built recreation: source SVG was
// Group 218.svg, rasterized to PNG since SVG doesn't render reliably in
// email clients (notably Outlook, which frequently shows nothing at all
// for an <img src="*.svg">).
//
// This exists only at send time: it's never part of a template's stored
// `body` (so it never appears in the admin editor) and gets appended
// fresh to whatever renderSegmentsHtml produces.
//
// The image's URL comes from the EMAIL_FOOTER_IMAGE_URL secret, typically a
// file in a public Storage bucket of this project. There's no default: this
// code came from another organisation's project, whose footer lives in its
// own Storage. Unset means emails go out with no footer.

// Displayed at half the source SVG's own authored size (661x121 -> 330x60,
// aspect ratio preserved). The uploaded PNG is rasterized at 2x the
// original (1322x242), so at this display size it's rendering at 4x —
// still sharp on retina screens with plenty of room to spare.
const FOOTER_WIDTH = 330;
const FOOTER_HEIGHT = 60;

export function buildSignatureHtml(): string {
  const src = Deno.env.get("EMAIL_FOOTER_IMAGE_URL")?.trim();
  if (!src) return "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;"><tr><td><img src="${src}" width="${FOOTER_WIDTH}" height="${FOOTER_HEIGHT}" alt="" style="display: block; width: ${FOOTER_WIDTH}px; height: ${FOOTER_HEIGHT}px; border: 0;" /></td></tr></table>`;
}
