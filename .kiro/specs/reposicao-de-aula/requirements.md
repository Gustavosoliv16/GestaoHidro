# Documento de Requisitos — Reposição de Aula

## Introdução

A funcionalidade de **Reposição de Aula** permite que alunos ativos que faltaram a uma aula regular possam ser agendados para assistir a uma aula em uma turma diferente da sua, em uma data futura específica. O sistema deve registrar, exibir e controlar o ciclo de vida dessas reposições — de AGENDADA a REALIZADA ou CANCELADA — integrando-as à tela de chamada (Presença) sem confundi-las com matrículas regulares.

---

## Glossário

- **Sistema**: a aplicação GestaoHidro (Tauri + React + SQLite).
- **Aluno**: registro na tabela ALUNOS; possui modalidade, status ativo/inativo e vínculo com turmas fixas.
- **Turma**: registro na tabela TURMAS; possui dia da semana, horário e capacidade máxima.
- **Turma de Origem**: turma à qual o aluno está vinculado por ALUNO_HORARIO_PADRAO.
- **Turma de Reposição**: turma diferente da de origem onde o aluno comparecerá para repor a aula.
- **Reposição**: agendamento pontual (uma data específica) de um aluno em uma Turma de Reposição.
- **REPOSICAO_AULA**: nova tabela de banco de dados que persiste as reposições.
- **ServicoReposicao**: módulo TypeScript responsável por todas as operações de banco relativas a reposições.
- **TelaReposicoes**: tela acessível pelo PanelMenu da página Cadastros que lista e gerencia reposições.
- **SecaoReposicao**: seção dentro do formulário de edição de aluno (CadastroAluno) para agendar uma reposição.
- **TelaChamada**: tela de Presença existente onde a chamada diária é registrada.

---

## Requisitos

### Requisito 1: Persistência de Reposições no Banco de Dados

**User Story:** Como administrador do sistema, quero que reposições sejam armazenadas de forma estruturada no banco, para que possam ser consultadas, editadas e integradas à chamada.

#### Critérios de Aceitação

1. THE Sistema SHALL criar a tabela `REPOSICAO_AULA` com as colunas: `id_reposicao` (PK autoincrement), `id_aluno` (FK → ALUNOS), `id_turma_reposicao` (FK → TURMAS), `data_reposicao` (TEXT, formato ISO `YYYY-MM-DD`), `status` (TEXT, padrão `'AGENDADA'`) e `observacao` (TEXT, nullable).
2. THE Sistema SHALL garantir a constraint `UNIQUE(id_aluno, id_turma_reposicao, data_reposicao)` para evitar duplicidade de reposição do mesmo aluno na mesma turma e data.
3. THE Sistema SHALL aceitar apenas os valores `'AGENDADA'`, `'REALIZADA'` e `'CANCELADA'` para a coluna `status` da tabela `REPOSICAO_AULA`.
4. THE Sistema SHALL criar a tabela `REPOSICAO_AULA` durante a inicialização do banco em `db.ts`, junto com as demais tabelas existentes, utilizando `CREATE TABLE IF NOT EXISTS`.

---

### Requisito 2: Agendamento de Reposição pelo Cadastro do Aluno

**User Story:** Como coordenador, quero agendar uma reposição diretamente na ficha do aluno, para que o processo seja rápido e contextualizado.

#### Critérios de Aceitação

