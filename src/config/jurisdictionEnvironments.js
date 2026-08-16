export const jurisdictionEnvironments = Object.freeze({
  AZ: Object.freeze(['QA3']),
  ME: Object.freeze(['QA2', 'QA3']),
  KS: Object.freeze(['QA3']),
  ND: Object.freeze(['QA2', 'DEV3']),
  PR: Object.freeze(['QA2', 'DEV3']),
});

export const jurisdictions = Object.freeze(Object.keys(jurisdictionEnvironments));

export const getEnvironmentsForJurisdiction = (jurisdiction) =>
  jurisdictionEnvironments[jurisdiction] ?? [];

export const normaliseJurisdiction = (jurisdiction) =>
  String(jurisdiction ?? '').trim().toUpperCase();
