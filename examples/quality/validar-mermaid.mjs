#!/usr/bin/env node
// Valida todos os blocos ```mermaid dos arquivos .md passados como argumento,
// usando o parser oficial do Mermaid — o mesmo que GitHub e GitLab usam.
//
//   npm install --no-save mermaid jsdom
//   node examples/quality/validar-mermaid.mjs $(find . -name "*.md" -not -path "./node_modules/*")
//
// Saída: lista de blocos reprovados com arquivo, linha e erro do parser.
// Código de saída 1 se algum bloco falhar — pronto para usar em CI.
//
// Limite conhecido: o parser aceita `\n` em rótulo e aspas duplas cruas
// dentro de rótulo. Os dois passam aqui e quebram no render — ver as regras
// 2 e 3 em .claude/skills/mermaid/SKILL.md.

import fs from 'fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><body></body>', { pretendToBeVisual: true });
global.window = dom.window;
global.document = dom.window.document;
global.SVGElement = dom.window.SVGElement;
global.Element = dom.window.Element;
global.HTMLElement = dom.window.HTMLElement;

const mermaid = (await import('mermaid')).default;
mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });

function extrairBlocos(arquivo) {
  const linhas = fs.readFileSync(arquivo, 'utf8').split('\n');
  const blocos = [];
  let atual = null;
  linhas.forEach((linha, i) => {
    if (/^\s*```mermaid\s*$/.test(linha)) {
      atual = { linha: i + 1, corpo: [] };
      return;
    }
    if (atual && /^\s*```\s*$/.test(linha)) {
      blocos.push(atual);
      atual = null;
      return;
    }
    if (atual) atual.corpo.push(linha);
  });
  return blocos;
}

const arquivos = process.argv.slice(2);
if (arquivos.length === 0) {
  console.error('uso: node validar-mermaid.mjs <arquivo.md> [...]');
  process.exit(2);
}

let total = 0;
let falhas = 0;

for (const arquivo of arquivos) {
  for (const bloco of extrairBlocos(arquivo)) {
    total++;
    const codigo = bloco.corpo.join('\n');
    if (!codigo.trim()) continue;
    try {
      await mermaid.parse(codigo);
    } catch (erro) {
      falhas++;
      const msg = String(erro.message).split('\n').slice(0, 6).join('\n   ');
      console.log(`\n[FALHA] ${arquivo}:${bloco.linha}\n   ${msg}`);
    }
  }
}

console.log(`\n${total - falhas}/${total} blocos válidos`);
process.exit(falhas > 0 ? 1 : 0);
