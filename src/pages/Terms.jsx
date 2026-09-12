import React from "react";
import LegalLayout from "@/components/layout/LegalLayout";

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" updated="12 September 2026">
      <p>
        These Terms of Service ("Terms") govern your use of TrainPaceLab ("we", "us", or "the Service"), an
        adaptive athletic training-intelligence platform operated by TrainPaceLab. By creating an account or using
        the Service, you agree to these Terms.
      </p>
      <h2>1. Your account</h2>
      <p>
        You must provide accurate registration information and keep your credentials secure. You are responsible
        for all activity under your account. You must be at least 16 years old, or the age of digital consent in
        your jurisdiction, to use the Service.
      </p>
      <h2>2. Subscriptions and billing</h2>
      <ul>
        <li>Free tier: limited wearable sync lookback, manual imports, and a weekly AI-coach message cap.</li>
        <li>Pro (A$19/month) and Team (A$49/month): billed monthly via Stripe until cancelled.</li>
        <li>Plans renew automatically. You can cancel at any time; cancellation stops future renewals but does not
        refund the current paid period except where required by law.</li>
        <li>We may change pricing with reasonable notice; existing subscribers keep the current rate until renewal.</li>
      </ul>
      <h2>3. Acceptable use</h2>
      <p>
        You agree not to misuse the Service, including: submitting data that is not your own without consent,
        attempting to reverse-engineer the physiology models, scraping the Service, or using the Service to provide
        medical advice. Coaches using the Team plan are responsible for the privacy of any athlete data they import.
      </p>
      <h2>4. Intellectual property</h2>
      <p>
        TrainPaceLab retains all rights to the Service, including its training-load models, adaptive-planning
        engine, and interface. You retain ownership of the workout, recovery, and profile data you submit.
      </p>
      <h2>5. No medical advice</h2>
      <p>
        The Service provides training analytics and AI-generated coaching suggestions for informational purposes
        only. It is not a substitute for professional medical or coaching advice. Do not rely on it for injury
        diagnosis or health decisions.
      </p>
      <h2>6. Disclaimers and liability</h2>
      <p>
        The Service is provided "as is" without warranties of any kind. To the maximum extent permitted by law,
        TrainPaceLab is not liable for indirect or consequential damages, or for any injury or loss arising from
        following a generated training plan.
      </p>
      <h2>7. Termination</h2>
      <p>
        You may delete your account at any time. We may suspend or terminate access for breaches of these Terms.
        Upon termination, your right to use the Service ends; data retention is governed by our Privacy Policy.
      </p>
      <h2>8. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be notified in-app or by email.
        Continued use after changes takes effect constitutes acceptance.
      </p>
      <h2>9. Contact</h2>
      <p>For questions about these Terms, contact support through the in-app feedback tool.</p>
    </LegalLayout>
  );
}