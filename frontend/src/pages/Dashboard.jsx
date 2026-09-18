import { useEffect, useMemo, useState } from 'react';
import api from '../services/api.jsx';

const periodos = [
  { key: 'dia', label: 'Dia' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mês' },
];

const statusOptions = [
  { value: 'todos', label: 'Todos' },
  { value: 'pago', label: 'Pago' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'cancelado', label: 'Cancelado' },
];

const formatCurrency = (valor) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0));

const formatDate = (data) =>
  new Date(data).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const getStatusMeta = (status) => {
  const map = {
    pago: { label: 'Pago', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)' },
    pendente: { label: 'Pendente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    parcial: { label: 'Pendente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    cancelado: { label: 'Cancelado', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)' },
  };

  return map[status] || { label: '—', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' };
};

export default function Dashboard() {
  const [periodo, setPeriodo] = useState('semana');
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [clientes, setClientes] = useState([]);
  const [dados, setDados] = useState({
    kpis: { total: 0, pedidos: 0, ticketMedio: 0, itens: 0 },
    grafico: { labels: [], valores: [] },
    pedidos: [],
  });
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregarClientes = async () => {
      try {
        const { data } = await api.get('/customers');
        setClientes(data || []);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
      }
    };

    carregarClientes();
  }, []);

  useEffect(() => {
    const carregarDashboard = async () => {
      setCarregando(true);
      try {
        const params = new URLSearchParams({ periodo });

        if (clienteFiltro) params.set('cliente', clienteFiltro);
        if (statusFiltro && statusFiltro !== 'todos') params.set('status', statusFiltro);

        const { data } = await api.get(`/dashboard?${params.toString()}`);
        setDados(data || { kpis: { total: 0, pedidos: 0, ticketMedio: 0, itens: 0 }, grafico: { labels: [], valores: [] }, pedidos: [] });
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setCarregando(false);
      }
    };

    carregarDashboard();
  }, [periodo, clienteFiltro, statusFiltro]);

  const maxValorGrafico = useMemo(() => Math.max(...(dados.grafico?.valores || [0]), 1), [dados.grafico]);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <header style={{ display: 'grid', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>📊 Dashboard Simplificado</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>PDV Mercado Nascimento</p>
      </header>

      <section className="panel-card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {periodos.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setPeriodo(item.key)}
                className={periodo === item.key ? 'primary-button' : 'secondary-button'}
                style={{
                  minHeight: 38,
                  padding: '8px 14px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={clienteFiltro}
              onChange={(event) => setClienteFiltro(event.target.value)}
              style={{ maxWidth: 220, minWidth: 160 }}
            >
              <option value="">Todos os clientes</option>
              {clientes.map((cliente) => (
                <option key={cliente._id} value={cliente._id}>{cliente.nome}</option>
              ))}
            </select>

            <select
              value={statusFiltro}
              onChange={(event) => setStatusFiltro(event.target.value)}
              style={{ maxWidth: 170, minWidth: 150 }}
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {carregando ? (
        <div className="panel-card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
          Carregando dashboard...
        </div>
      ) : (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <div className="panel-card" style={{ padding: 16 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 8 }}>Total Vendas</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-primary)' }}>{formatCurrency(dados.kpis.total)}</div>
            </div>

            <div className="panel-card" style={{ padding: 16 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 8 }}>Nº Pedidos</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{dados.kpis.pedidos}</div>
            </div>

            <div className="panel-card" style={{ padding: 16 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 8 }}>Ticket Médio</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#f39c12' }}>{formatCurrency(dados.kpis.ticketMedio)}</div>
            </div>

            <div className="panel-card" style={{ padding: 16 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 8 }}>Itens Vendidos</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{dados.kpis.itens}</div>
            </div>
          </section>

          <section className="panel-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, color: 'var(--text-primary)' }}>Vendas no período</div>
            <div style={{ display: 'flex', alignItems: 'end', gap: 10, height: 200, paddingTop: 8 }}>
              {(dados.grafico?.labels || []).map((label, index) => {
                const valor = Number(dados.grafico?.valores?.[index] || 0);
                const altura = Math.max((valor / maxValorGrafico) * 100, valor > 0 ? 8 : 0);

                return (
                  <div key={`${label}-${index}`} style={{ flex: 1, minWidth: 0, display: 'grid', justifyItems: 'center', gap: 6 }}>
                    <div style={{ width: '100%', height: 140, display: 'flex', alignItems: 'end', justifyContent: 'center' }}>
                      <div
                        title={`${label}: ${formatCurrency(valor)}`}
                        style={{
                          width: '100%',
                          maxWidth: 42,
                          height: `${altura}%`,
                          minHeight: valor > 0 ? 12 : 0,
                          borderRadius: '12px 12px 0 0',
                          background: 'linear-gradient(180deg, #f39c12 0%, #27ae60 100%)',
                          boxShadow: '0 6px 12px rgba(39, 174, 96, 0.12)',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 18px 8px', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Pedidos recentes</div>
            <div className="table-shell" style={{ paddingBottom: 16 }}>
              <table className="data-table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th>Nº</th>
                    <th>Cliente</th>
                    <th>Data</th>
                    <th>Itens</th>
                    <th>Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(dados.pedidos || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>
                        Nenhum pedido encontrado
                      </td>
                    </tr>
                  ) : (
                    (dados.pedidos || []).map((pedido) => {
                      const meta = getStatusMeta(pedido.status);

                      return (
                        <tr key={pedido._id}>
                          <td style={{ fontWeight: 700 }}>#{pedido.numero}</td>
                          <td>{pedido.clienteNome || 'Cliente não identificado'}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{formatDate(pedido.createdAt)}</td>
                          <td>{pedido.itens?.length || 0}</td>
                          <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCurrency(pedido.total)}</td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                borderRadius: 999,
                                padding: '5px 10px',
                                fontSize: 11,
                                fontWeight: 700,
                                color: meta.color,
                                background: meta.bg,
                              }}
                            >
                              {meta.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
