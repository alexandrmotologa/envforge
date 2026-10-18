import { SecretFinding } from '../types/index.js';

interface SecretRule {
  name: string;
  pattern: RegExp;
  severity: 'high' | 'critical' | 'warning';
  description: string;
}

const SECRET_RULES: SecretRule[] = [
  {
    name: 'AWS Access Key',
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
    severity: 'critical',
    description: 'AWS IAM access key ID found in configuration',
  },
  {
    name: 'Stripe Secret Key',
    pattern: /\bsk_(?:live|test)_[0-9a-zA-Z]{24,}\b/,
    severity: 'critical',
    description: 'Stripe API secret key',
  },
  {
    name: 'OpenAI API Key',
    pattern: /\bsk-(?:proj-)?[a-zA-Z0-9_\-]{32,}\b/,
    severity: 'critical',
    description: 'OpenAI API key',
  },
  {
    name: 'GitHub Personal Access Token',
    pattern: /\b(?:ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{50,})\b/,
    severity: 'critical',
    description: 'GitHub personal access token',
  },
  {
    name: 'Slack Token',
    pattern: /\bxox[baprs]-[0-9a-zA-Z-]{10,}\b/,
    severity: 'high',
    description: 'Slack bot or user OAuth token',
  },
  {
    name: 'Private Key Block',
    pattern: /-----BEGIN (?:(?:RSA|EC|DSA|OPENSSH)\s+)?(?:ENCRYPTED\s+)?PRIVATE KEY-----/,
    severity: 'critical',
    description: 'Raw cryptographic private key',
  },
  {
    name: 'JSON Web Token (JWT)',
    pattern: /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/,
    severity: 'high',
    description: 'Raw JWT token with payload signature',
  },
  {
    name: 'Database URI Password',
    pattern: /[a-z]+:\/\/[^:]+:([^@\s\/]{4,})@/,
    severity: 'high',
    description: 'Database connection URI contains embedded password',
  },
];

export function calculateShannonEntropy(str: string): number {
  if (!str || str.length === 0) return 0;

  const frequencies: Record<string, number> = {};
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    frequencies[char] = (frequencies[char] || 0) + 1;
  }

  let entropy = 0;
  const len = str.length;
  for (const char in frequencies) {
    const p = frequencies[char] / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

export function maskSecret(value: string): string {
  if (value.length <= 8) {
    return '****';
  }
  const prefix = value.substring(0, 4);
  const suffix = value.substring(value.length - 4);
  return `${prefix}****${suffix}`;
}

export function detectSecret(
  key: string,
  value: string | undefined
): SecretFinding | undefined {
  if (!value || typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length < 8) {
    return undefined;
  }

  // Check known placeholder values to prevent false positives in templates/examples
  const lower = trimmed.toLowerCase();
  const isPlaceholder =
    lower.startsWith('<') ||
    lower.startsWith('your_') ||
    lower === 'changeme' ||
    lower === 'dummy' ||
    lower === 'test_secret' ||
    lower === 'secret123' ||
    lower === 'example';

  if (isPlaceholder) {
    return undefined;
  }

  // 1. Check deterministic rules
  for (const rule of SECRET_RULES) {
    if (rule.pattern.test(trimmed)) {
      const entropy = calculateShannonEntropy(trimmed);
      return {
        key,
        valueMasked: maskSecret(trimmed),
        ruleName: rule.name,
        severity: rule.severity,
        entropy: Math.round(entropy * 100) / 100,
        description: rule.description,
      };
    }
  }

  // 2. Check high Shannon entropy for token-like variable names
  const upperKey = key.toUpperCase();
  const isSecretKeyName =
    upperKey.includes('SECRET') ||
    upperKey.includes('TOKEN') ||
    upperKey.includes('PASSWORD') ||
    upperKey.includes('API_KEY') ||
    upperKey.includes('PRIVATE_KEY') ||
    upperKey.includes('AUTH_KEY');

  const entropy = calculateShannonEntropy(trimmed);

  if (isSecretKeyName && trimmed.length >= 20 && entropy > 3.8) {
    return {
      key,
      valueMasked: maskSecret(trimmed),
      ruleName: 'High Entropy Secret',
      severity: 'high',
      entropy: Math.round(entropy * 100) / 100,
      description: `Variable name indicates credential and value exhibits high entropy (${entropy.toFixed(2)})`,
    };
  }

  return undefined;
}
