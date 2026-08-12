# Changelog

Todas as mudanças notáveis do projeto são documentadas aqui.  
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [1.7.7] - 12/08/2026
> Modal de changelog e sistema de notas de versão

### Novo
- Modal de novidades exibido automaticamente na primeira abertura após atualização
- Histórico das últimas versões acessível em Configurações → Notas de versão
- Arquivo CHANGELOG.md como fonte única de verdade para versionamento

### Melhoria
- Verificação de atualizações agora silenciosa no boot, com notificação no menu
- Botão manual de verificar atualizações em Configurações → Informações do Sistema
- Estado de update compartilhado entre componentes sem prop drilling
---

## [1.7.6] - 11/08/2026
> Controle de inadimplência e alertas financeiros

### Novo
- Alerta de inadimplência no painel financeiro quando aluno está com mensalidade atrasada
- Desativação automática do aluno após 2 ou mais meses sem pagamento
- Badge do menu sincronizado automaticamente após pagamentos e estornos

### Melhoria
- Dados financeiros atualizados em tempo real após cada transação
- Reativação de aluno protegida contra desativações acidentais

---

## [1.7.5] - 01/08/2026
> Melhorias visuais e ajustes no fluxo de reposições

### Melhoria
- Tema escuro aplicado corretamente em menus, diálogos e campos de seleção
- Cores e fundos dos campos de seleção agora consistentes no modo escuro
- Reposição cancelada automaticamente quando aluno é marcado como faltante na chamada
- Data padrão ao agendar reposição alterada de "amanhã" para "hoje"
- Mensagem de validação de data atualizada para maior clareza

### Correção
- Horário de turma salvo incorretamente em alguns formatos ao cadastrar aluno
- Busca de turmas retornava resultados inconsistentes em certas comparações de horário
