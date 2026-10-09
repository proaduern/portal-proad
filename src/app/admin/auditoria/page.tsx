'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Filter,
  FileText,
  User,
  Clock,
  Globe,
  Monitor,
  Eye,
  CheckCircle2,
  AlertTriangle,
  FileDiff,
  Download,
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  History,
  X,
} from 'lucide-react';

interface LogAuditoria {
  id: string;
  sistema: string;
  acao: string;
  entidade: string | null;
  entidadeId: string | null;
  entidadeNome: string | null;
  descricao: string;
  usuarioId: string | null;
  usuarioNome: string | null;
  usuarioEmail: string;
  usuarioRole: string | null;
  unidadeSigla: string | null;
  dadosAnteriores: any | null;
  dadosNovos: any | null;
  camposAlterados: string[];
  detalhes?: any | null;
  ip: string | null;
  userAgent: string | null;
  rota: string | null;
  criadoEm: string;
}

interface Metricas {
  totalGeral: number;
  hojeCount: number;
  contagemPorSistema: Record<string, number>;
}

export default function AuditoriaCentralPage() {
  const router = useRouter();

  // Estados principais
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [metricas, setMetricas] = useState<Metricas>({
    totalGeral: 0,
    hojeCount: 0,
    contagemPorSistema: {},
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtros
  const [sistemaFiltro, setSistemaFiltro] = useState<string>('TODOS');
  const [acaoFiltro, setAcaoFiltro] = useState<string>('TODAS');
  const [busca, setBusca] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [pagina, setPagina] = useState<number>(1);
  const [totalPaginas, setTotalPaginas] = useState<number>(1);
  const [totalItens, setTotalItens] = useState<number>(0);

  // Modal de Detalhes / Diff
  const [logSelecionado, setLogSelecionado] = useState<LogAuditoria | null>(null);
  const [abaModal, setAbaModal] = useState<'diff' | 'raw' | 'contexto'>('diff');

  // Carregar dados
  const carregarLogs = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (sistemaFiltro !== 'TODOS') params.append('sistema', sistemaFiltro);
      if (acaoFiltro !== 'TODAS') params.append('acao', acaoFiltro);
      if (busca.trim()) params.append('q', busca.trim());
      if (dataInicio) params.append('dataInicio', dataInicio);
      if (dataFim) params.append('dataFim', dataFim);
      params.append('page', String(pagina));
      params.append('pageSize', '20');

      const res = await fetch(`/api/auditoria?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          setErrorMsg('Acesso restrito a administradores e auditores da PROAD.');
          return;
        }
        throw new Error('Erro ao buscar registros de auditoria');
      }

      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPaginas(data.pagination?.totalPages || 1);
      setTotalItens(data.pagination?.total || 0);
      if (data.metricas) {
        setMetricas(data.metricas);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Falha na conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarLogs();
  }, [sistemaFiltro, acaoFiltro, pagina]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setPagina(1);
    carregarLogs();
  };

  const limparFiltros = () => {
    setSistemaFiltro('TODOS');
    setAcaoFiltro('TODAS');
    setBusca('');
    setDataInicio('');
    setDataFim('');
    setPagina(1);
  };

  // Cores de badge por sistema
  const getBadgeSistema = (s: string) => {
    switch (s?.toUpperCase()) {
      case 'SGC':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PCA':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MANUTENCAO':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DIARIAS':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'PORTAL':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getNomeSistema = (s: string) => {
    switch (s?.toUpperCase()) {
      case 'SGC':
        return 'SGC - Contratos';
      case 'PCA':
        return 'PCA - Compras';
      case 'MANUTENCAO':
        return 'Manutenção - OS';
      case 'DIARIAS':
        return 'Diárias & Viagens';
      case 'PORTAL':
      default:
        return 'Portal Central';
    }
  };

  const getBadgeAcao = (acao: string) => {
    switch (acao?.toUpperCase()) {
      case 'CRIACAO':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'EDICAO':
      case 'ALTERACAO':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'EXCLUSAO':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'ADITIVO':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'MEDICAO':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'APROVACAO':
      case 'HOMOLOGACAO':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'BLOQUEIO':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatarData = (iso: string) => {
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'medium',
      }).format(d);
    } catch {
      return iso;
    }
  };

  // Comparação de campos para a tela de diff
  const diffCampos = useMemo(() => {
    if (!logSelecionado) return [];
    const antigo = logSelecionado.dadosAnteriores || {};
    const novo = logSelecionado.dadosNovos || {};

    const todasChaves = Array.from(
      new Set([
        ...(logSelecionado.camposAlterados || []),
        ...Object.keys(antigo),
        ...Object.keys(novo),
      ])
    ).filter((k) => !['atualizadoEm', 'updatedAt'].includes(k));

    return todasChaves.map((chave) => {
      const valAntigo = antigo[chave];
      const valNovo = novo[chave];
      const divergente = JSON.stringify(valAntigo) !== JSON.stringify(valNovo);

      return {
        chave,
        antigo: valAntigo,
        novo: valNovo,
        divergente,
      };
    });
  }, [logSelecionado]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin')}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              title="Voltar ao Painel Admin"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
                  Auditoria & Eventos Centrais
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                    Ecosistema PROAD UERN
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  Rastreabilidade de alterações: quem fez, o quê, quando e onde em todos os subsistemas
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={carregarLogs}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner de Mensagem de Erro */}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="flex-1 font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Cards de Métricas e Subsistemas */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="col-span-2 md:col-span-1 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <History className="w-3.5 h-3.5 text-indigo-600" />
              Total de Eventos
            </div>
            <div className="text-2xl font-bold text-slate-900">{metricas.totalGeral.toLocaleString('pt-BR')}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
              +{metricas.hojeCount} hoje
            </div>
          </div>

          {[
            { id: 'SGC', label: 'SGC Contratos', count: metricas.contagemPorSistema['SGC'] || 0, color: 'border-blue-200 bg-blue-50/40 text-blue-800' },
            { id: 'PCA', label: 'PCA Compras', count: metricas.contagemPorSistema['PCA'] || 0, color: 'border-amber-200 bg-amber-50/40 text-amber-800' },
            { id: 'MANUTENCAO', label: 'Manutenção', count: metricas.contagemPorSistema['MANUTENCAO'] || 0, color: 'border-emerald-200 bg-emerald-50/40 text-emerald-800' },
            { id: 'DIARIAS', label: 'Diárias', count: metricas.contagemPorSistema['DIARIAS'] || 0, color: 'border-purple-200 bg-purple-50/40 text-purple-800' },
            { id: 'PORTAL', label: 'Portal Central', count: metricas.contagemPorSistema['PORTAL'] || 0, color: 'border-slate-200 bg-slate-50 text-slate-800' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSistemaFiltro(sistemaFiltro === item.id ? 'TODOS' : item.id);
                setPagina(1);
              }}
              className={`p-3.5 rounded-xl border text-left transition relative cursor-pointer ${
                sistemaFiltro === item.id
                  ? 'ring-2 ring-indigo-600 bg-indigo-50/50 border-indigo-300'
                  : 'bg-white hover:bg-slate-50/80 border-slate-200'
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-500 truncate">{item.label}</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">{item.count.toLocaleString('pt-BR')}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {sistemaFiltro === item.id ? 'Filtrando ativo' : 'Clique para filtrar'}
              </div>
            </button>
          ))}
        </div>

        {/* Filtros e Barra de Pesquisa */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <form onSubmit={handleBuscar} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Input de Busca */}
            <div className="md:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por usuário, e-mail, contrato, OS, ID..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filtro Sistema */}
            <div className="md:col-span-2">
              <select
                value={sistemaFiltro}
                onChange={(e) => {
                  setSistemaFiltro(e.target.value);
                  setPagina(1);
                }}
                className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="TODOS">Todos os Subsistemas</option>
                <option value="SGC">SGC - Contratos</option>
                <option value="PCA">PCA - Compras</option>
                <option value="MANUTENCAO">Manutenção - OS</option>
                <option value="DIARIAS">Diárias & Viagens</option>
                <option value="PORTAL">Portal PROAD</option>
              </select>
            </div>

            {/* Filtro Ação */}
            <div className="md:col-span-2">
              <select
                value={acaoFiltro}
                onChange={(e) => {
                  setAcaoFiltro(e.target.value);
                  setPagina(1);
                }}
                className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="TODAS">Todas as Ações</option>
                <option value="CRIACAO">Criação / Cadastro</option>
                <option value="EDICAO">Edição / Alteração</option>
                <option value="EXCLUSAO">Exclusão</option>
                <option value="ADITIVO">Aditivo Contratual</option>
                <option value="MEDICAO">Medição / Ateste</option>
                <option value="HOMOLOGACAO">Homologação / Acesso</option>
                <option value="BLOQUEIO">Bloqueio / Revogação</option>
              </select>
            </div>

            {/* Data Início */}
            <div className="md:col-span-2 flex items-center gap-1.5">
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title="Data inicial"
              />
            </div>

            {/* Botões */}
            <div className="md:col-span-2 flex items-center gap-1.5">
              <button
                type="submit"
                className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
              >
                Filtrar
              </button>
              <button
                type="button"
                onClick={limparFiltros}
                className="px-2.5 py-2 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                title="Limpar filtros"
              >
                Limpar
              </button>
            </div>
          </form>
        </div>

        {/* Tabela de Logs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-3">Subsistema</th>
                  <th className="py-3 px-3">Ação</th>
                  <th className="py-3 px-4">Entidade / Objeto</th>
                  <th className="py-3 px-4">Quem Fez</th>
                  <th className="py-3 px-3">Origem (IP / Rota)</th>
                  <th className="py-3 px-3 text-center">Auditar Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                      Carregando eventos de auditoria...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      Nenhum evento registrado encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const temDiff =
                      (log.camposAlterados && log.camposAlterados.length > 0) ||
                      Boolean(log.dadosAnteriores || log.dadosNovos);

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition group">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                          {formatarData(log.criadoEm)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getBadgeSistema(
                              log.sistema
                            )}`}
                          >
                            {getNomeSistema(log.sistema)}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getBadgeAcao(
                              log.acao
                            )}`}
                          >
                            {log.acao}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 truncate max-w-xs">
                            {log.entidadeNome || log.entidade || 'Geral'}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {log.descricao}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 flex items-center gap-1.5">
                            <span className="truncate">{log.usuarioNome || 'Operador'}</span>
                            {log.unidadeSigla && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                                {log.unidadeSigla}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono truncate">{log.usuarioEmail}</div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-[11px] text-slate-500 font-mono">
                          <div className="truncate max-w-[140px]" title={log.rota || ''}>
                            {log.rota || '-'}
                          </div>
                          <div className="text-[10px] text-slate-400">{log.ip || '127.0.0.1'}</div>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              setLogSelecionado(log);
                              setAbaModal('diff');
                            }}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 mx-auto transition border shadow-2xs ${
                              temDiff
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <FileDiff className="w-3.5 h-3.5" />
                            {temDiff ? 'Ver Diff' : 'Detalhes'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              Mostrando <span className="font-medium text-slate-700">{logs.length}</span> de{' '}
              <span className="font-medium text-slate-700">{totalItens}</span> registros
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagina <= 1 || loading}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="p-1.5 border border-slate-300 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium text-slate-700">
                Página {pagina} de {totalPaginas}
              </span>
              <button
                disabled={pagina >= totalPaginas || loading}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                className="p-1.5 border border-slate-300 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Detalhes & Comparação Visual (Diff) */}
      {logSelecionado && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <FileDiff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Conferência de Auditoria & Divergência
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{getNomeSistema(logSelecionado.sistema)}</span>
                    <span>•</span>
                    <span className="font-mono">{formatarData(logSelecionado.criadoEm)}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLogSelecionado(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-nav Tabs */}
            <div className="px-6 pt-3 bg-white border-b border-slate-200 flex items-center gap-4 text-xs font-semibold">
              <button
                onClick={() => setAbaModal('diff')}
                className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition ${
                  abaModal === 'diff'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileDiff className="w-4 h-4" />
                Comparação de Campos (Diff)
                {logSelecionado.camposAlterados?.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-[10px]">
                    {logSelecionado.camposAlterados.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setAbaModal('contexto')}
                className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition ${
                  abaModal === 'contexto'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Globe className="w-4 h-4" />
                Rastreabilidade Técnica (Quem / Onde)
              </button>
              <button
                onClick={() => setAbaModal('raw')}
                className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition ${
                  abaModal === 'raw'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                JSON Bruto dos Dados
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {abaModal === 'diff' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="font-semibold text-slate-900">
                      {logSelecionado.entidadeNome || logSelecionado.entidade}
                    </div>
                    <div className="text-slate-600">{logSelecionado.descricao}</div>
                  </div>

                  {diffCampos.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Nenhum snapshot comparativo estruturado disponível para este evento (ex: criação inicial ou exclusão pura).
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                            <th className="py-2.5 px-3 w-1/4">Campo</th>
                            <th className="py-2.5 px-3 w-3/8 text-red-700 bg-red-50/50">Valor Anterior</th>
                            <th className="py-2.5 px-3 w-3/8 text-emerald-700 bg-emerald-50/50">Valor Novo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {diffCampos.map((c) => (
                            <tr
                              key={c.chave}
                              className={c.divergente ? 'bg-amber-50/40 font-semibold' : 'hover:bg-slate-50/50'}
                            >
                              <td className="py-2.5 px-3 text-slate-800 font-sans font-medium">
                                <span className="flex items-center gap-1.5">
                                  {c.divergente && (
                                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                  )}
                                  {c.chave}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-red-700 bg-red-50/30 whitespace-pre-wrap break-all">
                                {c.antigo === undefined || c.antigo === null
                                  ? '<vazio>'
                                  : typeof c.antigo === 'object'
                                  ? JSON.stringify(c.antigo, null, 2)
                                  : String(c.antigo)}
                              </td>
                              <td className="py-2.5 px-3 text-emerald-700 bg-emerald-50/30 whitespace-pre-wrap break-all">
                                {c.novo === undefined || c.novo === null
                                  ? '<vazio>'
                                  : typeof c.novo === 'object'
                                  ? JSON.stringify(c.novo, null, 2)
                                  : String(c.novo)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {abaModal === 'contexto' && (
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-indigo-600" />
                      Quem Executou
                    </h4>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Nome Completo</span>
                      <span className="font-semibold text-slate-800">{logSelecionado.usuarioNome || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">E-mail Institucional</span>
                      <span className="font-mono text-slate-800">{logSelecionado.usuarioEmail}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Perfil / Papel</span>
                      <span className="font-medium text-slate-800">{logSelecionado.usuarioRole || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Lotação / Unidade</span>
                      <span className="font-medium text-slate-800">{logSelecionado.unidadeSigla || '-'}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-indigo-600" />
                      Onde e Como
                    </h4>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Endereço IP</span>
                      <span className="font-mono text-slate-800">{logSelecionado.ip || '127.0.0.1'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Rota / Endpoint</span>
                      <span className="font-mono text-slate-800">{logSelecionado.rota || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">User-Agent / Navegador</span>
                      <span className="font-mono text-[10px] text-slate-600 break-all">{logSelecionado.userAgent || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">ID do Registro no Subsistema</span>
                      <span className="font-mono text-slate-800">{logSelecionado.entidadeId || '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              {abaModal === 'raw' && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-600">Payload Completo do Evento (JSON):</div>
                  <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-96">
                    {JSON.stringify(logSelecionado, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Hash de Auditoria: {logSelecionado.id}
              </span>
              <button
                onClick={() => setLogSelecionado(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition shadow-2xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
