'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Plus,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Building,
  Briefcase,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Sliders,
  Check,
  X,
  FileText,
  Wrench,
  ShoppingBag,
  Plane,
  History,
} from 'lucide-react';
import {
  validarCpf,
  validarCnpj,
  validarMatricula,
  formatarCpf,
  formatarCnpj,
  formatarMatricula,
} from '@/lib/validators';

interface Unidade {
  id: string;
  sigla: string;
  nome: string;
  campus: string;
  codigo?: string | null;
  email?: string | null;
  telefone?: string | null;
  predioNome?: string | null;
  ativo: boolean;
  _count?: { usuarios: number };
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  tipoUsuario: 'SERVIDOR_UERN' | 'FORNECEDOR_EXTERNO';
  status: 'PENDENTE_APROVACAO' | 'ATIVO' | 'BLOQUEADO';
  matricula?: string | null;
  telefone?: string | null;
  unidadeId?: string | null;
  unidade?: {
    id: string;
    sigla: string;
    nome: string;
    campus: string;
  } | null;
  cnpjEmpresa?: string | null;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  cargoPreposto?: string | null;
  perfilSgc?: string | null;
  perfilManut?: string | null;
  perfilPca?: string | null;
  permissoesPca?: any | null;
  perfilDiarias?: string | null;
  criadoEm: string;
  motivoBloqueio?: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'homologacao' | 'usuarios' | 'unidades'>('homologacao');

  // Estados gerais
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dados
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [contadores, setContadores] = useState<any>({});

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  // Modais
  const [modalHomologar, setModalHomologar] = useState<Usuario | null>(null);
  const [modalUsuario, setModalUsuario] = useState<{ open: boolean; modo: 'CRIAR' | 'EDITAR'; usuario?: Usuario | null }>({
    open: false,
    modo: 'CRIAR',
  });
  const [modalUnidade, setModalUnidade] = useState<{ open: boolean; modo: 'CRIAR' | 'EDITAR'; unidade?: Unidade | null }>({
    open: false,
    modo: 'CRIAR',
  });

  // Estados de formulário para Homologação
  const [homologarSgc, setHomologarSgc] = useState('');
  const [homologarManut, setHomologarManut] = useState('');
  const [homologarPca, setHomologarPca] = useState('');
  const [homologarPcaPerms, setHomologarPcaPerms] = useState({
    podeCriarDfd: true,
    podeEnviarDfd: true,
    podeVisualizarGeral: true,
  });
  const [homologarDiarias, setHomologarDiarias] = useState('');
  const [homologarUnidadeId, setHomologarUnidadeId] = useState('');
  const [submetendo, setSubmetendo] = useState(false);

  // Estados de formulário para Criar/Editar Unidade
  const [unidadeForm, setUnidadeForm] = useState({
    sigla: '',
    nome: '',
    campus: 'Mossoró',
    predioNome: '',
    email: '',
    telefone: '',
    ativo: true,
  });

  // Estados de formulário para Criar/Editar Usuário Manual
  const [usuarioForm, setUsuarioForm] = useState({
    tipoUsuario: 'SERVIDOR_UERN' as 'SERVIDOR_UERN' | 'FORNECEDOR_EXTERNO',
    nome: '',
    email: '',
    cpf: '',
    matricula: '',
    telefone: '',
    unidadeId: '',
    cnpjEmpresa: '',
    razaoSocial: '',
    cargoPreposto: '',
    perfilSgc: '',
    perfilManut: '',
    perfilPca: '',
    perfilDiarias: '',
    status: 'ATIVO' as 'ATIVO' | 'BLOQUEADO' | 'PENDENTE_APROVACAO',
    motivoBloqueio: '',
  });

  const carregarDados = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Carrega usuários
      const resUsers = await fetch(`/api/admin/usuarios?q=${encodeURIComponent(searchQuery)}&tipo=${filtroTipo}&status=${filtroStatus}`);
      if (!resUsers.ok) {
        if (resUsers.status === 403) {
          router.push('/hub');
          return;
        }
        throw new Error('Falha ao carregar usuários.');
      }
      const dataUsers = await resUsers.json();
      setUsuarios(dataUsers.usuarios || []);
      setContadores(dataUsers.contadores || {});

