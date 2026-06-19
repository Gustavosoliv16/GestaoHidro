import Database from "@tauri-apps/plugin-sql";

async function getDb() {
  return await Database.load("sqlite:gestao_hidro.db");
}

export interface Professor {
  id_professor: number;
  nome: string;
  id_modalidade: number | null;
  modalidade: string | null;
}

export async function buscarTodosProfessores(): Promise<Professor[]> {
  const db = await getDb();
  return await db.select(`
    SELECT p.id_professor, p.nome, p.id_modalidade, m.modalidade
    FROM PROFESSOR p
    LEFT JOIN MODALIDADE m ON p.id_modalidade = m.id_modalidade
    ORDER BY p.nome ASC
  `);
}

export async function buscarProfessorPorModalidade(
  idModalidade: number
): Promise<Professor | null> {
  const db = await getDb();
  const rows: Professor[] = await db.select(
    `SELECT p.id_professor, p.nome, p.id_modalidade, m.modalidade
     FROM PROFESSOR p
     LEFT JOIN MODALIDADE m ON p.id_modalidade = m.id_modalidade
     WHERE p.id_modalidade = $1
     LIMIT 1`,
    [idModalidade]
  );
  return rows[0] ?? null;
}

export async function criarProfessor(
  nome: string,
  idModalidade: number | null
): Promise<{ sucesso: boolean; id?: number; mensagem: string }> {
  if (!nome.trim()) return { sucesso: false, mensagem: "Nome é obrigatório." };
  const db = await getDb();
  const res: any = await db.execute(
    `INSERT INTO PROFESSOR (nome, id_modalidade) VALUES ($1, $2)`,
    [nome.trim(), idModalidade ?? null]
  );
  return { sucesso: true, id: res.lastInsertId, mensagem: "Professor cadastrado!" };
}

export async function atualizarProfessor(
  idProfessor: number,
  nome: string,
  idModalidade: number | null
): Promise<{ sucesso: boolean; mensagem: string }> {
  if (!nome.trim()) return { sucesso: false, mensagem: "Nome é obrigatório." };
  const db = await getDb();
  await db.execute(
    `UPDATE PROFESSOR SET nome = $1, id_modalidade = $2 WHERE id_professor = $3`,
    [nome.trim(), idModalidade ?? null, idProfessor]
  );
  return { sucesso: true, mensagem: "Professor atualizado!" };
}

export async function excluirProfessor(
  idProfessor: number
): Promise<{ sucesso: boolean; mensagem: string }> {
  const db = await getDb();
  await db.execute(
    `DELETE FROM PROFESSOR WHERE id_professor = $1`,
    [idProfessor]
  );
  return { sucesso: true, mensagem: "Professor removido." };
}