1. WHEN o usuário abre o formulário de edição de um aluno ativo, THE Sistema SHALL exibir a SecaoReposicao contendo: seletor de turma, seletor de data e botão de confirmação.
2. WHEN o usuário seleciona uma turma no seletor, THE Sistema SHALL listar apenas turmas ativas, priorizando (mas não limitando a) turmas da mesma modalidade do aluno.
3. WHEN o usuário confirma o agendamento, THE ServicoReposicao SHALL inserir o registro na tabela `REPOSICAO_AULA` com status `'AGENDADA'`.
4. IF o aluno selecionado estiver inativo (campo `ativo = 0`), THEN THE Sistema SHALL desabilitar a SecaoReposicao e exibir mensagem informando que alunos inativos não podem agendar reposição.
5. IF a data selecionada for anterior ou igual à data atual, THEN THE Sistema SHALL rejeitar o agendamento e exibir mensagem de erro indicando que a reposição deve ser para uma data futura.
6. IF já existir uma reposição com o mesmo `id_aluno`, `id_turma_reposicao` e `data_reposicao`, THEN THE Sistema SHALL rejeitar o agendamento e exibir mensagem de duplicidade.
7. WHEN o agendamento for salvo com sucesso, THE Sistema SHALL exibir notificação de confirmação e limpar os campos da SecaoReposicao.
8. WHERE a SecaoReposicao está visível, THE Sistema SHALL exibir a lista de reposições já agendadas do aluno (status `'AGENDADA'`) com opção de cancelamento individual.

---

### Requisito 3: Gerenciamento de Reposições pela Tela de Reposições

**User Story:** Como coordenador, quero uma tela dedicada para visualizar e gerenciar todas as reposições, para ter controle centralizado sem precisar acessar cada aluno individualmente.

#### Critérios de Aceitação

1. THE Sistema SHALL adicionar o item "Reposições" com ícone `pi pi-calendar-plus` no PanelMenu da página Cadastros, dentro do grupo "Utilidades" ou grupo equivalente.
2. WHEN o usuário acessa a TelaReposicoes, THE Sistema SHALL exibir a lista de reposições com as colunas: nome do aluno, turma de reposição (dia + horário + modalidade), data da reposição e status.
3. WHILE a TelaReposicoes está ativa, THE Sistema SHALL permitir filtrar reposições por status (`AGENDADA`, `REALIZADA`, `CANCELADA`) e por intervalo de datas.
4. WHEN o usuário cancela uma reposição com status `'AGENDADA'`, THE ServicoReposicao SHALL atualizar o status para `'CANCELADA'` e a TelaReposicoes SHALL refletir a mudança imediatamente.
5. IF uma reposição possuir status `'REALIZADA'` ou `'CANCELADA'`, THEN THE Sistema SHALL impedir a edição ou recancelamento desse registro, exibindo os controles de ação desabilitados.
6. THE Sistema SHALL exibir a TelaReposicoes com paginação quando houver mais de 20 registros visíveis.

---

### Requisito 4: Integração com a Tela de Chamada

**User Story:** Como professor, quero ver os alunos em reposição durante a chamada com um indicador visual diferente, para distingui-los dos alunos regularmente matriculados.

#### Critérios de Aceitação

1. WHEN a TelaChamada é carregada para uma turma e data específicas, THE Sistema SHALL incluir na listagem de alunos os registros de `REPOSICAO_AULA` com `id_turma_reposicao` correspondente, `data_reposicao` igual à data selecionada e status `'AGENDADA'`.
2. THE TelaChamada SHALL exibir um badge com texto "Reposição" e severidade visual distinta (ex.: cor info/azul) para cada aluno em reposição, em substituição ao badge padrão de matriculado.
3. WHEN o professor marca presença de um aluno em reposição, THE ServicoReposicao SHALL atualizar o status da reposição para `'REALIZADA'` e THE ServicoReposicao SHALL inserir registro em `AGENDA_CALENDARIO` com status `'PRESENTE'` para essa turma, aluno e data.
4. WHEN o professor marca falta de um aluno em reposição, THE Sistema SHALL registrar status `'FALTOU'` em `AGENDA_CALENDARIO` sem alterar o status da reposição (permanece `'AGENDADA'`).
5. IF um aluno constar tanto em `ALUNO_HORARIO_PADRAO` quanto em `REPOSICAO_AULA` para a mesma turma e data, THEN THE TelaChamada SHALL exibir o aluno uma única vez com o badge de reposição prevalecendo.
6. WHEN a chamada é carregada, THE Sistema SHALL separar visualmente (ex.: seção "Matrículas" e seção "Reposições") os alunos regulares dos alunos em reposição.

