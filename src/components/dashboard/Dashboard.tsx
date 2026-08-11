import React, { useState, useEffect, useRef, useMemo } from 'react';
import StatCard from './StatCard';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Chart } from 'primereact/chart';
import { Button } from 'primereact/button';
import Database from "@tauri-apps/plugin-sql";

import { buscarTodosAlunos } from '../../services/AlunoService';
import { buscarTodasTurmas } from '../../services/TurmaService';
import { buscarResumoFinanceiroAlunos, ResumoFinanceiroAluno } from '../../services/MensalidadeService';
import { SkeletonDashboard } from '../ui/SkeletonLoader';
import EmptyState from '../ui/EmptyState';

type ViewType = 'alunos' | 'aulas' | 'receitas' | 'inadimplencia';

const Dashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('alunos');
  
  const [alunosAtivos, setAlunosAtivos] = useState<any[]>([]);
  const [aulasHoje, setAulasHoje] = useState<any[]>([]);
  const [inadimplentes, setInadimplentes] = useState<any[]>([]);
  const [ultimosPagamentos, setUltimosPagamentos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalReceitas, setTotalReceitas] = useState<string>('—');
  const [chartData, setChartData] = useState<any>(null);
  const [chartOptions, setChartOptions] = useState<any>(null);
  const [mostrarGrafico, setMostrarGrafico] = useState(false);
  const [vencimentosProximos, setVencimentosProximos] = useState<any[]>([]);
  const chartRef = useRef<Chart>(null);

  // Filtros de data para pagamentos
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('');
  const [filtroDataFim, setFiltroDataFim] = useState<string>('');

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
        const comAtraso = resumoFin.alunos.filter((r: ResumoFinanceiroAluno) => r.totalAtrasado > 0);
        setInadimplentes(comAtraso);

        // 4. Buscar últimos pagamentos (ordenados do mais recente)
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
          LIMIT 50
        `);
        
        const pagFormatados = pagamentosRecentes.map(p => {
          const [ano, mes, dia] = p.data_pagamento.split('-');
          return {
            ...p,
            dataFormatada: `${dia}/${mes}/${ano}`,
            valorFormatado: `R$ ${Number(p.valor_pago).toFixed(2)}`,
            dataRaw: p.data_pagamento,
          };
        });
        setUltimosPagamentos(pagFormatados);

        // 5. Total de receitas
        const totalResult: any[] = await db.select(`
          SELECT COALESCE(SUM(valor_pago), 0) as total
          FROM MENSALIDADE
          WHERE status = 'PAGO' AND data_pagamento IS NOT NULL
        `);
        const totalValor = Number(totalResult[0]?.total || 0);
        setTotalReceitas(`R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

        // 6. Vencimentos próximos (próximos 7 dias) - inclui EM_ABERTO, PENDENTE e ATRASADO
        const hoje = new Date();
        const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
        const daqui7dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
        const limiteStr = `${daqui7dias.getFullYear()}-${String(daqui7dias.getMonth() + 1).padStart(2, '0')}-${String(daqui7dias.getDate()).padStart(2, '0')}`;

        const vencimentos: any[] = await db.select(`
          SELECT 
            a.nome,
            m.mes_referencia,
            m.data_vencimento,
            m.valor,
            m.status
          FROM MENSALIDADE m
          JOIN ALUNOS a ON m.id_aluno = a.id_aluno
          WHERE m.status IN ('EM_ABERTO', 'PENDENTE', 'ATRASADO')
            AND m.data_vencimento >= $1
            AND m.data_vencimento <= $2
          ORDER BY m.data_vencimento ASC
        `, [hojeStr, limiteStr]);
        setVencimentosProximos(vencimentos);

        // 7. Dados para o gráfico
        const dadosGrafico: any[] = await db.select(`
          SELECT 
            strftime('%Y-%m', data_pagamento) as mes,
            COUNT(*) as quantidade,
            SUM(valor_pago) as total_mes
          FROM MENSALIDADE
          WHERE status = 'PAGO' AND data_pagamento IS NOT NULL
          GROUP BY strftime('%Y-%m', data_pagamento)
          ORDER BY mes DESC
          LIMIT 6
        `);

        const dadosOrdenados = dadosGrafico.reverse();

        const nomesMeses: Record<string, string> = {
          '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
          '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
          '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
        };

        const labels = dadosOrdenados.map(d => {
          const [ano, mes] = d.mes.split('-');
          return `${nomesMeses[mes]}/${ano.slice(2)}`;
        });
        const totais = dadosOrdenados.map(d => Number(d.total_mes));
        const quantidades = dadosOrdenados.map(d => Number(d.quantidade));

        setChartData({
          labels,
          datasets: [
            {
              label: 'Total Recebido (R$)',
              data: totais,
              backgroundColor: 'rgba(8, 162, 124, 0.6)',
              borderColor: '#08A27C',
              borderWidth: 2,
              borderRadius: 6,
              yAxisID: 'y',
            },
            {
              label: 'Qtd. Pagamentos',
              data: quantidades,
              type: 'line' as const,
              borderColor: '#0E7C8C',
              backgroundColor: 'rgba(14, 124, 140, 0.15)',
              borderWidth: 2,
              pointBackgroundColor: '#0E7C8C',
              pointRadius: 5,
              tension: 0.3,
              fill: true,
              yAxisID: 'y1',
            }
          ]
        });

        setChartOptions({
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top' as const,
              labels: {
                color: getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim() || '#0A1F2E',
                font: { size: 12, weight: '600' }
              }
            },
            tooltip: {
              callbacks: {
                label: function(context: any) {
                  if (context.dataset.yAxisID === 'y') {
                    return `Total: R$ ${Number(context.parsed.y).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                  }
                  return `Qtd: ${context.parsed.y} pagamento(s)`;
                }
              }
            }
          },
          scales: {
            x: {
              ticks: {
                color: getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim() || '#4A6274',
              },
              grid: { display: false }
            },
            y: {
              position: 'left' as const,
              ticks: {
                color: getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim() || '#4A6274',
                callback: function(value: any) {
                  return `R$ ${Number(value).toLocaleString('pt-BR')}`;
                }
              },
              grid: { color: 'rgba(0,0,0,0.06)' }
            },
            y1: {
              position: 'right' as const,
              ticks: {
                color: '#0E7C8C',
                stepSize: 1,
              },
              grid: { drawOnChartArea: false }
            }
          }
        });

      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    }

    carregarDados();
  }, []);

  // Filtra pagamentos pelo intervalo de datas
  const pagamentosFiltrados = useMemo(() => {
    if (!filtroDataInicio && !filtroDataFim) return ultimosPagamentos.slice(0, 10);
    
    return ultimosPagamentos.filter(p => {
      const dataPag = p.dataRaw;
      if (filtroDataInicio && dataPag < filtroDataInicio) return false;
      if (filtroDataFim && dataPag > filtroDataFim) return false;
      return true;
    });
  }, [ultimosPagamentos, filtroDataInicio, filtroDataFim]);

  const stats = [
    { id: 'alunos', label: 'Alunos Ativos', value: alunosAtivos.length, icon: 'pi-users', color: 'info' as const },
    { id: 'aulas', label: 'Aulas Hoje', value: aulasHoje.length, icon: 'pi-calendar', color: 'warning' as const },
    { id: 'receitas', label: 'Mensalidades Pagas', value: isLoading ? '—' : totalReceitas, icon: 'pi-dollar', color: 'success' as const },
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
      return <SkeletonDashboard />;
    }

    switch (activeView) {
      case 'alunos':
        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ margin: 0 }}>Lista de Alunos Ativos</h3>
            </div>
            {alunosAtivos.length === 0 ? (
              <EmptyState
                icon="pi-users"
                title="Nenhum aluno ativo"
                description="Cadastre o primeiro aluno para começar a usar o sistema."
                actionLabel="Novo Aluno"
                onAction={() => window.location.hash = '/alunos'}
              />
            ) : (
              <DataTable value={alunosAtivos} paginator rows={10}>
                <Column field="nome" header="Nome"></Column>
                <Column field="modalidade" header="Modalidade"></Column>
                <Column field="telefone" header="Telefone"></Column>
                <Column field="status" header="Status" body={() => <Tag severity="success" value="Ativo" rounded />}></Column>
              </DataTable>
            )}
          </>
        );
      case 'aulas':
        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ margin: 0 }}>Aulas de Hoje</h3>
            </div>
            {aulasHoje.length === 0 ? (
              <EmptyState
                icon="pi-calendar"
                title="Nenhuma aula hoje"
                description="Não há aulas cadastradas para o dia de hoje."
                severity="info"
              />
            ) : (
              <DataTable value={aulasHoje}>
                <Column field="horarioInicio" header="Horário" body={renderHoraAula} style={{ width: '120px' }}></Column>
                <Column field="modalidade" header="Modalidade"></Column>
              </DataTable>
            )}
          </>
        );
      case 'receitas':
        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>Últimos Pagamentos Recebidos</h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {chartData && (
                  <button
                    onClick={() => setMostrarGrafico(!mostrarGrafico)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      background: mostrarGrafico ? 'var(--color-success)' : 'var(--color-surface)',
                      color: mostrarGrafico ? '#fff' : 'var(--color-text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <i className={`pi ${mostrarGrafico ? 'pi-table' : 'pi-chart-bar'}`} style={{ fontSize: '1rem' }}></i>
                    {mostrarGrafico ? 'Ver Tabela' : 'Ver Gráfico'}
                  </button>
                )}
              </div>
            </div>

            {mostrarGrafico && chartData ? (
              <div style={{ position: 'relative', height: '380px', padding: 'var(--space-4)' }}>
                <Chart ref={chartRef} type="bar" data={chartData} options={chartOptions} />
              </div>
            ) : (
              <>
                {/* Filtro de período */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Data inicial
                    </label>
                    <input
                      type="date"
                      value={filtroDataInicio}
                      onChange={(e) => setFiltroDataInicio(e.target.value)}
                      className="p-inputtext p-component"
                      style={{ padding: '0.5rem', minWidth: '150px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Data final
                    </label>
                    <input
                      type="date"
                      value={filtroDataFim}
                      onChange={(e) => setFiltroDataFim(e.target.value)}
                      className="p-inputtext p-component"
                      style={{ padding: '0.5rem', minWidth: '150px' }}
                    />
                  </div>
                  {(filtroDataInicio || filtroDataFim) && (
                    <Button
                      icon="pi pi-times"
                      label="Limpar"
                      className="p-button-text p-button-sm"
                      onClick={() => { setFiltroDataInicio(''); setFiltroDataFim(''); }}
                    />
                  )}
                </div>

                {pagamentosFiltrados.length === 0 ? (
                  <EmptyState
                    icon="pi-money-bill"
                    title="Nenhum pagamento encontrado"
                    description={filtroDataInicio || filtroDataFim ? "Nenhum pagamento no período selecionado." : "Nenhum pagamento registrado recentemente."}
                    severity="success"
                  />
                ) : (
                  <DataTable value={pagamentosFiltrados} paginator rows={10}>
                    <Column field="dataFormatada" header="Data"></Column>
                    <Column field="nomeAluno" header="Aluno"></Column>
                    <Column field="valorFormatado" header="Valor" body={(rowData) => <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>{rowData.valorFormatado}</span>}></Column>
                  </DataTable>
                )}
              </>
            )}
          </>
        );
      case 'inadimplencia':
      default:
        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ margin: 0 }}>Atenção: Inadimplentes</h3>
            </div>
            {inadimplentes.length === 0 ? (
              <EmptyState
                icon="pi-check-circle"
                title="Nenhum inadimplente"
                description="Todos os alunos estão em dia com as mensalidades."
                severity="success"
              />
            ) : (
              <DataTable value={inadimplentes}>
                <Column field="nome" header="Aluno"></Column>
                <Column field="totalAtrasado" header="Mensalidades Atrasadas" body={(rowData) => <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{rowData.totalAtrasado}</span>}></Column>
                <Column field="valorMensalidade" header="Valor da Mensalidade" body={(rowData) => `R$ ${rowData.valorMensalidade.toFixed(2)}`}></Column>
              </DataTable>
            )}
          </>
        );
    }
  };

  // Skeleton completo enquanto carrega
  if (isLoading) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="dashboard-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ marginBottom: 'var(--space-1)' }}>Dashboard</h1>
          <div className="eyebrow">Visão Geral da Escola</div>
        </div>
      </div>

      {/* Badge de vencimentos próximos */}
      {vencimentosProximos.length > 0 && (
        <div
          className="card fade-in"
          style={{
            padding: 'var(--space-3) var(--space-5)',
            marginBottom: 'var(--space-4)',
            borderLeft: '4px solid var(--color-warning)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <i className="pi pi-clock" style={{ fontSize: '1.25rem', color: 'var(--color-warning)' }} />
            <div>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>
                {vencimentosProximos.length} mensalidade{vencimentosProximos.length > 1 ? 's' : ''} vence{vencimentosProximos.length > 1 ? 'm' : ''} nos próximos 7 dias
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginLeft: '0.5rem' }}>
                — {vencimentosProximos.map(v => v.nome).slice(0, 3).join(', ')}
                {vencimentosProximos.length > 3 && ` e mais ${vencimentosProximos.length - 3}`}
              </span>
            </div>
          </div>
          <Button
            label="Ver mensalidades"
            icon="pi pi-arrow-right"
            className="p-button-text p-button-sm"
            onClick={() => {
              localStorage.setItem('viewAtiva', 'pagamentos');
              window.location.hash = '/alunos';
            }}
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {stats.map((s, i) => (
          <StatCard
            key={i}
            label={s.label}
            value={s.value}
            icon={s.icon}
            color={s.color}
            onClick={() => {
              setActiveView(s.id as ViewType);
              if (s.id === 'receitas') {
                setMostrarGrafico(true);
              }
            }}
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