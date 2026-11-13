import { APP_NAME, ORG_NAME } from '../lib/org'
import styles from './PrivacyPolicyPage.module.css'

// Public: no sign-in needed, so it can be linked from Google's OAuth consent
// screen and read before a member has an account. The text is adapted from
// Synaptech's published HMS privacy policy; see AGENTS.md.
export default function PrivacyPolicyPage() {
  return (
    <main className="app-shell">
      <article className={styles.policy}>
        <h1>{APP_NAME}: App Privacy Policy</h1>

        <h2>Who we are and what this covers</h2>
        <p>
          The {ORG_NAME} (&ldquo;we&rdquo;) is a University of Washington student committee. We run the {APP_NAME}
          (&ldquo;the Portal&rdquo;) so members can borrow VR/AR hardware and reserve the committee&rsquo;s room.
          A member is someone with a UW account who has completed profile setup on the Portal.
        </p>
        <p>
          This policy explains what the Portal collects, why, who can see it, and how long we keep it. It covers the
          Portal website, the emails it sends, and the agreements signed through it. It does not cover Google, UW, or
          other services you reach through links.
        </p>
        <p>
          The committee is not a UW department. The Portal is run by the committee&rsquo;s officers, and UW does not
          operate it.
        </p>
        <p>Effective date: November 12, 2026</p>

        <h2>Information we collect</h2>
        <p>
          We collect only what we need to lend hardware and get it back. We do not use advertising, analytics or
          tracking tools.
        </p>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr><th>Category</th><th>What we collect</th><th>Where it comes from</th></tr>
            </thead>
            <tbody>
              <tr><td>Account</td><td>Your UW email address and Google account ID</td><td>Google sign-in (only @uw.edu accounts are accepted)</td></tr>
              <tr><td>Profile</td><td>First and last name, phone number, UW student ID, home address</td><td>You, on the profile setup form</td></tr>
              <tr><td>Loans</td><td>Items requested and borrowed, serial or tag numbers, request and return dates, hand-off and return times, cancellation reasons</td><td>You and the officers who process your loan</td></tr>
              <tr><td>Loan agreements</td><td>Your typed signature (full legal name) and signature date, the signed agreement PDF</td><td>You, when you sign</td></tr>
              <tr><td>Availability</td><td>Times you said you are free to pick up or return hardware</td><td>You</td></tr>
              <tr><td>Emails</td><td>Copies of the emails we send you, with their delivery status</td><td>Our email system</td></tr>
              <tr><td>Activity record</td><td>Who changed what and when (for example, a loan approved or a profile edited)</td><td>Recorded automatically</td></tr>
              <tr><td>Browser storage</td><td>Your sign-in session, and whether you&rsquo;ve seen the welcome notice</td><td>Stored in your own browser</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          <strong>Camera.</strong> Officers&rsquo; devices use the camera to scan hardware barcodes. The video is read
          on the device and is never recorded or uploaded.
        </p>
        <p>
          <strong>Technical data.</strong> Our hosting providers keep standard server logs, such as IP address, browser
          type and request times, for security and reliability.
        </p>

        <h2>How we use information</h2>
        <p>We use your information only to run the hardware lending program. We never sell it or use it for marketing.</p>
        <ul>
          <li><strong>Confirm eligibility:</strong> check that you have a UW account.</li>
          <li><strong>Process loans:</strong> review requests, schedule pick-ups and returns, and record which unit you have.</li>
          <li><strong>Hold a valid agreement:</strong> keep a signed record of the terms you agreed to for each loan.</li>
          <li><strong>Send emails:</strong> confirmations, reminders before a return date, and overdue notices.</li>
          <li><strong>Recover hardware:</strong> contact you by phone or email, and, as a last resort, by mail, if equipment is overdue, lost or damaged.</li>
          <li><strong>Keep inventory accurate:</strong> run periodic inventory audits against loan records.</li>
          <li><strong>Accountability and security:</strong> keep a record of officer actions so mistakes or misuse can be traced.</li>
        </ul>

        <h2>Who can see it and who we share it with</h2>
        <p>
          Only you and the committee&rsquo;s hardware officers (admins) can see your profile and loans. Other members
          cannot see your information.
        </p>
        <p>
          We use these service providers to run the Portal. Each handles data only to provide its service to us:
        </p>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr><th>Provider</th><th>What it does</th><th>Data it handles</th></tr>
            </thead>
            <tbody>
              <tr><td>Supabase</td><td>Database, sign-in and file storage. Data stored in the USA.</td><td>Everything listed above</td></tr>
              <tr><td>Google</td><td>Sign-in with your UW account</td><td>Your UW email and Google account ID</td></tr>
              <tr><td>Resend</td><td>Delivers our emails</td><td>Your name, email address and the email&rsquo;s content</td></tr>
              <tr><td>Cloudflare</td><td>Hosts the website</td><td>Technical data such as IP address</td></tr>
              <tr><td>Google Fonts</td><td>Serves the website&rsquo;s fonts</td><td>Your IP address and browser type</td></tr>
            </tbody>
          </table>
        </div>
        <p>A copy of select emails the Portal sends goes to the committee&rsquo;s own archive inbox.</p>
        <p>
          We will disclose information only if required by law, or to UW if needed to recover lost or damaged equipment
          under the loan agreement.
        </p>

        <h2>How long we keep it</h2>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr><th>Information</th><th>How long we keep it</th></tr>
            </thead>
            <tbody>
              <tr><td>Activity record</td><td>12 months, then deleted automatically</td></tr>
              <tr><td>Profile</td><td>While you are a member, plus 1 year after your last loan closes</td></tr>
              <tr><td>Loans and signed agreements</td><td>3 years after the loan closes</td></tr>
              <tr><td>Availability times</td><td>Until the loan closes</td></tr>
              <tr><td>Email copies and delivery log</td><td>1 year</td></tr>
              <tr><td>Inventory audit reports</td><td>3 years; these name the units found, not members</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          When your profile is deleted, your loan requests and their records are deleted with it. The activity record
          keeps your name on past actions until it expires after 12 months.
        </p>

        <h2>How we protect it</h2>
        <p>Access is limited by account, and every database table enforces who may read or change each row.</p>
        <ul>
          <li>Only @uw.edu Google accounts can sign in.</li>
          <li>Members can see only their own profile, loans and agreements; only officers with admin access can see members&rsquo; details.</li>
          <li>Signed agreements are stored in a private file store, never on a public link.</li>
          <li>The activity record cannot be edited or deleted by anyone through the app, including officers.</li>
          <li>Your phone number, student ID and address are left out of the activity record, so changes to them are noted without copying the values.</li>
          <li>All traffic is encrypted in transit (HTTPS).</li>
        </ul>
        <p>
          No system is perfectly secure. If we learn of a breach that affects your information, we will tell you by
          email without unreasonable delay, and no later than 30 days after we confirm a breach.
        </p>

        <h2>Your choices and rights</h2>
        <p>You can see, correct or delete your information by contacting us; we will respond within 30 days.</p>
        <ul>
          <li><strong>See it:</strong> ask for a copy of your profile, loan history and signed agreements.</li>
          <li><strong>Correct it:</strong> ask us to fix anything that is wrong.</li>
          <li><strong>Delete it:</strong> ask us to delete your profile. We may first need you to return any hardware you still have, and we may keep records the law requires.</li>
          <li><strong>Emails:</strong> loan emails are part of the service and can&rsquo;t be turned off while you have an active loan.</li>
        </ul>
        <p>
          Giving us your phone number, student ID and address is required to borrow hardware, because we need them to
          recover equipment. You can stop using the Portal at any time.
        </p>
        <p>
          The Portal&rsquo;s records are kept by the committee, a student committee, not by the University of
          Washington.
        </p>

        <h2>Changes and contact</h2>
        <p>
          If we change this policy, we will update the effective date and email current and former affected members
          about any significant change before it takes effect.
        </p>
        <p>Questions or requests about your information go to arvrcommittee@gmail.com.</p>
      </article>
    </main>
  )
}
