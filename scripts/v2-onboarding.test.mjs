import test from "node:test";
import assert from "node:assert/strict";
import {ONBOARDING_STORAGE_KEY,ONBOARDING_STEPS,readOnboardingState} from "../lib/trading/v2/onboarding.ts";
test("first-run guide is shown only when there is no recorded choice",()=>{
  assert.equal(readOnboardingState(null),"pending");
  assert.equal(readOnboardingState(""),"pending");
  assert.equal(readOnboardingState("malformed-json"),"pending");
  assert.equal(readOnboardingState("completed"),"completed");
  assert.equal(readOnboardingState("dismissed"),"dismissed");
});
test("versioned local key and bounded tour steps stay explicit",()=>{
  assert.match(ONBOARDING_STORAGE_KEY,/^hiddenalpha:v2:tour:v\d+$/);
  assert.equal(ONBOARDING_STEPS,3);
});