---

### Requisito 5: Validações de Capacidade e Elegibilidade

**User Story:** Como coordenador, quero que o sistema valide a capacidade da turma e a elegibilidade do aluno antes de confirmar uma reposição, para evitar superlotação e erros operacionais.

#### Critérios de Aceitação

1. WHEN o usuário tenta agendar uma reposição, THE ServicoReposicao SHALL verificar se o número de alunos regulares matriculados somado ao número de reposições `'AGENDADA'` para a mesma turma e data não excede a `capacidade_maxima` da turma.
2. IF a capacidade máxima da turma já estiver atingida para a data selecionada, THEN THE Sistema SHALL rejeitar o agendamento e exibir mensagem indicando que a turma não tem vagas para reposição nessa data.
3. IF o aluno selecionado não possuir registro em `ALUNOS` com `ativo = 1`, THEN THE ServicoReposicao SHALL retornar erro de elegibilidade e THE Sistema SHALL exibir a mensagem correspondente ao usuário.
4. THE ServicoReposicao SHALL realizar todas as validações antes de executar o `INSERT` na tabela `REPOSICAO_AULA`, garantindo que nenhum registro inválido seja persistido.

---

### Requisito 6: Serviço de Reposição (ServicoReposicao)

**User Story:** Como desenvolvedor, quero um serviço centralizado para todas as operações de reposição, para manter a consistência da lógica de negócio e facilitar testes.

#### Critérios de Aceitação

1. THE ServicoReposicao SHALL expor a função `agendarReposicao(idAluno, idTurmaReposicao, dataReposicao, observacao?)` que executa todas as validações dos Requisitos 2 e 5 antes de persistir.
2. THE ServicoReposicao SHALL expor a função `cancelarReposicao(idReposicao)` que atualiza o status para `'CANCELADA'` somente se o status atual for `'AGENDADA'`.
3. THE ServicoReposicao SHALL expor a função `buscarReposicoesPorAluno(idAluno)` que retorna todas as reposições do aluno ordenadas por `data_reposicao` descendente.
4. THE ServicoReposicao SHALL expor a função `buscarReposicoesParaChamada(idTurma, data)` que retorna os dados completos (nome do aluno, id_aluno, id_reposicao, status) das reposições agendadas para aquela turma e data.
5. THE ServicoReposicao SHALL expor a função `marcarReposicaoRealizada(idReposicao)` que atualiza o status para `'REALIZADA'` somente se o status atual for `'AGENDADA'`.
6. FOR ALL chamadas a `agendarReposicao` com dados válidos, THE ServicoReposicao SHALL retornar um objeto com `{ sucesso: true, idReposicao: number }`.
7. FOR ALL chamadas a `agendarReposicao` com dados inválidos, THE ServicoReposicao SHALL retornar um objeto com `{ sucesso: false, mensagem: string }` sem lançar exceção não tratada.

---

### Requisito 7: Consistência e Isolamento de Dados

**User Story:** Como administrador, quero que os dados de reposição sejam consistentes e não contaminem as estatísticas de presença regular, para que relatórios e contagens reflitam a realidade.

#### Critérios de Aceitação

1. THE Sistema SHALL garantir que reposições com status `'AGENDADA'` ou `'CANCELADA'` não sejam contabilizadas nos totais de presença regular exibidos na TelaChamada.
2. WHEN um aluno é inativado no sistema, THE Sistema SHALL atualizar para `'CANCELADA'` todas as reposições `'AGENDADA'` desse aluno, em paralelo à remoção de seus vínculos de ALUNO_HORARIO_PADRAO.
3. THE ServicoReposicao SHALL usar transações de banco de dados (`BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK`) em operações que envolvam múltiplas tabelas (ex.: marcar realizada + inserir em AGENDA_CALENDARIO).
