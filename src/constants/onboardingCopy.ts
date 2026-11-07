/**
 * Copy constants for Data Connection and Onboarding flows.
 */

export const ONBOARDING_COPY = {
  dataConnectionModal: {
    title: "Connect Your Telemetry",
    description: "Stop logging. Start training. Connect your accounts to enable automated physiology insights.",
    primaryCTA: "Connect Device (Garmin/Strava)",
    secondaryCTA: "Load Demo Activity (.FIT)",
    trustMessage: "Your telemetry is used solely to generate your physiological models. Never sold, never monetized.",
  },
  firstRunEmail: {
    subject: "Your first training insights are ready",
    body: `
Hi there,

Welcome to the lab.

We've finished processing your initial telemetry. No manual calculations required—your physiological models are now live.

Head over to your dashboard to view your current zone distribution and fitness-fatigue trend line. This is your new baseline.

Stop logging. Start training.

[View Your Insights]
    `.trim(),
  },
};