      // 2. Carrega unidades
      const resUnidades = await fetch('/api/admin/unidades');
      if (resUnidades.ok) {
        const dataUnidades = await resUnidades.json();
        setUnidades(dataUnidades.unidades || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar painel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [searchQuery, filtroTipo, filtroStatus]);

  // Abre modal de homologação
  const handleAbrirHomologar = (u: Usuario) => {
    setModalHomologar(u);
    setHomologarUnidadeId(u.unidadeId || '');
    if (u.tipoUsuario === 'SERVIDOR_UERN') {
      setHomologarSgc(u.perfilSgc || 'FISCAL_TECNICO');
      setHomologarManut(u.perfilManut || 'GESTOR_UNIDADE');
      setHomologarPca(u.perfilPca || 'UNIDADE');
      setHomologarDiarias(u.perfilDiarias || 'DEMANDANTE');
    } else {
      setHomologarSgc(u.perfilSgc || 'FORNECEDOR');
      setHomologarManut(u.perfilManut || 'EMPRESA');
      setHomologarPca('');
      setHomologarDiarias('');
    }
  };

  // Submete homologação
  const handleConfirmarHomologacao = async (decisao: 'APROVAR' | 'REJEITAR') => {
    if (!modalHomologar) return;
    setSubmetendo(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${modalHomologar.id}/homologar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisao,
          motivoRejeicao: decisao === 'REJEITAR' ? 'Documentação inconsistente ou perfil não reconhecido pela PROAD.' : undefined,
          unidadeId: homologarUnidadeId || undefined,
          perfilSgc: homologarSgc || null,
          perfilManut: homologarManut || null,
          perfilPca: homologarPca || null,
          permissoesPca: homologarPca ? homologarPcaPerms : null,
          perfilDiarias: homologarDiarias || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na homologação.');

      setSuccessMsg(data.message || 'Operação realizada com sucesso!');
      setModalHomologar(null);
      carregarDados();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmetendo(false);
    }
  };

  // Salvar unidade (Criar ou Editar)
  const handleSalvarUnidade = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmetendo(true);
    try {
      const url =
        modalUnidade.modo === 'CRIAR'
          ? '/api/admin/unidades'
          : `/api/admin/unidades/${modalUnidade.unidade?.id}`;
      const method = modalUnidade.modo === 'CRIAR' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unidadeForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar unidade.');

      setSuccessMsg(
        modalUnidade.modo === 'CRIAR'
          ? 'Unidade cadastrada com sucesso!'
          : 'Unidade atualizada com sucesso!'
      );
      setModalUnidade({ open: false, modo: 'CRIAR' });
      carregarDados();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmetendo(false);
    }
  };

