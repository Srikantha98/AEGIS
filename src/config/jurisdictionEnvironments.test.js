import { describe, expect, it } from 'vitest';
import {
  getEnvironmentsForJurisdiction,
  jurisdictions,
} from './jurisdictionEnvironments';

describe('jurisdiction environment options', () => {
  it('matches each jurisdiction to its approved environments', () => {
    expect(jurisdictions).toEqual(['AZ', 'ME', 'KS', 'ND', 'PR']);
    expect(getEnvironmentsForJurisdiction('AZ')).toEqual(['QA3']);
    expect(getEnvironmentsForJurisdiction('ME')).toEqual(['QA2', 'QA3']);
    expect(getEnvironmentsForJurisdiction('KS')).toEqual(['QA3']);
    expect(getEnvironmentsForJurisdiction('ND')).toEqual(['QA2', 'DEV3']);
    expect(getEnvironmentsForJurisdiction('PR')).toEqual(['QA2', 'DEV3']);
  });

  it('does not expose an environment for an unrecognized jurisdiction', () => {
    expect(getEnvironmentsForJurisdiction('')).toEqual([]);
    expect(getEnvironmentsForJurisdiction('CA')).toEqual([]);
  });
});
