/** Versioned, device-local guide preference. No credentials or trading data. */
export const ONBOARDING_STORAGE_KEY="hiddenalpha:v2:tour:v1";
export type OnboardingState="pending"|"completed"|"dismissed";
/** Invalid or old values default to a first-run guide, without executing code. */
export function readOnboardingState(raw:string|null):OnboardingState{
  if(raw==="completed"||raw==="dismissed")return raw;
  return "pending";
}
export const ONBOARDING_STEPS=3 as const;
