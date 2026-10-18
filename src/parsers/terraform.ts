import { EnvEntry } from '../types/index.js';
import { inferType } from '../matrix/type_infer.js';

export function parseTerraformVars(
  content: string,
  sourceFile: string = 'terraform.tfvars'
): Map<string, EnvEntry> {
  const result = new Map<string, EnvEntry>();

  // If JSON format
  if (sourceFile.endsWith('.json') || content.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed === 'object' && parsed !== null) {
        for (const [key, rawVal] of Object.entries(parsed)) {
          const val = typeof rawVal === 'string' ? rawVal : JSON.stringify(rawVal);
          result.set(key, {
            key,
            value: val,
            rawValue: val,
            type: inferType(val, key),
            sourceFile,
            format: 'terraform',
            comment: 'Terraform JSON vars',
          });
        }
        return result;
      }
    } catch {
      // Fallback to HCL2 parser
    }
  }

  // Parse HCL2 .tfvars
  const lines = content.split(/\r?\n/);
  let currentComment = '';

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    let line = lines[i].trim();

    if (!line) {
      currentComment = '';
      continue;
    }

    // Comment lines: # or //
    if (line.startsWith('#') || line.startsWith('//')) {
      const commentText = line.replace(/^(#|\/\/)\s*/, '');
      currentComment = currentComment ? `${currentComment}\n${commentText}` : commentText;
      continue;
    }

    // Variable assignment: key = value
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    let valPart = match[2].trim();
    let inlineComment = '';

    // Handle inline comments
    const inlineCommentIdx = valPart.search(/\s+(#|\/\/)/);
    if (inlineCommentIdx !== -1) {
      inlineComment = valPart.substring(inlineCommentIdx).replace(/^\s*(#|\/\/)\s*/, '');
      valPart = valPart.substring(0, inlineCommentIdx).trim();
    }

    // Strip wrapping quotes
    let finalVal = valPart;
    if (
      (valPart.startsWith('"') && valPart.endsWith('"')) ||
      (valPart.startsWith("'") && valPart.endsWith("'"))
    ) {
      finalVal = valPart.slice(1, -1);
    }

    const finalComment = inlineComment || currentComment || undefined;

    result.set(key, {
      key,
      value: finalVal,
      rawValue: valPart,
      type: inferType(finalVal, key),
      sourceFile,
      format: 'terraform',
      line: lineNumber,
      comment: finalComment,
    });

    currentComment = '';
  }

  return result;
}
