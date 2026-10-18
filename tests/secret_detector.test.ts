import { describe, it, expect } from 'vitest';
import { detectSecret, calculateShannonEntropy, maskSecret } from '../src/matrix/secret_detector.js';

describe('secret detector', () => {
  it('detects AWS access keys', () => {
    // Synthetic mock key assembled dynamically to avoid GitHub static scanning false-positives
    const mockAwsKey = ['AKIA', 'IOSFODNN7EXAMPLE'].join('');
    const res = detectSecret('AWS_KEY', mockAwsKey);
    expect(res).toBeDefined();
    expect(res?.ruleName).toBe('AWS Access Key');
    expect(res?.severity).toBe('critical');
  });

  it('detects Stripe secret keys', () => {
    // Synthetic mock key assembled dynamically
    const mockStripeKey = ['sk', 'live', '51Abcdefghijklmnopqrstuvw'].join('_');
    const res = detectSecret('STRIPE_KEY', mockStripeKey);
    expect(res).toBeDefined();
    expect(res?.ruleName).toBe('Stripe Secret Key');
  });

  it('detects OpenAI project keys', () => {
    // Synthetic mock key assembled dynamically
    const mockOpenAiKey = ['sk', 'proj', '1234567890abcdef1234567890abcdef12'].join('-');
    const res = detectSecret('OPENAI_KEY', mockOpenAiKey);
    expect(res).toBeDefined();
    expect(res?.ruleName).toBe('OpenAI API Key');
  });

  it('detects GitHub PATs', () => {
    // Synthetic mock token assembled dynamically
    const mockGhToken = ['ghp', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'].join('_');
    const res = detectSecret('GITHUB_TOKEN', mockGhToken);
    expect(res).toBeDefined();
    expect(res?.ruleName).toBe('GitHub Personal Access Token');
  });

  it('detects Private Key block', () => {
    // Synthetic mock RSA header block
    const res = detectSecret('KEY', '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0mock\n-----END RSA PRIVATE KEY-----');
    expect(res).toBeDefined();
    expect(res?.ruleName).toBe('Private Key Block');
  });

  it('detects Database URI with embedded password', () => {
    // Synthetic mock connection string
    const res = detectSecret('DB_URL', 'postgres://app_user:supersecretpass123@db.internal:5432/main');
    expect(res).toBeDefined();
    expect(res?.ruleName).toBe('Database URI Password');
  });

  it('ignores placeholder values in templates', () => {
    expect(detectSecret('API_KEY', 'your_api_key_here')).toBeUndefined();
    expect(detectSecret('SECRET_TOKEN', '<your-secret-token>')).toBeUndefined();
    expect(detectSecret('PASSWORD', 'changeme')).toBeUndefined();
  });

  it('calculates Shannon entropy and masks secrets', () => {
    const entropy = calculateShannonEntropy('abc');
    expect(entropy).toBeGreaterThan(1);
    expect(maskSecret('mock-secret-string-123456789')).toBe('mock****6789');
  });
});
