import { EnvEntry } from '../types/index.js';
import { inferType } from '../matrix/type_infer.js';

export interface DotenvParseOptions {
  expandVariables?: boolean;
  knownValues?: Record<string, string>;
}

export function parseDotenv(
  content: string,
  sourceFile: string = '.env',
  options: DotenvParseOptions = { expandVariables: true }
): Map<string, EnvEntry> {
  const result = new Map<string, EnvEntry>();
  const lines = content.split(/\r?\n/);
  const knownValues: Record<string, string> = { ...options.knownValues };

  let currentComment = '';
  let inMultiline = false;
  let multilineKey = '';
  let multilineQuote = '';
  let multilineValue = '';
  let multilineStartLine = 1;
  let multilineComment = '';

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i];

    if (inMultiline) {
      // Look for closing quote
      const quoteIndex = line.indexOf(multilineQuote);
      if (quoteIndex !== -1 && (quoteIndex === 0 || line[quoteIndex - 1] !== '\\')) {
        multilineValue += '\n' + line.substring(0, quoteIndex);
        inMultiline = false;

        const processedValue = processQuotes(multilineValue, multilineQuote);
        const finalValue = options.expandVariables
          ? expandVars(processedValue, knownValues)
          : processedValue;

        knownValues[multilineKey] = finalValue;
        result.set(multilineKey, {
          key: multilineKey,
          value: finalValue,
          rawValue: multilineValue,
          type: inferType(finalValue, multilineKey),
          sourceFile,
          format: 'dotenv',
          line: multilineStartLine,
          comment: multilineComment || undefined,
        });

        multilineKey = '';
        multilineValue = '';
        multilineComment = '';
      } else {
        multilineValue += '\n' + line;
      }
      continue;
    }

    const trimmed = line.trim();

    // Empty line resets comment accumulator
    if (!trimmed) {
      currentComment = '';
      continue;
    }

    // Comment line
    if (trimmed.startsWith('#')) {
      const commentText = trimmed.replace(/^#+\s*/, '');
      currentComment = currentComment ? `${currentComment}\n${commentText}` : commentText;
      continue;
    }

    // Export prefix support (e.g., "export KEY=value")
    const cleanLine = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;

    const equalIndex = cleanLine.indexOf('=');
    if (equalIndex === -1) {
      continue;
    }

    const key = cleanLine.substring(0, equalIndex).trim();
    if (!key || !/^[A-Za-z_][A-Za-z0-9_.]*$/.test(key)) {
      continue;
    }

    let remainder = cleanLine.substring(equalIndex + 1).trim();
    let inlineComment = '';

    // Check if multiline or quoted
    const firstChar = remainder[0];
    if (firstChar === '"' || firstChar === "'") {
      const quote = firstChar;
      const closingIndex = remainder.indexOf(quote, 1);

      if (closingIndex === -1 || (closingIndex > 1 && remainder[closingIndex - 1] === '\\')) {
        // Starts a multiline string
        inMultiline = true;
        multilineKey = key;
        multilineQuote = quote;
        multilineValue = remainder.substring(1);
        multilineStartLine = lineNumber;
        multilineComment = currentComment;
        currentComment = '';
        continue;
      } else {
        const rawQuoted = remainder.substring(1, closingIndex);
        const afterQuote = remainder.substring(closingIndex + 1).trim();
        if (afterQuote.startsWith('#')) {
          inlineComment = afterQuote.replace(/^#+\s*/, '');
        }
        remainder = processQuotes(rawQuoted, quote);
      }
    } else {
      // Unquoted: check for inline comments separated by whitespace and #
      const commentMatch = remainder.match(/\s+#(.*)$/);
      if (commentMatch && commentMatch.index !== undefined) {
        inlineComment = commentMatch[1].trim();
        remainder = remainder.substring(0, commentMatch.index).trim();
      }
    }

    const finalComment = inlineComment || currentComment || undefined;
    const finalValue = options.expandVariables
      ? expandVars(remainder, knownValues)
      : remainder;

    knownValues[key] = finalValue;
    result.set(key, {
      key,
      value: finalValue,
      rawValue: remainder,
      type: inferType(finalValue, key),
      sourceFile,
      format: 'dotenv',
      line: lineNumber,
      comment: finalComment,
    });

    currentComment = '';
  }

  return result;
}

function processQuotes(str: string, quote: string): string {
  if (quote === "'") {
    return str; // Single quotes are raw literals
  }
  // Double quotes unescape \n, \r, \t, \"
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function expandVars(str: string, vars: Record<string, string>): string {
  // Replace ${VAR} or ${VAR:-default}
  let result = str.replace(/\$\{([A-Za-z0-9_]+)(?::-([^}]*))?\}/g, (_, varName, defVal) => {
    if (vars[varName] !== undefined && vars[varName] !== '') {
      return vars[varName];
    }
    if (process.env[varName] !== undefined && process.env[varName] !== '') {
      return process.env[varName]!;
    }
    return defVal !== undefined ? defVal : '';
  });

  // Replace $VAR
  result = result.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (fullMatch, varName) => {
    if (vars[varName] !== undefined) {
      return vars[varName];
    }
    if (process.env[varName] !== undefined) {
      return process.env[varName]!;
    }
    return fullMatch;
  });

  return result;
}
