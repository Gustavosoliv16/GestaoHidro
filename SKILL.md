---
name: webapp-design-system
description: Use this skill whenever building, styling, or restyling dashboards, admin panels, or web apps (HTML, React/JSX, or CSS) so every page follows the same design system — color palette, typography, spacing scale, and component rules. Trigger this any time the user asks to create a screen, page, component, or UI for their swim-school admin/dashboard product, mentions wanting "consistent design," "padronizar," dark mode/light mode, or references the navy/cyan swim-themed brand. Always consult design.md before writing any markup or CSS for this product — do not invent new colors, fonts, spacing values, or component styles outside what's documented there.
---

# Webapp Design System

Sistema de design fixo para padronizar dashboards e apps web de uma escola de natação. A identidade é azul marinho + ciano, com nuances que remetem à água: profundidade, fluidez, claridade. Suporta light mode e dark mode.

**Regra central: este não é um espaço para criatividade visual livre.** A skill `frontend-design` existe para quando o objetivo é uma identidade nova e ousada por projeto. Esta skill é o oposto: consistência entre páginas é o objetivo. Toda decisão de cor, fonte, espaçamento e raio de borda já foi tomada em `design.md` — o trabalho aqui é aplicar esse sistema corretamente, não reinventá-lo a cada tela.

## Quando usar

- Criar uma nova página, tela ou componente do dashboard/admin
- Restilizar algo existente para bater com o padrão
- Implementar dark mode em algo que só tinha light mode (ou vice-versa)
- Revisar uma UI já pronta para checar aderência ao sistema
- Adicionar um novo tipo de componente (ex: um novo tipo de card) que ainda não está documentado em `design.md`

## Antes de escrever qualquer markup ou CSS

1. Leia `design.md` por inteiro (ou pelo menos a seção relevante: cores, tipografia, espaçamento, componentes).
2. Identifique se o componente que você vai construir já está documentado. Se sim, copie os valores exatos (hex, rem, peso de fonte) — não aproxime de memória.
3. Se o componente NÃO está documentado (ex: um novo tipo de gráfico, um novo tipo de modal), construa-o **derivando dos tokens existentes** (mesma paleta, mesma escala de espaçamento, mesma tipografia) e, ao final, sugira ao usuário adicionar esse novo padrão ao `design.md` para manter o sistema vivo.

## Regras inegociáveis

- **Nunca invente uma cor nova.** Toda cor usada deve vir da paleta de tokens em `design.md`. Se algo "precisa" de uma cor que não existe lá, use a mais próxima semanticamente (ex: estado de erro → token de erro, não um vermelho aleatório).
- **Nunca misture famílias tipográficas fora das duas definidas** (display + texto). Não introduzir uma terceira fonte "só para esse título".
- **Sempre implementar light mode E dark mode juntos.** Não entregar uma tela só em um modo "para depois fazer o dark mode". Use as variáveis CSS de tema descritas em `design.md` desde o início — isso evita retrabalho.
- **Espaçamento sempre na escala definida** (múltiplos do token base). Nunca usar valores arbitrários como `padding: 13px` ou `margin: 22px`.
- **Cantos, sombras e bordas seguem os tokens de `design.md`**, não valores ad-hoc.
- Toques aquáticos (gradientes sutis, curvas, ícones relacionados a natação) são bem-vindos **com moderação** — isso é um painel admin/dashboard, a prioridade é legibilidade e densidade de informação, não decoração. Use o tema visual para garantir identidade (cor de marca, ícones pontuais), não para "feiras de design".

## Como aplicar em código

- **HTML/CSS puro:** declare os tokens como CSS custom properties no `:root` (light) e sobrescreva em `[data-theme="dark"]` ou `.dark`, exatamente como modelado em `design.md`.
- **React/JSX (Tailwind):** se o projeto usa Tailwind, mapeie os tokens de `design.md` para o `tailwind.config` (cores customizadas, `fontFamily`, `spacing`) em vez de usar classes de cor padrão do Tailwind (`blue-500`, etc.) — isso garante que qualquer `bg-azul-700` no código bate com o hex exato do sistema.
- Sempre que o componente envolver texto sobre cor (botões, badges, banners), verifique mentalmente o par contra a tabela de contraste em `design.md` — todos os pares documentados já passam WCAG AA ou AAA; pares fora da tabela precisam ser checados antes de usar.

## Quando o usuário pedir algo fora do sistema

Se o usuário pedir uma cor, fonte ou estilo que quebra o sistema (ex: "põe um laranja vibrante aqui"), não recuse de cara — explique rapidamente que isso sai do padrão definido em `design.md` e pergunte se é uma exceção pontual (ok, mas documentar) ou se o sistema deveria mudar (atualizar `design.md` para todos os usos futuros). Consistência entre páginas só funciona se exceções não viram regra silenciosa.

## Arquivos desta skill

- `design.md` — o sistema de design completo: paleta (light/dark), tipografia, escala de espaçamento, raios, sombras, componentes base (botões, cards, inputs, tabelas, badges, navegação) e exemplos de uso. **Leitura obrigatória antes de codar.**
