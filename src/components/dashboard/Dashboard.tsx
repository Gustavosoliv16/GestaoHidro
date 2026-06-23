import React, { useState, useEffect } from 'react';
import StatCard from './StatCard';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import Database from "@tauri-apps/plugin-sql";

import { buscarTodosAlunos } from '../../services/AlunoService';
import { buscarTodasTurmas } from '../../services/TurmaService';
import { buscarResumoFinanceiroAlunos } from '../../services/MensalidadeService';

type ViewType = 'alunos' | 'aulas' | 'receitas' | 'inadimplencia';

const Dashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('alunos');
  
  const [alunosAtivos, setAlunosAtivos] = useState<any[]>([]);
  const [aulasHoje, setAulasHoje] = useState<any[]>([]);
  const [inadimplentes, setInadimplentes] = useState<any[]>([]);
  const [ultimosPagamentos, setUltimosPagamentos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      try {
        const db = await Database.load("sqlite:gestao_hidro.db");

        // 1. Alunos
        const todosAlunos = await buscarTodosAlunos();
        const ativos = todosAlunos.filter(a => Number(a.ativo) === 1);
        setAlunosAtivos(ativos);

        // 2. Aulas de Hoje
        const turmas = await buscarTodasTurmas();
        const date = new Date();
        const diaHoje = date.getDay() === 0 ? 6 : date.getDay() - 1;
        const turmasHoje = turmas
  .filter(t => t.diaSemana === diaHoje)
  .sort((a, b) => a.horarioInicio - b.horarioInicio);
        setAulasHoje(turmasHoje);

        // 3. Financeiro
        const resumoFin = await buscarResumoFinanceiroAlunos();
        const comAtraso = resumoFin.filter(r => r.totalAtrasado > 0);
        setInadimplentes(comAtraso);

        // Buscar ultimos pagamentos no banco (usando tabela MENSALIDADE)
        const pagamentosRecentes: any[] = await db.select(`
          SELECT 
            m.id_mensalidade as id_pagamento, 
            m.valor_pago, 
            m.data_pagamento, 
            a.nome as nomeAluno 
          FROM MENSALIDADE m 
          JOIN ALUNOS a ON m.id_aluno = a.id_aluno 
          WHERE m.status = 'PAGO' AND m.data_pagamento IS NOT NULL
          ORDER BY m.data_pagamento DESC, m.id_mensalidade DESC 
          LIMIT 10
        `);
        
        // Formatar datas para a tela
        const pagFormatados = pagamentosRecentes.map(p => {
          const [ano, mes, dia] = p.data_pagamento.split('-');
          return {
            ...p,
            dataFormatada: `${dia}/${mes}/${ano}`,
            valorFormatado: `R$ ${Number(p.valor_pago).toFixed(2)}`
          };
        });
        setUltimosPagamentos(pagFormatados);

      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    }

    carregarDados();
  }, []);

  const stats = [
    { id: 'alunos', label: 'Alunos Ativos', value: alunosAtivos.length, icon: 'pi-users', color: 'info' as const },
    { id: 'aulas', label: 'Aulas Hoje', value: aulasHoje.length, icon: 'pi-calendar', color: 'warning' as const },
    { id: 'receitas', label: 'Mensalidades Pagas', value: undefined, icon: 'pi-dollar', color: 'success' as const },
    { id: 'inadimplencia', label: 'Inadimplentes', value: inadimplentes.length, icon: 'pi-exclamation-triangle', color: 'danger' as const }
  ];

  const renderHoraAula = (rowData: any) => {
    const hora = rowData.horarioInicio;
    const horaAtual = new Date().getHours();
    
    let color = 'var(--color-cyan-600)'; 
    let bg = 'rgba(14, 124, 140, 0.12)';
    
    if (hora < horaAtual) {
      color = 'var(--color-warning)'; 
      bg = 'rgba(217, 164, 65, 0.14)';
    } else if (hora === horaAtual) {
      color = 'var(--color-success)'; 
      bg = 'rgba(27, 158, 107, 0.12)';
    }
  
    return (
      <span style={{ 
        color, backgroundColor: bg, padding: '4px 10px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '0.875rem' 
      }}>
        {hora}:00
      </span>
    );
  };

  const renderActiveViewContent = () => {
    if (isLoading) {
      return <div style={{ padding: '4rem', textAlign: 'center' }}><i className="pi pi-spin pi-spinner" style={{ fontSize: '2.5rem', color: 'var(--color-accent)' }}></i></div>;
    }

    switch (activeView) {
      case 'alunos':
        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ margin: 0 }}>Lista de Alunos Ativos</h3>
            </div>
            <DataTable value={alunosAtivos}
            emptyMessage="Nenhum aluno ativo encontrado." paginator rows={10}>
              <Column field="nome" header="Nome"></Column>
              <Column field="modalidade" header="Modalidade"></Column>
              <Column field="telefone" header="Telefone"></Column>
              <Column field="status" header="Status" body={() => <Tag severity="success" value="Ativo" rounded />}></Column>
            </DataTable>
          </>
        );
      case 'aulas':
        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ margin: 0 }}>Aulas de Hoje</h3>
            </div>
            <DataTable value={aulasHoje} emptyMessage="Nenhuma aula cadastrada para hoje.">
              <Column field="horarioInicio" header="Horário" body={renderHoraAula} style={{ width: '120px' }}></Column>
              <Column field="modalidade" header="Modalidade"></Column>
            </DataTable>
          </>
        );
      case 'receitas':
        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ margin: 0 }}>Últimos Pagamentos Recebidos</h3>
            </div>
            <DataTable value={ultimosPagamentos}
            emptyMessage="Nenhum pagamento registrado recentemente.">
              <Column field="dataFormatada" header="Data"></Column>
              <Column field="nomeAluno" header="Aluno"></Column>
              <Column field="valorFormatado" header="Valor" body={(rowData) => <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>{rowData.valorFormatado}</span>}></Column>
            </DataTable>
          </>
        );
      case 'inadimplencia':
      default:
        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ margin: 0 }}>Atenção: Inadimplentes</h3>
            </div>
            <DataTable value={inadimplentes}
            emptyMessage="Nenhum aluno inadimplente encontrado.">
              <Column field="nome" header="Aluno"></Column>
              <Column field="totalAtrasado" header="Mensalidades Atrasadas" body={(rowData) => <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{rowData.totalAtrasado}</span>}></Column>
              <Column field="valorMensalidade" header="Valor da Mensalidade" body={(rowData) => `R$ ${rowData.valorMensalidade.toFixed(2)}`}></Column>
            </DataTable>
          </>
        );
    }
  };

  return (
    <div className="dashboard-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ marginBottom: 'var(--space-1)' }}>Dashboard</h1>
          <div className="eyebrow">Visão Geral da Escola</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {stats.map((s, i) => (
          <StatCard
            key={i}
            label={s.label}
            value={s.value}
            icon={s.icon}
            color={s.color}
            onClick={() => setActiveView(s.id as ViewType)}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-4)' }}>
        <div className="card fade-in" style={{ padding: 'var(--space-5)' }}>
          {renderActiveViewContent()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
