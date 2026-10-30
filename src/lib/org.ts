// Everything that names the organisation running this site or points at one
// of its accounts, in one place, so rebranding is an edit here rather than a
// search through the screens. The Edge Functions can't import this file and
// read their own counterparts from secrets (EMAIL_FROM_ADDRESS,
// EMAIL_ARCHIVE_CC, EMAIL_FOOTER_IMAGE_URL); see AGENTS.md.
//
// A link that is still null hasn't been provided yet. The screens that use one
// leave it out (or show the document's title as plain text) until it is
// filled in, rather than pointing anywhere else in the meantime.

/** The site's name: the browser tab title, after the page's own title. */
export const APP_NAME = 'VR/AR Committee Portal'

/** The organisation that owns the hardware, as it reads in running text. */
export const ORG_NAME = 'VR/AR Committee'

/** "Get help & support": the committee's Discord invite, or wherever members
    should ask for help. */
export const HELP_AND_SUPPORT_URL: string | null = null

/** "View documentation" on the member home page: general documentation for
    the site, not an item's own link (that's `equipment.documentation_url`). */
export const DOCUMENTATION_URL: string | null = null

export interface OrgDocument {
  title: string
  url: string | null
}

/** Agreed to at profile setup. The agreement isn't stored (see AGENTS.md). */
export const PRIVACY_POLICY: OrgDocument = {
  title: 'Privacy Policy',
  url: null,
}

/** Linked from profile setup and the checkout return-date step. */
export const USAGE_POLICY: OrgDocument = {
  title: 'Hardware Checkout & Usage Policy',
  url: null,
}

/**
 * The organisation's own inbox: admin-facing emails are sent to it, and every
 * other email is CC'd to it as an archive copy. This must match the
 * EMAIL_ARCHIVE_CC secret on the Edge Functions. The browser can't read that
 * secret, so the email template editor shows this value instead.
 */
export const EMAIL_ARCHIVE_ADDRESS: string | null = null