  // Excluir unidade
  const handleExcluirUnidade = async (id: string, sigla: string) => {
    if (!confirm(`Deseja realmente excluir ou desativar a unidade "${sigla}"?`)) return;
    try {
      const res = await fetch(`/api/admin/unidades/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao remover unidade.');
      setSuccessMsg(data.message || 'Unidade removida com sucesso!');
      carregarDados();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Salvar usuário manual (Criar ou Editar)
  const handleSalvarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmetendo(true);
    try {
      const url =
        modalUsuario.modo === 'CRIAR'
          ? '/api/admin/usuarios'
          : `/api/admin/usuarios/${modalUsuario.usuario?.id}`;
      const method = modalUsuario.modo === 'CRIAR' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuarioForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar usuário.');

      setSuccessMsg('Usuário salvo com sucesso!');
      setModalUsuario({ open: false, modo: 'CRIAR' });
      carregarDados();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmetendo(false);
    }
  };

  // Excluir usuário
  const handleExcluirUsuario = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente remover o usuário "${nome}"? Esta ação é definitiva.`)) return;
    try {
      const res = await fetch(`/api/admin/usuarios/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao remover usuário.');
      setSuccessMsg(data.message || 'Usuário removido.');
      carregarDados();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const pendentes = usuarios.filter((u) => u.status === 'PENDENTE_APROVACAO');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-white/10 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/hub')}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
              title="Voltar ao Hub de Sistemas"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">PROAD • UERN</span>
                <span className="text-[10px] bg-red-500/10 text-red-300 px-2 py-0.5 rounded-full border border-red-500/20 font-semibold">
                  Painel de Governança
                </span>
              </div>
              <h1 className="text-sm font-bold text-white tracking-tight">
                Gestão de Identidades, Unidades e Acessos
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => router.push('/admin/auditoria')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-sm transition"
              title="Acessar painel central de logs e auditoria"
            >
              <History className="w-3.5 h-3.5" />
              <span>Auditoria Central</span>
            </button>
            <button
              type="button"
              onClick={carregarDados}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-200 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/hub')}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
            >
              Ir ao Hub
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
        {/* Alerts */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4" /></button>
          </div>
        )}
        {successMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Top KPIs Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10">
            <span className="text-[11px] text-slate-400 block font-medium">Total de Usuários</span>
            <span className="text-2xl font-black text-white mt-1 block">{contadores.total ?? 0}</span>
          </div>

          <div
            onClick={() => setActiveTab('homologacao')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              (contadores.pendentes ?? 0) > 0
                ? 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20'
                : 'bg-slate-900/80 border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-amber-300 font-semibold">Pendentes Homologação</span>
              {(contadores.pendentes ?? 0) > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </div>
            <span className="text-2xl font-black text-amber-400 mt-1 block">{contadores.pendentes ?? 0}</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10">
            <span className="text-[11px] text-slate-400 block font-medium">Servidores UERN</span>
            <span className="text-2xl font-black text-blue-400 mt-1 block">{contadores.servidores ?? 0}</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10">
            <span className="text-[11px] text-slate-400 block font-medium">Empresas / Fornec.</span>
            <span className="text-2xl font-black text-purple-400 mt-1 block">{contadores.fornecedores ?? 0}</span>
          </div>

          <div
            onClick={() => setActiveTab('unidades')}
            className="p-4 rounded-xl bg-slate-900/80 border border-white/10 cursor-pointer hover:border-amber-500/30 transition col-span-2 sm:col-span-1"
          >
            <span className="text-[11px] text-slate-400 block font-medium">Unidades UERN</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">{unidades.length}</span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex rounded-xl bg-slate-900 border border-white/10 p-1 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('homologacao')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
              activeTab === 'homologacao'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Fila de Homologação</span>
            {pendentes.length > 0 && (
              <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px]">
                {pendentes.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('usuarios')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
              activeTab === 'usuarios'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gestão Geral de Usuários</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('unidades')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
              activeTab === 'unidades'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Gestão de Unidades da UERN</span>
          </button>

          <button
            type="button"
            onClick={() => router.push('/admin/auditoria')}
            className="flex-1 py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition text-indigo-300 hover:text-white hover:bg-white/5"
          >
            <History className="w-4 h-4 text-indigo-400" />
            <span>Auditoria & Logs Centrais</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* ABA 1: FILA DE HOMOLOGAÇÃO (PENDENTES)                   */}
        {/* ======================================================== */}
        {activeTab === 'homologacao' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Solicitações de Acesso Pendentes</h2>
                <p className="text-xs text-slate-400">
                  Usuários e fornecedores que realizaram o pré-cadastro e aguardam liberação institucional e concessão de perfis.
                </p>
              </div>
            </div>

            {pendentes.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/5">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">Nenhuma solicitação pendente!</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Todos os pré-cadastros de servidores e empresas já foram homologados pela equipe da PROAD.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {pendentes.map((u) => (
                  <div
                    key={u.id}
                    className="p-5 rounded-2xl bg-slate-900/90 border border-amber-500/30 hover:border-amber-500/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.tipoUsuario === 'SERVIDOR_UERN'
                              ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                              : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {u.tipoUsuario === 'SERVIDOR_UERN' ? 'Servidor UERN' : 'Empresa / Fornecedor'}
                        </span>
                        <span className="text-xs text-slate-500">
                          Enviado em {new Date(u.criadoEm).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white">{u.nome}</h3>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-300">
                        <div>
                          <strong className="text-slate-400">E-mail: </strong>
                          <span className="text-amber-300">{u.email}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400">CPF: </strong>
                          <span>{u.cpf}</span>
                        </div>
                        {u.tipoUsuario === 'SERVIDOR_UERN' ? (
                          <>
                            <div>
                              <strong className="text-slate-400">Matrícula: </strong>
                              <span>{u.matricula || '—'}</span>
                            </div>
                            <div className="sm:col-span-3 text-slate-300 mt-1">
                              <strong className="text-slate-400">Unidade Solicitada: </strong>
                              <span className="text-emerald-300 font-semibold">
                                {u.unidade?.sigla} - {u.unidade?.nome} ({u.unidade?.campus})
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <strong className="text-slate-400">CNPJ: </strong>
                              <span>{u.cnpjEmpresa}</span>
                            </div>
                            <div className="sm:col-span-3 text-slate-300 mt-1">
                              <strong className="text-slate-400">Razão Social: </strong>
                              <span className="text-emerald-300 font-semibold">{u.razaoSocial}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAbrirHomologar(u)}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Homologar e Definir Perfis</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 2: GESTÃO GERAL DE USUÁRIOS                          */}
        {/* ======================================================== */}
        {activeTab === 'usuarios' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Todos os Usuários Cadastrados</h2>
                <p className="text-xs text-slate-400">
                  Gerencie permissões individuais em cada um dos sistemas da PROAD.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setUsuarioForm({
                    tipoUsuario: 'SERVIDOR_UERN',
                    nome: '',
                    email: '',
                    cpf: '',
                    matricula: '',
                    telefone: '',
                    unidadeId: unidades[0]?.id || '',
                    cnpjEmpresa: '',
                    razaoSocial: '',
                    cargoPreposto: '',
                    perfilSgc: 'FISCAL_TECNICO',
                    perfilManut: 'GESTOR_UNIDADE',
                    perfilPca: 'UNIDADE',
                    perfilDiarias: 'DEMANDANTE',
                    status: 'ATIVO',
                    motivoBloqueio: '',
                  });
                  setModalUsuario({ open: true, modo: 'CRIAR' });
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Usuário Manualmente</span>
              </button>
            </div>

            {/* Filtros e Busca */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome, e-mail, cpf, matrícula ou empresa..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="">Todos os Tipos</option>
                <option value="SERVIDOR_UERN">Servidores UERN (@uern.br)</option>
                <option value="FORNECEDOR_EXTERNO">Empresas / Fornecedores</option>
              </select>

              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="">Todos os Status</option>
                <option value="ATIVO">Ativos</option>
                <option value="PENDENTE_APROVACAO">Pendentes</option>
                <option value="BLOQUEADO">Bloqueados</option>
              </select>
            </div>

            {/* Tabela de Usuários */}
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-900/60">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-3.5">Usuário / Identidade</th>
                      <th className="p-3.5">Tipo & Lotação</th>
                      <th className="p-3.5">Perfis nos Sistemas</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {usuarios.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5 transition">
                        <td className="p-3.5">
                          <div className="font-bold text-white">{u.nome}</div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                          <div className="text-[10px] text-slate-500">CPF: {u.cpf}</div>
                        </td>

                        <td className="p-3.5">
                          <div className="text-slate-300">
                            {u.tipoUsuario === 'SERVIDOR_UERN' ? (
                              <>
                                <span className="font-semibold text-amber-300">
                                  {u.unidade?.sigla || 'Sem Unidade'}
                                </span>
                                <div className="text-[11px] text-slate-400">
                                  Matrícula: {u.matricula || '—'}
                                </div>
                              </>
                            ) : (
                              <>
                                <span className="font-semibold text-purple-300">
                                  {u.razaoSocial || u.nomeFantasia}
                                </span>
                                <div className="text-[11px] text-slate-400">CNPJ: {u.cnpjEmpresa}</div>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1">
                            {u.perfilSgc && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-500/30 text-[10px]">
                                SGC: {u.perfilSgc}
                              </span>
                            )}
                            {u.perfilManut && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-500/30 text-[10px]">
                                Manut: {u.perfilManut}
                              </span>
                            )}
                            {u.perfilPca && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-500/30 text-[10px]">
                                PCA: {u.perfilPca}
                              </span>
                            )}
                            {u.perfilDiarias && (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-200 border border-cyan-500/30 text-[10px]">
                                Diárias: {u.perfilDiarias}
                              </span>
                            )}
                            {!u.perfilSgc && !u.perfilManut && !u.perfilPca && !u.perfilDiarias && (
                              <span className="text-slate-500 text-[10px]">Nenhum perfil ativo</span>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.status === 'ATIVO'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                : u.status === 'PENDENTE_APROVACAO'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                : 'bg-red-500/10 text-red-300 border border-red-500/30'
                            }`}
                          >
                            {u.status === 'ATIVO'
                              ? 'Ativo'
                              : u.status === 'PENDENTE_APROVACAO'
                              ? 'Pendente'
                              : 'Bloqueado'}
                          </span>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {u.status === 'PENDENTE_APROVACAO' ? (
                              <button
                                type="button"
                                onClick={() => handleAbrirHomologar(u)}
                                className="p-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
                                title="Homologar Acesso"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setUsuarioForm({
                                    tipoUsuario: u.tipoUsuario,
                                    nome: u.nome,
                                    email: u.email,
                                    cpf: u.cpf,
                                    matricula: u.matricula || '',
                                    telefone: u.telefone || '',
                                    unidadeId: u.unidadeId || '',
                                    cnpjEmpresa: u.cnpjEmpresa || '',
                                    razaoSocial: u.razaoSocial || '',
                                    cargoPreposto: u.cargoPreposto || '',
                                    perfilSgc: u.perfilSgc || '',
                                    perfilManut: u.perfilManut || '',
                                    perfilPca: u.perfilPca || '',
                                    perfilDiarias: u.perfilDiarias || '',
                                    status: u.status,
                                    motivoBloqueio: u.motivoBloqueio || '',
                                  });
                                  setModalUsuario({ open: true, modo: 'EDITAR', usuario: u });
                                }}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition"
                                title="Editar Perfis e Dados"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleExcluirUsuario(u.id, u.nome)}
                              className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 transition"
                              title="Excluir Usuário"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 3: GESTÃO DE UNIDADES DA UERN                        */}
        {/* ======================================================== */}
        {activeTab === 'unidades' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Catálogo Oficial de Unidades da UERN</h2>
                <p className="text-xs text-slate-400">
                  Unidades acadêmicas, administrativas e pró-reitorias sincronizadas com SGC, PCA e Manutenção.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setUnidadeForm({
                    sigla: '',
                    nome: '',
                    campus: 'Mossoró',
                    predioNome: '',
                    email: '',
                    telefone: '',
                    ativo: true,
                  });
                  setModalUnidade({ open: true, modo: 'CRIAR' });
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Nova Unidade</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unidades.map((uni) => (
                <div
                  key={uni.id}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                    uni.ativo
                      ? 'bg-slate-900/80 border-white/10 hover:border-amber-500/40'
                      : 'bg-slate-950 border-red-500/30 opacity-70'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 font-extrabold text-xs border border-amber-500/30">
                        {uni.sigla}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Campus {uni.campus}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white mt-2">{uni.nome}</h4>
                    {uni.predioNome && (
                      <p className="text-xs text-slate-400 mt-1">
                        Localização: {uni.predioNome}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      <strong>{uni._count?.usuarios ?? 0}</strong> usuário(s)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setUnidadeForm({
                            sigla: uni.sigla,
                            nome: uni.nome,
                            campus: uni.campus,
                            predioNome: uni.predioNome || '',
                            email: uni.email || '',
                            telefone: uni.telefone || '',
                            ativo: uni.ativo,
                          });
                          setModalUnidade({ open: true, modo: 'EDITAR', unidade: uni });
                        }}
                        className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 transition"
                        title="Editar Unidade"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExcluirUnidade(uni.id, uni.sigla)}
                        className="p-1 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 transition"
                        title="Excluir ou Desativar Unidade"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL: HOMOLOGAÇÃO DE USUÁRIO PENDENTE                   */}
      {/* ======================================================== */}
      {modalHomologar && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Homologar Solicitação de Acesso</h3>
                  <p className="text-xs text-slate-400">Atribua os perfis de cada sistema para liberar o usuário.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalHomologar(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo do Solicitante */}
            <div className="bg-slate-950/80 rounded-xl p-3.5 border border-white/10 text-xs space-y-2 mb-5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400">Nome: </span>
                  <span className="text-white font-bold">{modalHomologar.nome}</span>
                </div>
                <div>
                  <span className="text-slate-400">E-mail: </span>
                  <span className="text-amber-300 font-medium">{modalHomologar.email}</span>
                </div>
                <div>
                  <span className="text-slate-400">CPF: </span>
                  <span className="text-white">{modalHomologar.cpf}</span>
                </div>
                <div>
                  <span className="text-slate-400">
                    {modalHomologar.tipoUsuario === 'SERVIDOR_UERN' ? 'Matrícula: ' : 'CNPJ: '}
                  </span>
                  <span className="text-white">
                    {modalHomologar.matricula || modalHomologar.cnpjEmpresa || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ajuste de Unidade (para servidores) */}
            {modalHomologar.tipoUsuario === 'SERVIDOR_UERN' && (
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirmar / Ajustar Unidade de Lotação na UERN:
                </label>
                <select
                  value={homologarUnidadeId}
                  onChange={(e) => setHomologarUnidadeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
                >
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.sigla} - {u.nome} ({u.campus})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Matriz de Perfis por Sistema */}
            <div className="space-y-4 mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-white/10 pb-1.5">
                Atribuição de Perfis por Sistema
              </h4>

              {/* 1. SGC */}
              <div className="p-3 rounded-xl bg-slate-950 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> SGC - Contratos e Terceirização
                  </span>
                </div>
                <select
                  value={homologarSgc}
                  onChange={(e) => setHomologarSgc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-blue-500"
                >
                  <option value="">Sem Acesso ao SGC</option>
                  {modalHomologar.tipoUsuario === 'SERVIDOR_UERN' ? (
                    <>
                      <option value="FISCAL_TECNICO">Fiscal Técnico do Contrato</option>
                      <option value="FISCAL_ADM">Fiscal Administrativo do Contrato</option>
                      <option value="FISCAL_SETORIAL">Fiscal Setorial da Unidade</option>
                      <option value="GESTOR">Gestor de Contratos</option>
                      <option value="GESTOR_ATA">Gestor de Ata de Registro de Preços</option>
                      <option value="ADMIN_PROAD">Administrador Geral PROAD</option>
                    </>
                  ) : (
                    <option value="FORNECEDOR">Fornecedor / Empresa Contratada</option>
                  )}
                </select>
              </div>

              {/* 2. Manutenção Predial */}
              <div className="p-3 rounded-xl bg-slate-950 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" /> Manutenção Predial & OS
                  </span>
                </div>
                <select
                  value={homologarManut}
                  onChange={(e) => setHomologarManut(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="">Sem Acesso à Manutenção</option>
                  {modalHomologar.tipoUsuario === 'SERVIDOR_UERN' ? (
                    <>
                      <option value="GESTOR_UNIDADE">Gestor de Unidade (Abre e Acompanha Chamados)</option>
                      <option value="DEMANDANTE">Demandante (Servidor Padrão)</option>
                      <option value="FISCAL_TECNICO">Fiscal Técnico de Manutenção</option>
                      <option value="FISCAL_ADM">Fiscal Administrativo</option>
                      <option value="TECNICO_SOBE">Técnico Operacional da SOBE</option>
                      <option value="GESTOR_CONTRATO">Gestor de Contrato de Manutenção</option>
                      <option value="ADMIN">Administrador Geral SOBE/PROAD</option>
                    </>
                  ) : (
                    <option value="EMPRESA">Empresa Contratada / Prestador de Serviços</option>
                  )}
                </select>
              </div>

              {/* 3. PCA (apenas servidores) */}
              {modalHomologar.tipoUsuario === 'SERVIDOR_UERN' && (
                <div className="p-3 rounded-xl bg-slate-950 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" /> PCA - Plano de Contratações Anual
                    </span>
                  </div>
                  <select
                    value={homologarPca}
                    onChange={(e) => setHomologarPca(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-purple-500"
                  >
                    <option value="">Sem Acesso ao PCA</option>
                    <option value="UNIDADE">Usuário de Unidade (Cria e Envia DFDs da Unidade)</option>
                    <option value="ADMIN">Administrador Geral do PCA (PROAD)</option>
                  </select>

                  {homologarPca === 'UNIDADE' && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex gap-4 text-[11px] text-slate-300">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={homologarPcaPerms.podeCriarDfd}
                          onChange={(e) =>
                            setHomologarPcaPerms({ ...homologarPcaPerms, podeCriarDfd: e.target.checked })
                          }
                        />
                        <span>Pode Elaborar DFD</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={homologarPcaPerms.podeEnviarDfd}
                          onChange={(e) =>
                            setHomologarPcaPerms({ ...homologarPcaPerms, podeEnviarDfd: e.target.checked })
                          }
                        />
                        <span>Pode Enviar para PROAD</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Diárias e Passagens (apenas servidores) */}
              {modalHomologar.tipoUsuario === 'SERVIDOR_UERN' && (
                <div className="p-3 rounded-xl bg-slate-950 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                      <Plane className="w-3.5 h-3.5" /> Diárias e Passagens
                    </span>
                  </div>
                  <select
                    value={homologarDiarias}
                    onChange={(e) => setHomologarDiarias(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-cyan-500"
                  >
                    <option value="">Sem Acesso a Diárias</option>
                    <option value="DEMANDANTE">Demandante (Solicita Diárias e Viagens)</option>
                    <option value="FISCAL">Fiscal / Conferente de Prestação de Contas</option>
                    <option value="APROVADOR">Aprovador / Ordenador de Despesas</option>
                    <option value="ADMIN">Administrador de Diárias (PROAD)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Ações do Modal */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => handleConfirmarHomologacao('REJEITAR')}
                disabled={submetendo}
                className="px-4 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 text-xs font-semibold transition"
              >
                Indeferir / Rejeitar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalHomologar(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmarHomologacao('APROVAR')}
                  disabled={submetendo}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition"
                >
                  <Check className="w-4 h-4" />
                  <span>{submetendo ? 'Homologando...' : 'Aprovar e Liberar Acessos'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CRIAR / EDITAR UNIDADE                            */}
      {/* ======================================================== */}
      {modalUnidade.open && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-base font-bold text-white">
                {modalUnidade.modo === 'CRIAR' ? 'Cadastrar Nova Unidade' : `Editar Unidade: ${unidadeForm.sigla}`}
              </h3>
              <button onClick={() => setModalUnidade({ open: false, modo: 'CRIAR' })}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSalvarUnidade} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Sigla Oficial *</label>
                  <input
                    type="text"
                    required
                    value={unidadeForm.sigla}
                    onChange={(e) => setUnidadeForm({ ...unidadeForm, sigla: e.target.value.toUpperCase() })}
                    placeholder="Ex: FAFIC, DINF"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-500 uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Campus *</label>
                  <select
                    value={unidadeForm.campus}
                    onChange={(e) => setUnidadeForm({ ...unidadeForm, campus: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Mossoró">Mossoró (Campus Central)</option>
                    <option value="Assú">Assú</option>
                    <option value="Caicó">Caicó</option>
                    <option value="Patu">Patu</option>
                    <option value="Pau dos Ferros">Pau dos Ferros</option>
                    <option value="Natal">Natal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nome Completo por Extenso *</label>
                <input
                  type="text"
                  required
                  value={unidadeForm.nome}
                  onChange={(e) => setUnidadeForm({ ...unidadeForm, nome: e.target.value })}
                  placeholder="Ex: Faculdade de Filosofia e Ciências Sociais"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Prédio / Bloco / Setor</label>
                <input
                  type="text"
                  value={unidadeForm.predioNome}
                  onChange={(e) => setUnidadeForm({ ...unidadeForm, predioNome: e.target.value })}
                  placeholder="Ex: Complexo Cultural, Bloco B"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">E-mail Institucional</label>
                  <input
                    type="email"
                    value={unidadeForm.email}
                    onChange={(e) => setUnidadeForm({ ...unidadeForm, email: e.target.value })}
                    placeholder="setor@uern.br"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Telefone / Ramal</label>
                  <input
                    type="text"
                    value={unidadeForm.telefone}
                    onChange={(e) => setUnidadeForm({ ...unidadeForm, telefone: e.target.value })}
                    placeholder="(84) 3315-0000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="unidadeAtiva"
                  checked={unidadeForm.ativo}
                  onChange={(e) => setUnidadeForm({ ...unidadeForm, ativo: e.target.checked })}
                />
                <label htmlFor="unidadeAtiva" className="text-xs text-slate-300 cursor-pointer">
                  Unidade ativa no sistema
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalUnidade({ open: false, modo: 'CRIAR' })}
                  className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submetendo}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                >
                  {submetendo ? 'Salvando...' : 'Salvar Unidade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CRIAR / EDITAR USUÁRIO MANUAL                     */}
      {/* ======================================================== */}
      {modalUsuario.open && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-base font-bold text-white">
                {modalUsuario.modo === 'CRIAR' ? 'Cadastrar Usuário Manualmente' : `Editar: ${usuarioForm.nome}`}
              </h3>
              <button onClick={() => setModalUsuario({ open: false, modo: 'CRIAR' })}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSalvarUsuario} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Usuário *</label>
                  <select
                    value={usuarioForm.tipoUsuario}
                    onChange={(e: any) => setUsuarioForm({ ...usuarioForm, tipoUsuario: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
                  >
                    <option value="SERVIDOR_UERN">Servidor UERN</option>
                    <option value="FORNECEDOR_EXTERNO">Fornecedor / Empresa Externa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status da Conta *</label>
                  <select
                    value={usuarioForm.status}
                    onChange={(e: any) => setUsuarioForm({ ...usuarioForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
                  >
                    <option value="ATIVO">Ativo</option>
                    <option value="BLOQUEADO">Bloqueado / Suspenso</option>
                    <option value="PENDENTE_APROVACAO">Pendente</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={usuarioForm.nome}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, nome: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">E-mail *</label>
                  <input
                    type="email"
                    required
                    value={usuarioForm.email}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">CPF *</label>
                  <input
                    type="text"
                    required
                    value={usuarioForm.cpf}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, cpf: formatarCpf(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={usuarioForm.telefone}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, telefone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {usuarioForm.tipoUsuario === 'SERVIDOR_UERN' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Matrícula (xxxxxx-x)</label>
                    <input
                      type="text"
                      value={usuarioForm.matricula}
                      onChange={(e) => setUsuarioForm({ ...usuarioForm, matricula: formatarMatricula(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Unidade UERN</label>
                    <select
                      value={usuarioForm.unidadeId}
                      onChange={(e) => setUsuarioForm({ ...usuarioForm, unidadeId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
                    >
                      <option value="">Selecione...</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.sigla} - {u.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">CNPJ da Empresa</label>
                    <input
                      type="text"
                      value={usuarioForm.cnpjEmpresa}
                      onChange={(e) => setUsuarioForm({ ...usuarioForm, cnpjEmpresa: formatarCnpj(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Razão Social</label>
                    <input
                      type="text"
                      value={usuarioForm.razaoSocial}
                      onChange={(e) => setUsuarioForm({ ...usuarioForm, razaoSocial: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Matriz de Perfis */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                  Perfis de Acesso aos Sistemas
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Perfil SGC</label>
                    <select
                      value={usuarioForm.perfilSgc}
                      onChange={(e) => setUsuarioForm({ ...usuarioForm, perfilSgc: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white outline-none"
                    >
                      <option value="">Nenhum</option>
                      <option value="ADMIN_PROAD">ADMIN_PROAD</option>
                      <option value="GESTOR">GESTOR</option>
                      <option value="FISCAL_ADM">FISCAL_ADM</option>
                      <option value="FISCAL_TECNICO">FISCAL_TECNICO</option>
                      <option value="FISCAL_SETORIAL">FISCAL_SETORIAL</option>
                      <option value="FORNECEDOR">FORNECEDOR</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Perfil Manutenção</label>
                    <select
                      value={usuarioForm.perfilManut}
                      onChange={(e) => setUsuarioForm({ ...usuarioForm, perfilManut: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white outline-none"
                    >
                      <option value="">Nenhum</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="GESTOR_UNIDADE">GESTOR_UNIDADE</option>
                      <option value="FISCAL_TECNICO">FISCAL_TECNICO</option>
                      <option value="DEMANDANTE">DEMANDANTE</option>
                      <option value="TECNICO_SOBE">TECNICO_SOBE</option>
                      <option value="EMPRESA">EMPRESA</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Perfil PCA</label>
                    <select
                      value={usuarioForm.perfilPca}
                      onChange={(e) => setUsuarioForm({ ...usuarioForm, perfilPca: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white outline-none"
                    >
                      <option value="">Nenhum</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="UNIDADE">UNIDADE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Perfil Diárias</label>
                    <select
                      value={usuarioForm.perfilDiarias}
                      onChange={(e) => setUsuarioForm({ ...usuarioForm, perfilDiarias: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white outline-none"
                    >
                      <option value="">Nenhum</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="DEMANDANTE">DEMANDANTE</option>
                      <option value="FISCAL">FISCAL</option>
                      <option value="APROVADOR">APROVADOR</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalUsuario({ open: false, modo: 'CRIAR' })}
                  className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submetendo}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                >
                  {submetendo ? 'Salvando...' : 'Salvar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950 px-6 py-4 text-center text-xs text-slate-400">
        © 2026 Universidade do Estado do Rio Grande do Norte - UERN • Pró-Reitoria de Administração (PROAD)
      </footer>
    </div>
  );
}
