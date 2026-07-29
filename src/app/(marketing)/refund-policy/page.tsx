import { PLANS } from "@/lib/plans";
import {
  LEGAL_OPERATOR_STATEMENT,
  POLICY_EFFECTIVE_DATE,
  POLICY_LAST_UPDATED,
  POLICY_PATHS,
  POLICY_VERSIONS,
  PUBLIC_MAILBOXES,
} from "@/lib/legal-policies";
import { LegalA, LegalDoc, LegalH2, LegalUl } from "@/components/legal/legal-doc";

export const metadata = {
  title: "Billing, Renewal, Cancellation & Refund Policy",
  description:
    "SendFable subscription billing, automatic renewal, cancellation via Stripe Customer Portal, plan limits, and refund rules.",
};

function money(n: number) {
  return n === 0 ? "$0" : `$${n}`;
}

export default function RefundPolicyPage() {
  const free = PLANS.FREE;
  const starter = PLANS.STARTER;
  const growth = PLANS.GROWTH;
  const pro = PLANS.PRO;
  const proPlus = PLANS.PRO_PLUS;

  return (
    <LegalDoc title="Billing, Renewal, Cancellation & Refund Policy">
      <p>
        <strong>Effective date:</strong> {POLICY_EFFECTIVE_DATE}
        <br />
        <strong>Last updated:</strong> {POLICY_LAST_UPDATED}
        <br />
        <strong>Document version:</strong> {POLICY_VERSIONS.refund}
      </p>
      <p>
        This policy is part of the SendFable <LegalA href={POLICY_PATHS.terms}>Terms of Service</LegalA>.{" "}
        {LEGAL_OPERATOR_STATEMENT}. Payments are processed by Stripe; SendFable never stores your
        full card number.
      </p>
      <p>
        Plan prices and limits below describe the current product catalog. Public Checkout may be
        temporarily unavailable during maintenance; live plan entitlements still apply once billed.
      </p>

      <LegalH2>1. Plans and limits (verified from product configuration)</LegalH2>
      <LegalUl>
        <li>
          <strong>Free:</strong> {money(free.monthlyPrice)}; up to {free.contactCap.toLocaleString()}{" "}
          contacts; up to {free.emailsPerMonth.toLocaleString()} emails/month.
        </li>
        <li>
          <strong>Starter:</strong> {money(starter.monthlyPrice)}/month or{" "}
          {money(starter.yearlyPrice)}/year; up to {starter.contactCap.toLocaleString()} contacts;
          up to {starter.emailsPerMonth.toLocaleString()} emails/month.
        </li>
        <li>
          <strong>Growth:</strong> {money(growth.monthlyPrice)}/month or{" "}
          {money(growth.yearlyPrice)}/year; up to {growth.contactCap.toLocaleString()} contacts; up
          to {growth.emailsPerMonth.toLocaleString()} emails/month; custom domain authentication
          available.
        </li>
        <li>
          <strong>Pro:</strong> {money(pro.monthlyPrice)}/month or {money(pro.yearlyPrice)}/year; up
          to {pro.contactCap.toLocaleString()} contacts; up to {pro.emailsPerMonth.toLocaleString()}{" "}
          emails/month; custom domain authentication available.
        </li>
        <li>
          <strong>Pro Plus:</strong> {money(proPlus.monthlyPrice)}/month or{" "}
          {money(proPlus.yearlyPrice)}/year; up to {proPlus.contactCap.toLocaleString()} contacts;
          up to {proPlus.emailsPerMonth.toLocaleString()} emails/month; custom domain authentication
          available. Need more volume? Contact support for a custom plan.
        </li>
      </LegalUl>
      <p>
        Contact and monthly email allowances are maximum plan limits. One email sent to one contact
        counts as one email. Allowances reset each calendar month, and unused sends do not roll
        over. Limits are enforced in product (including contact caps, monthly email quotas, and
        daily sending ramps). Exceeding contact caps can make sending read-only until you prune or
        upgrade. Free has no charge and no paid renewal. Annual billing equals two months free.
      </p>

      <LegalH2>2. Subscriptions, automatic renewal, and taxes</LegalH2>
      <LegalUl>
        <li>Paid plans are billed in advance in USD, monthly or annually, through Stripe.</li>
        <li>
          Subscriptions <strong>renew automatically</strong> at the end of each billing period until
          you cancel.
        </li>
        <li>Applicable taxes may be collected by Stripe where configured.</li>
      </LegalUl>

      <LegalH2>3. Upgrades, proration, and downgrades</LegalH2>
      <LegalUl>
        <li>
          New paid subscriptions start via Stripe Checkout (when enabled). Existing subscribers
          manage changes in the Stripe Customer Portal.
        </li>
        <li>
          Portal subscription updates are configured with{" "}
          <strong>proration_behavior: create_prorations</strong> — upgrades/plan changes generally
          create prorations for the remainder of the period as Stripe calculates them.
        </li>
        <li>
          Downgrades and plan switches take effect according to the options shown in the Customer
          Portal. Lower-tier limits then apply. Downgrading does not delete your data, but features
          may become read-only if you exceed the lower tier&apos;s caps.
        </li>
      </LegalUl>

      <LegalH2>4. Cancellation (not the same as a refund)</LegalH2>
      <LegalUl>
        <li>
          Cancel from Billing → Manage subscription (Stripe Customer Portal). Cancellation is
          configured as <strong>cancel at period end</strong> (
          <code>subscription_cancel.mode = at_period_end</code>, proration on cancel: none).
        </li>
        <li>
          You keep paid features until the end of the period already paid for. Cancellation stops
          the next renewal; it is not itself a refund.
        </li>
        <li>
          We may suspend sending immediately for abuse, AUP violations, or payment risk where
          permitted.
        </li>
      </LegalUl>

      <LegalH2>5. Failed payments</LegalH2>
      <p>
        If a renewal fails, Stripe retries and typically emails you. Continued failure can mark the
        subscription past due and may cancel it, moving the Workspace toward Free-plan limits.
        Sending can pause while payment is failed beyond the product grace window.
      </p>

      <LegalH2>6. Refunds</LegalH2>
      <p>
        Cancellation and refund are different. Cancellation normally stops renewal at the end of the
        paid term; it is not a refund. Refunds are not automatic or guaranteed except for duplicate
        charges, erroneous charges, or where legally required. Where we issue a refund, it goes to
        the original payment method; card issuers often post refunds within about 5–10 business days.
        We do not substitute cash or account credit unless we expressly agree in writing.
      </p>
      <LegalUl>
        <li>
          <strong>First paid subscription charge:</strong> a customer may request a refund of their
          first paid subscription charge within 14 days. Refunds are generally approved when the
          account has not sent a live campaign or materially used the paid service.
        </li>
        <li>
          <strong>Renewals (including annual):</strong> renewal refund requests submitted within
          seven days may be considered when no campaigns were sent after renewal. Annual plans follow
          the same courtesy window for the renewal charge — we do not pro-rate unused months as a
          default entitlement.
        </li>
        <li>
          <strong>Duplicate or erroneous charges</strong> will be corrected (refunded in full when
          verified).
        </li>
        <li>
          <strong>Legally required refunds</strong> will be honored where a statute or chargeback
          rule requires them.
        </li>
        <li>
          <strong>Not eligible for discretionary refunds:</strong> accounts suspended or terminated
          for abuse (including serious{" "}
          <LegalA href={POLICY_PATHS.acceptableUse}>Acceptable Use</LegalA> violations such as
          purchased-list abuse) where permitted by law; ordinary partial periods after
          cancel-at-period-end; and periods already consumed with normal sending activity outside the
          windows above.
        </li>
      </LegalUl>
      <p>
        Request refunds at{" "}
        <LegalA href={`mailto:${PUBLIC_MAILBOXES.support}`}>{PUBLIC_MAILBOXES.support}</LegalA> or
        via the <LegalA href={POLICY_PATHS.contact}>contact form</LegalA> (topic: Billing or
        refunds). Include workspace name and approximate charge date — never send full card numbers.
      </p>

      <LegalH2>7. Data after cancellation</LegalH2>
      <p>
        Canceling a paid plan does not delete your Workspace. Export contacts before deletion if you
        need a copy. Workspace deletion is available to OWNER in settings. Suppression, billing,
        security, and legal records may be retained as described in the{" "}
        <LegalA href={POLICY_PATHS.privacy}>Privacy Policy</LegalA>.
      </p>

      <LegalH2>8. Questions</LegalH2>
      <p>
        Billing questions:{" "}
        <LegalA href={`mailto:${PUBLIC_MAILBOXES.support}`}>{PUBLIC_MAILBOXES.support}</LegalA>.
        Also see <LegalA href="/pricing">pricing</LegalA> and{" "}
        <LegalA href={POLICY_PATHS.terms}>Terms</LegalA>.
      </p>
    </LegalDoc>
  );
}
