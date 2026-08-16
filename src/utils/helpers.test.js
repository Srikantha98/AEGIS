import { describe, expect, it } from 'vitest';
import { getIPv4Error } from './helpers';

describe('getIPv4Error', () => {
  it('accepts valid IPv4 addresses', () => {
    expect(getIPv4Error('192.168.1.10')).toBe('');
    expect(getIPv4Error('0.0.0.0')).toBe('');
    expect(getIPv4Error('255.255.255.255')).toBe('');
  });

  it('rejects invalid, incomplete, and non-numeric IPv4 addresses', () => {
    expect(getIPv4Error('192.168.1')).toBe('Enter a complete IPv4 address.');
    expect(getIPv4Error('192.168.1.256')).toBe('Each IPv4 address section must be between 0 and 255.');
    expect(getIPv4Error('192.abc.1.10')).toBe('Use only numbers and periods in an IPv4 address.');
    expect(getIPv4Error('192..1.10')).toBe('Each IPv4 address section must contain a number.');
  });
});
