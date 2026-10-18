import { InferredType } from '../types/index.js';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KNOWN_URL_SCHEMES = ['http://', 'https://', 'postgres://', 'postgresql://', 'mysql://', 'redis://', 'mongodb://', 'mongodb+srv://', 'amqp://', 'amqps://', 'grpc://', 'ws://', 'wss://', 'sqlite://'];

export function inferType(value: string | undefined | null, keyName: string = ''): InferredType {
  if (value === undefined || value === null) {
    return 'string';
  }

  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  const upperKey = keyName.toUpperCase();

  // Boolean check
  if (lower === 'true' || lower === 'false' || lower === 'yes' || lower === 'no') {
    return 'boolean';
  }

  // Check if specifically named as port or numeric port range
  if (upperKey === 'PORT' || upperKey.endsWith('_PORT')) {
    const num = Number(trimmed);
    if (!isNaN(num) && Number.isInteger(num) && num >= 1 && num <= 65535) {
      return 'port';
    }
  }

  // URL check
  const hasUrlScheme = KNOWN_URL_SCHEMES.some((scheme) => lower.startsWith(scheme));
  if (hasUrlScheme) {
    try {
      new URL(trimmed);
      return 'url';
    } catch {
      // Some DB connection strings (like postgres://user:pass@host/db) may fail strict WHATWG URL parsing if credentials or port are specialized, but scheme is explicit
      return 'url';
    }
  }

  // Email check
  if (EMAIL_REGEX.test(trimmed)) {
    return 'email';
  }

  // UUID check
  if (UUID_REGEX.test(trimmed)) {
    return 'uuid';
  }

  // JSON check
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // Not valid JSON
    }
  }

  // Numeric check (integer or float)
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed);
    // If it's an integer in port range and key has port vibes
    if (Number.isInteger(num) && num >= 1024 && num <= 65535 && upperKey.includes('PORT')) {
      return 'port';
    }
    return 'number';
  }

  return 'string';
}
