import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import { CodeReference } from '../types/index.js';

// Handle ESM / CJS interop for @babel/traverse
const traverse = (typeof (traverseModule as any).default === 'function')
  ? (traverseModule as any).default
  : traverseModule;

export function scanJsTsCode(
  code: string,
  filePath: string
): CodeReference[] {
  const references: CodeReference[] = [];
  const lines = code.split(/\r?\n/);

  let ast: any;
  try {
    ast = parse(code, {
      sourceType: 'unambiguous',
      plugins: [
        'typescript',
        'jsx',
        'importMeta',
        'dynamicImport',
      ],
      errorRecovery: true,
    });
  } catch {
    // If Babel fails to parse completely, fallback to regex search
    return scanJsTsWithRegex(code, filePath, lines);
  }

  const getSnippet = (lineNum: number): string => {
    return (lines[lineNum - 1] || '').trim();
  };

  try {
    traverse(ast, {
      MemberExpression(path: any) {
        const node = path.node;
        // Check for process.env.VAR or process.env['VAR']
        if (
          node.object &&
          node.object.type === 'MemberExpression' &&
          node.object.object &&
          node.object.object.type === 'Identifier' &&
          node.object.object.name === 'process' &&
          node.object.property &&
          node.object.property.type === 'Identifier' &&
          node.object.property.name === 'env'
        ) {
          let varName = '';
          if (node.property.type === 'Identifier' && !node.computed) {
            varName = node.property.name;
          } else if (node.property.type === 'StringLiteral' && node.computed) {
            varName = node.property.value;
          }

          if (varName && /^[A-Za-z_][A-Za-z0-9_]*$/.test(varName)) {
            const loc = node.loc?.start;
            const line = loc?.line || 1;
            const column = loc?.column || 0;
            references.push({
              filePath,
              line,
              column,
              variable: varName,
              language: filePath.endsWith('.ts') || filePath.endsWith('.tsx') ? 'typescript' : 'javascript',
              snippet: getSnippet(line),
            });
          }
        }

        // Check for import.meta.env.VITE_VAR or import.meta.env['VITE_VAR']
        if (
          node.object &&
          node.object.type === 'MemberExpression' &&
          node.object.object &&
          node.object.object.type === 'MetaProperty' &&
          node.object.object.meta &&
          node.object.object.meta.name === 'import' &&
          node.object.object.property &&
          node.object.object.property.name === 'meta' &&
          node.object.property &&
          node.object.property.name === 'env'
        ) {
          let varName = '';
          if (node.property.type === 'Identifier' && !node.computed) {
            varName = node.property.name;
          } else if (node.property.type === 'StringLiteral' && node.computed) {
            varName = node.property.value;
          }

          if (varName && /^[A-Za-z_][A-Za-z0-9_]*$/.test(varName)) {
            const loc = node.loc?.start;
            const line = loc?.line || 1;
            const column = loc?.column || 0;
            references.push({
              filePath,
              line,
              column,
              variable: varName,
              language: filePath.endsWith('.ts') || filePath.endsWith('.tsx') ? 'typescript' : 'javascript',
              snippet: getSnippet(line),
            });
          }
        }
      },

      OptionalMemberExpression(path: any) {
        const node = path.node;
        // Check for process.env?.VAR
        if (
          node.object &&
          node.object.type === 'MemberExpression' &&
          node.object.object &&
          node.object.object.name === 'process' &&
          node.object.property &&
          node.object.property.name === 'env'
        ) {
          let varName = '';
          if (node.property.type === 'Identifier' && !node.computed) {
            varName = node.property.name;
          } else if (node.property.type === 'StringLiteral' && node.computed) {
            varName = node.property.value;
          }

          if (varName && /^[A-Za-z_][A-Za-z0-9_]*$/.test(varName)) {
            const loc = node.loc?.start;
            const line = loc?.line || 1;
            const column = loc?.column || 0;
            references.push({
              filePath,
              line,
              column,
              variable: varName,
              language: filePath.endsWith('.ts') || filePath.endsWith('.tsx') ? 'typescript' : 'javascript',
              snippet: getSnippet(line),
            });
          }
        }
      },

      VariableDeclarator(path: any) {
        const node = path.node;
        // Check for destructuring: const { PORT, DB_URL } = process.env;
        if (
          node.id &&
          node.id.type === 'ObjectPattern' &&
          node.init &&
          node.init.type === 'MemberExpression' &&
          node.init.object?.name === 'process' &&
          node.init.property?.name === 'env'
        ) {
          for (const prop of node.id.properties) {
            if (prop.type === 'ObjectProperty') {
              let varName = '';
              if (prop.key.type === 'Identifier') {
                varName = prop.key.name;
              } else if (prop.key.type === 'StringLiteral') {
                varName = prop.key.value;
              }

              if (varName && /^[A-Za-z_][A-Za-z0-9_]*$/.test(varName)) {
                const loc = prop.loc?.start || node.loc?.start;
                const line = loc?.line || 1;
                const column = loc?.column || 0;
                references.push({
                  filePath,
                  line,
                  column,
                  variable: varName,
                  language: filePath.endsWith('.ts') || filePath.endsWith('.tsx') ? 'typescript' : 'javascript',
                  snippet: getSnippet(line),
                });
              }
            }
          }
        }
      },
    });
  } catch {
    // If traversal hits an unexpected node, fallback
    return scanJsTsWithRegex(code, filePath, lines);
  }

  return references;
}

function scanJsTsWithRegex(code: string, filePath: string, lines: string[]): CodeReference[] {
  const references: CodeReference[] = [];
  const regex = /process\.env(?:\??\.)?([A-Za-z_][A-Za-z0-9_]*)|process\.env\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]|import\.meta\.env(?:\??\.)?([A-Za-z_][A-Za-z0-9_]*)|import\.meta\.env\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Destructuring regex check: const { A, B } = process.env;
    const destructureMatch = line.match(/(?:const|let|var)\s*\{([^}]+)\}\s*=\s*process\.env/);
    if (destructureMatch) {
      const vars = destructureMatch[1].split(',');
      for (const v of vars) {
        const cleanVar = v.split('=')[0].trim();
        if (cleanVar && /^[A-Za-z_][A-Za-z0-9_]*$/.test(cleanVar)) {
          references.push({
            filePath,
            line: i + 1,
            column: line.indexOf(cleanVar),
            variable: cleanVar,
            language: filePath.endsWith('.ts') || filePath.endsWith('.tsx') ? 'typescript' : 'javascript',
            snippet: line.trim(),
          });
        }
      }
    }

    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      const varName = match[1] || match[2] || match[3] || match[4];
      if (varName) {
        references.push({
          filePath,
          line: i + 1,
          column: match.index,
          variable: varName,
          language: filePath.endsWith('.ts') || filePath.endsWith('.tsx') ? 'typescript' : 'javascript',
          snippet: line.trim(),
        });
      }
    }
  }

  return references;
}
