import React from "react";
import LegalLayout from "@/components/layout/LegalLayout";

export default function Refund() {
  return (
    <LegalLayout title="Refund Policy" updated="12 September 2026">
      <h2>Monthly subscriptions</h2>
      <p>
        TrainPaceLab Pro and Team are billed monthly in advance via Stripe. You may cancel at any time from the
        billing area or your Stripe customer portal. Cancellation stops future renewals; the current billing
        period remains active until its end date and is non-refundable except where required by law.
      </p>
      <h2>Accidental or duplicate charges</h2>
      <p>
        If you are charged in error or billed twice for the same period, contact support through the in-app
        feedback tool within 30 days and we will refund the erroneous charge.
      </p>
      <h2>Statutory rights</h2>
      <p>
        Nothing in this policy limits any statutory consumer rights you may have in your country of residence,
        including rights to a refund for non-delivery or faulty service.
      </p>
      <h2>Free tier</h2>
      <p>The Free tier costs nothing and carries no refund entitlement.</p>
      <h2>Requesting a refund</h2>
      <p>
        To request a refund, contact support through the in-app feedback tool with your account email and the
        charge date. Approved refunds are issued to the original payment method within 5–10 business days.
      </p>
    </LegalLayout>
  );
}