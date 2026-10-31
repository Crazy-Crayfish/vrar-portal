import type { MemberActionItem } from '../components/user-dashboard/types'
import { DOCUMENTATION_URL, HELP_AND_SUPPORT_URL } from '../lib/org'

const allMemberActions: (Omit<MemberActionItem, 'href'> & { href?: string | null })[] = [
  { id: 'browse-inventory', label: 'Browse our inventory', icon: 'browse' },
  { id: 'my-hardware-loans', label: 'My hardware loans', mobileLabel: 'My loan history', icon: 'loans' },
  { id: 'view-documentation', label: 'View documentation', icon: 'documentation', href: DOCUMENTATION_URL },
  { id: 'get-help-support', label: 'Get help & support', icon: 'support', href: HELP_AND_SUPPORT_URL },
]

// An external link that hasn't been provided yet (null in lib/org.ts) is left
// off the list rather than shown as a row that goes nowhere.
export const memberActions: MemberActionItem[] = allMemberActions
  .filter((action) => action.href !== null)
  .map(({ href, ...action }) => (href ? { ...action, href } : action))
