'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  FileText,
  Wrench,
  ShoppingBag,
  Plane,
  Snowflake,
  LogOut,
  ChevronRight,
  Sparkles,
  Lock,
  Settings,
  GraduationCap,
  ShieldCheck,
  AlertTriangle,
  ClipboardCheck,
  DollarSign,
  BookOpen,
  Scale,
} from 'lucide-react';
import Link from 'next/link';

type TargetSystemHub =
  | 'SGC'
  | 'MANUTENCAO'
  | 'PCA'
  | 'ETP_RISCOS'
  | 'PESQUISA_PRECOS'
  | 'TERMO_REFERENCIA'
  | 'LICITACOES_MINUTAS'
  | 'DIARIAS'
  | 'CLIMATIZACAO';

function hasSubsistemaAccess(
  perfilPca: string | null | undefined,
  isAdminGeral: boolean,
  target: string
): string | null {
  if (isAdminGeral || perfilPca?.toUpperCase().includes('ADMIN')) {
    return 'ADMIN';
  }
  const roles = (perfilPca || '')
    .toUpperCase()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (roles.length === 0) return null;

  if (target === 'PCA') {
    const match = roles.find((r) =>
      ['UNIDADE', 'DEMANDANTE', 'DIRETOR_UNIDADE', 'SETOR_INTERNO', 'SERVIDOR_UNIDADE', 'PCA'].includes(r)
    );
    if (match) return match;
  } else if (target === 'ETP_RISCOS') {
    if (roles.some((r) => ['SETOR_TECNICO', 'ETP', 'ETP_RISCOS'].includes(r))) {
      return 'SETOR_TECNICO';
    }
  } else if (target === 'PESQUISA_PRECOS') {
    if (roles.some((r) => ['PESQUISA_PRECOS', 'PESQUISA'].includes(r))) {
      return 'PESQUISA_PRECOS';
    }
  } else if (target === 'TERMO_REFERENCIA') {
    if (roles.some((r) => ['PLANEJAMENTO', 'TERMO_REFERENCIA', 'TR'].includes(r))) {
      return 'PLANEJAMENTO';
    }
  } else if (target === 'LICITACOES_MINUTAS') {
    const match = roles.find((r) =>
      ['LICITACOES', 'AGENTE_CONTRATACAO', 'GESTOR_ATA', 'CONTRATOS', 'MINUTAS'].includes(r)
    );
    if (match) return match;
  }

  return null;
}

interface UserData {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  matricula?: string | null;
  tipoUsuario: 'SERVIDOR_UERN' | 'FORNECEDOR_EXTERNO';
  status: 'PENDENTE_APROVACAO' | 'DEVOLVIDO_CORRECAO' | 'ATIVO' | 'BLOQUEADO';
  unidadeSigla?: string | null;
  unidadeNome?: string | null;
  unidadeCampus?: string | null;
  cnpjEmpresa?: string | null;
  razaoSocial?: string | null;
  perfilSgc?: string | null;
  perfilManut?: string | null;
  perfilPca?: string | null;
  perfilDiarias?: string | null;
  perfilClimatizacao?: string | null;
  isAdminGeral: boolean;
}

export default function HubPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [launchingSystem, setLaunchingSystem] = useState<string | null>(null);
  const [modoAmbiente, setModoAmbiente] = useState<'PRODUCAO' | 'TREINAMENTO'>('PRODUCAO');

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/');
          return;
        }
        const data = await res.json();
        if (!data.authenticated) {
          router.push('/');
          return;
        }

        if (data.user.status === 'PENDENTE_APROVACAO') {
          router.push('/quarentena');
          return;
        }

        setUser(data.user);
      } catch (err) {
        console.error(err);
        router.push('/');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/');
    }
  };

  const handleLaunchSystem = async (
    targetSystem: TargetSystemHub,
    forcarTreinamento?: boolean
  ) => {
    const isTreino = forcarTreinamento !== undefined ? forcarTreinamento : modoAmbiente === 'TREINAMENTO';
    setLaunchingSystem(targetSystem);

    // Abre a nova aba no momento do clique do usuário para evitar bloqueio de popup pelo navegador
    const novaAba = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null;

    try {
      const res = await fetch('/api/sso/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetSystem, isTreinamento: isTreino }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (novaAba) novaAba.close();
        alert(data.error || 'Erro ao gerar acesso SSO.');
        setLaunchingSystem(null);
        return;
      }

      if (data.redirectUrl) {
        if (novaAba) {
          novaAba.location.href = data.redirectUrl;
        } else {
          window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');
        }
        setLaunchingSystem(null);
      } else {
        if (novaAba) novaAba.close();
        alert('URL de redirecionamento não informada.');
        setLaunchingSystem(null);
      }
    } catch (err: any) {
      if (novaAba) novaAba.close();
      alert(err.message || 'Erro ao comunicar com o servidor.');
      setLaunchingSystem(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-300">Carregando seus acessos aos sistemas...</p>
        </div>
      </div>
    );
  }

  const isAdmin = Boolean(user?.isAdminGeral);

  // Permissões ativas por subsistema
  const rolePca = hasSubsistemaAccess(user?.perfilPca, isAdmin, 'PCA');
  const roleEtpRiscos = hasSubsistemaAccess(user?.perfilPca, isAdmin, 'ETP_RISCOS');
  const rolePesquisaPrecos = hasSubsistemaAccess(user?.perfilPca, isAdmin, 'PESQUISA_PRECOS');
  const roleTermoReferencia = hasSubsistemaAccess(user?.perfilPca, isAdmin, 'TERMO_REFERENCIA');
  const roleLicitacoesMinutas = hasSubsistemaAccess(user?.perfilPca, isAdmin, 'LICITACOES_MINUTAS');

  const hasAccessPca = Boolean(rolePca);
  const hasAccessEtpRiscos = Boolean(roleEtpRiscos);
  const hasAccessPesquisaPrecos = Boolean(rolePesquisaPrecos);
  const hasAccessTermoReferencia = Boolean(roleTermoReferencia);
  const hasAccessLicitacoesMinutas = Boolean(roleLicitacoesMinutas);
  const hasAccessSgc = Boolean(user?.perfilSgc || isAdmin);
  const hasAccessManut = Boolean(user?.perfilManut || isAdmin);
  const hasAccessDiarias = Boolean(user?.perfilDiarias || isAdmin);
  const hasAccessClima = Boolean(user?.perfilClimatizacao || isAdmin);

  const totalSistemasAcessiveis = [
    hasAccessPca,
    hasAccessEtpRiscos,
    hasAccessPesquisaPrecos,
    hasAccessTermoReferencia,
    hasAccessLicitacoesMinutas,
    hasAccessSgc,
    hasAccessClima,
    hasAccessManut,
    hasAccessDiarias,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Header / Navbar */}
      <header className="border-b border-white/10 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Identidade */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-slate-950 shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">UERN • PROAD</span>
                <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20 font-medium">
                  Portal Central SSO
                </span>
              </div>
              <h1 className="text-sm font-bold text-white tracking-tight">
                Painel Integrado de Sistemas
              </h1>
            </div>
          </div>

          {/* User info & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-white">{user?.nome}</span>
              <span className="text-[11px] text-slate-400">
                {user?.tipoUsuario === 'SERVIDOR_UERN' ? (
                  <>
                    <strong className="text-amber-300">{user?.unidadeSigla}</strong> • Campus {user?.unidadeCampus}
                  </>
                ) : (
                  <>
                    <strong className="text-amber-300">{user?.razaoSocial}</strong> • Fornecedor
                  </>
                )}
              </span>
            </div>

            {/* Link direto para a Central de Treinamento */}
            <Link
              href="/treinamento"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold transition shadow-sm"
              title="Acessar Central Didática de Treinamento"
            >
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">Hub Treinamento</span>
            </Link>

            {/* Botão de Painel de Governança para Administradores */}
            {user?.isAdminGeral && (
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-300 text-xs font-semibold transition shadow-sm"
              >
                <Settings className="w-4 h-4" />
                <span>Painel PROAD</span>
              </button>
            )}

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              title="Encerrar sessão"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-300 hover:text-white transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* Banner de Boas-vindas ou Alerta de Treinamento */}
        {modoAmbiente === 'PRODUCAO' ? (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-[#002244] to-slate-900 border border-blue-500/30 p-6 sm:p-8 mb-8 shadow-xl">
            <div className="max-w-2xl relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-400/20 text-xs font-medium mb-3">
                <ShieldCheck className="w-3.5 h-3.5" /> Ambiente Oficial de Produção
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Olá, {user?.nome?.split(' ')[0]}!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-2">
                Você está no Portal Proad. Este sistema é voltado à serviços prestados no âmbito da Proad, conforme seu perfil de usuário.
              </p>
            </div>
            <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950 via-yellow-950 to-slate-900 border border-amber-500/40 p-6 sm:p-8 mb-8 shadow-xl">
            <div className="max-w-3xl relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/20 text-yellow-300 border border-amber-400/30 text-xs font-bold mb-3 animate-pulse">
                <GraduationCap className="w-4 h-4" /> Modo de Treinamento e Capacitação Ativado
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Simulação Didática com seus Acessos Reais ({user?.nome})
              </h2>
              <p className="text-xs sm:text-sm text-amber-200/90 mt-2 leading-relaxed">
                Neste modo, você opera exclusivamente sobre dados didáticos temporários isolados no Neon, permitindo testar funcionalidades sem receio de afetar os processos oficiais.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Regra de Governança:</strong> Você só pode acessar no treinamento os subsistemas e com os perfis concedidos pelo Administrador da PROAD no mundo real.
                </span>
              </div>
            </div>
            <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          </div>
        )}

        {/* Barra Seletora de Modo (Produção x Treinamento) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 p-4 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Seletor de Ambiente
            </span>
            <div className="text-sm font-extrabold text-white flex items-center gap-2 mt-0.5">
              <span>Ambiente Selecionado:</span>
              {modoAmbiente === 'PRODUCAO' ? (
                <span className="text-blue-400 font-bold flex items-center gap-1">
                  🏢 Produção Oficial
                </span>
              ) : (
                <span className="text-amber-400 font-extrabold flex items-center gap-1">
                  🎓 Treinamento e Simulação
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setModoAmbiente('PRODUCAO')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                modoAmbiente === 'PRODUCAO'
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Produção Oficial</span>
            </button>

            <button
              type="button"
              onClick={() => setModoAmbiente('TREINAMENTO')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                modoAmbiente === 'TREINAMENTO'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md font-extrabold ring-2 ring-amber-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Ambiente de Treinamento</span>
            </button>
          </div>
        </div>

        {/* Grid dos Sistemas Autorizados */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span>Sistemas Vinculados ao seu Perfil</span>
              {totalSistemasAcessiveis > 0 && (
                <span className="text-xs font-normal text-slate-500">
                  ({totalSistemasAcessiveis} {totalSistemasAcessiveis === 1 ? 'subsistema disponível' : 'subsistemas disponíveis'})
                </span>
              )}
            </h3>
          </div>

          {totalSistemasAcessiveis === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/80 border border-white/10 text-center">
              <Lock className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white">Nenhum subsistema vinculado ao seu perfil</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
                Seu cadastro está ativo no Portal PROAD, mas ainda não possui perfil de acesso vinculado aos subsistemas da PROAD. Entre em contato com a Pró-Reitoria de Administração para solicitar a autorização.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Subsistema 01: PCA - Plano de Contratações Anual */}
              {hasAccessPca && (
                <div className="rounded-2xl bg-slate-900/80 border border-white/10 hover:border-purple-500/40 p-6 transition flex flex-col justify-between shadow-lg relative group">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md">
                          Subsistema 01 • Coleta &amp; PNCP
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] font-semibold">
                          Perfil Real: {rolePca}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-lg font-bold text-white group-hover:text-purple-400 transition">
                      PCA - Plano de Contratações Anual
                    </h4>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Abertura de DFDs pelas Unidades Demandantes, distribuição de cotas internas, consolidação e publicação do PCA no PNCP, com acompanhamento item por item.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleLaunchSystem('PCA')}
                      disabled={launchingSystem === 'PCA'}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 disabled:opacity-50 cursor-pointer ${
                        modoAmbiente === 'TREINAMENTO'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold hover:brightness-110'
                          : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-400 hover:to-indigo-500'
                      }`}
                    >
                      <span>
                        {launchingSystem === 'PCA'
                          ? 'Iniciando...'
                          : modoAmbiente === 'TREINAMENTO'
                          ? '🎓 Treinar no PCA'
                          : 'Entrar no PCA'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Subsistema 02: ETP e Mapa de Riscos */}
              {hasAccessEtpRiscos && (
                <div className="rounded-2xl bg-slate-900/80 border border-white/10 hover:border-indigo-500/40 p-6 transition flex flex-col justify-between shadow-lg relative group">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <ClipboardCheck className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                          Subsistema 02 • Setores Técnicos
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold">
                          Perfil Real: {roleEtpRiscos}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-lg font-bold text-white group-hover:text-indigo-400 transition">
                      ETP e Mapa de Riscos
                    </h4>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Consolidação técnica final da lista de itens por competência (STI, Patrimônio, SOBE, DAS, Almoxarifado, Transportes e Comitês) e elaboração do ETP e Mapa de Riscos.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleLaunchSystem('ETP_RISCOS')}
                      disabled={launchingSystem === 'ETP_RISCOS'}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 disabled:opacity-50 cursor-pointer ${
                        modoAmbiente === 'TREINAMENTO'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold hover:brightness-110'
                          : 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white hover:from-indigo-400 hover:to-blue-500'
                      }`}
                    >
                      <span>
                        {launchingSystem === 'ETP_RISCOS'
                          ? 'Iniciando...'
                          : modoAmbiente === 'TREINAMENTO'
                          ? '🎓 Treinar em ETP e Riscos'
                          : 'Entrar em ETP e Riscos'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Subsistema 03: Pesquisa de Preços */}
              {hasAccessPesquisaPrecos && (
                <div className="rounded-2xl bg-slate-900/80 border border-white/10 hover:border-teal-500/40 p-6 transition flex flex-col justify-between shadow-lg relative group">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-md">
                          Subsistema 03 • Cotação Referencial
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[11px] font-semibold">
                          Perfil Real: {rolePesquisaPrecos}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-lg font-bold text-white group-hover:text-teal-400 transition">
                      Pesquisa de Preços
                    </h4>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Recebimento automático da lista de itens consolidada no ETP e lançamento dos preços referenciais obtidos na pesquisa de mercado.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleLaunchSystem('PESQUISA_PRECOS')}
                      disabled={launchingSystem === 'PESQUISA_PRECOS'}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 disabled:opacity-50 cursor-pointer ${
                        modoAmbiente === 'TREINAMENTO'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold hover:brightness-110'
                          : 'bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 hover:from-teal-400 hover:to-emerald-500'
                      }`}
                    >
                      <span>
                        {launchingSystem === 'PESQUISA_PRECOS'
                          ? 'Iniciando...'
                          : modoAmbiente === 'TREINAMENTO'
                          ? '🎓 Treinar em Pesquisa de Preços'
                          : 'Entrar em Pesquisa de Preços'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Subsistema 04: Termo de Referência (TR) */}
              {hasAccessTermoReferencia && (
                <div className="rounded-2xl bg-slate-900/80 border border-white/10 hover:border-orange-500/40 p-6 transition flex flex-col justify-between shadow-lg relative group">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold bg-orange-500/15 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded-md">
                          Subsistema 04 • Planejamento
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-300 text-[11px] font-semibold">
                          Perfil Real: {roleTermoReferencia}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-lg font-bold text-white group-hover:text-orange-400 transition">
                      Termo de Referência (TR)
                    </h4>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Elaboração do Termo de Referência com herança automática dos dados técnicos do ETP e dos preços referenciais da Pesquisa de Preços.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleLaunchSystem('TERMO_REFERENCIA')}
                      disabled={launchingSystem === 'TERMO_REFERENCIA'}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 disabled:opacity-50 cursor-pointer ${
                        modoAmbiente === 'TREINAMENTO'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold hover:brightness-110'
                          : 'bg-gradient-to-r from-orange-500 to-amber-600 text-slate-950 hover:from-orange-400 hover:to-amber-500'
                      }`}
                    >
                      <span>
                        {launchingSystem === 'TERMO_REFERENCIA'
                          ? 'Iniciando...'
                          : modoAmbiente === 'TREINAMENTO'
                          ? '🎓 Treinar em Termo de Referência'
                          : 'Entrar em Termo de Referência'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Subsistema 05: Minutas, Fase Jurídica e Licitações */}
              {hasAccessLicitacoesMinutas && (
                <div className="rounded-2xl bg-slate-900/80 border border-white/10 hover:border-rose-500/40 p-6 transition flex flex-col justify-between shadow-lg relative group">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                        <Scale className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-md">
                          Subsistema 05 • Edital, PGE &amp; Certame
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-semibold">
                          Perfil Real: {roleLicitacoesMinutas}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-lg font-bold text-white group-hover:text-rose-400 transition">
                      Minutas, Fase Jurídica e Licitações
                    </h4>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Elaboração de Minutas de Edital, Contrato e Ata (ARP), registro da análise jurídica (AJUR/PGE) e diligências, Edital Definitivo, publicação no PNCP e Homologação pelo Preço Real Licitado.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleLaunchSystem('LICITACOES_MINUTAS')}
                      disabled={launchingSystem === 'LICITACOES_MINUTAS'}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 disabled:opacity-50 cursor-pointer ${
                        modoAmbiente === 'TREINAMENTO'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold hover:brightness-110'
                          : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-400 hover:to-pink-500'
                      }`}
                    >
                      <span>
                        {launchingSystem === 'LICITACOES_MINUTAS'
                          ? 'Iniciando...'
                          : modoAmbiente === 'TREINAMENTO'
                          ? '🎓 Treinar em Minutas e Licitações'
                          : 'Entrar em Minutas e Licitações'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Subsistema 06: SGC - Contratos, Atas, Empenho e Execução */}
              {hasAccessSgc && (
                <div className="rounded-2xl bg-slate-900/80 border border-white/10 hover:border-amber-500/40 p-6 transition flex flex-col justify-between shadow-lg relative group">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md">
                          Subsistema 06 • Empenho, Atas &amp; Execução
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
                          Perfil Real: {user?.perfilSgc || 'ADMIN'}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-lg font-bold text-white group-hover:text-amber-400 transition">
                      SGC - Contratos, Atas, Empenho e Execução
                    </h4>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Registro de Empenho, designação de Gestor e Fiscais (Gabinete PROAD), controle UCI, elaboração de Contratos, Atas de Registro de Preços e gestão da execução e recebimento.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleLaunchSystem('SGC')}
                      disabled={launchingSystem === 'SGC'}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 disabled:opacity-50 cursor-pointer ${
                        modoAmbiente === 'TREINAMENTO'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold hover:brightness-110'
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500'
                      }`}
                    >
                      <span>
                        {launchingSystem === 'SGC'
                          ? 'Iniciando...'
                          : modoAmbiente === 'TREINAMENTO'
                          ? '🎓 Treinar no SGC'
                          : 'Entrar no SGC'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* SIG-CLIMA - Climatização e Refrigeração */}
              {hasAccessClima && (
                <div className="rounded-2xl bg-slate-900/80 border border-white/10 hover:border-cyan-500/40 p-6 transition flex flex-col justify-between shadow-lg relative group">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <Snowflake className="w-6 h-6 animate-pulse" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
                        Perfil Real: {user?.perfilClimatizacao || (user?.isAdminGeral ? 'ADMIN' : 'DEMANDANTE')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-white group-hover:text-cyan-400 transition">
                        Climatização e Refrigeração
                      </h4>
                      <span className="text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                        SIG-CLIMA
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Chamados e manutenção de condicionadores de ar, geladeiras, freezers e bebedouros de toda a UERN.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleLaunchSystem('CLIMATIZACAO')}
                      disabled={launchingSystem === 'CLIMATIZACAO'}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 disabled:opacity-50 cursor-pointer ${
                        modoAmbiente === 'TREINAMENTO'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold hover:brightness-110'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 hover:from-cyan-400 hover:to-blue-500'
                      }`}
                    >
                      <span>
                        {launchingSystem === 'CLIMATIZACAO'
                          ? 'Iniciando...'
                          : modoAmbiente === 'TREINAMENTO'
                          ? '🎓 Treinar no SIG-CLIMA'
                          : 'Entrar no SIG-CLIMA'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Manutenção Predial - Ordem de Serviço */}
              {hasAccessManut && (
                <div className="rounded-2xl bg-slate-900/80 border border-white/10 hover:border-emerald-500/40 p-6 transition flex flex-col justify-between shadow-lg relative group">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <Wrench className="w-6 h-6" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                        Perfil Real: {user?.perfilManut || 'ADMIN'}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-white group-hover:text-emerald-400 transition">
                      Manutenção Predial &amp; Ordem de Serviço
                    </h4>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Abertura de chamados, vistorias prediais, execução de Ordens de Serviço (OS) pela SOBE e empresas contratadas em todos os campi da UERN.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleLaunchSystem('MANUTENCAO')}
                      disabled={launchingSystem === 'MANUTENCAO'}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 disabled:opacity-50 cursor-pointer ${
                        modoAmbiente === 'TREINAMENTO'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold hover:brightness-110'
                          : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 hover:from-emerald-400 hover:to-emerald-500'
                      }`}
                    >
                      <span>
                        {launchingSystem === 'MANUTENCAO'
                          ? 'Iniciando...'
                          : modoAmbiente === 'TREINAMENTO'
                          ? '🎓 Treinar no Manutenção'
                          : 'Entrar no Manutenção'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Diárias e Passagens */}
              {hasAccessDiarias && (
                <div className="rounded-2xl bg-slate-900/80 border border-white/10 hover:border-cyan-500/40 p-6 transition flex flex-col justify-between shadow-lg relative group">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <Plane className="w-6 h-6" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                        Perfil Real: {user?.perfilDiarias || 'ADMIN'}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-white group-hover:text-cyan-400 transition">
                      Diárias e Passagens
                    </h4>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Solicitação de deslocamentos institucionais, autorização prévia por gestores, emissão de bilhetes aéreos e prestação de contas de diárias.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleLaunchSystem('DIARIAS')}
                      disabled={launchingSystem === 'DIARIAS'}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 disabled:opacity-50 cursor-pointer ${
                        modoAmbiente === 'TREINAMENTO'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold hover:brightness-110'
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500'
                      }`}
                    >
                      <span>
                        {launchingSystem === 'DIARIAS'
                          ? 'Iniciando...'
                          : modoAmbiente === 'TREINAMENTO'
                          ? '🎓 Treinar no Diárias'
                          : 'Entrar no Diárias'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950 px-6 py-4 text-center text-xs text-slate-400">
        © 2026 Universidade do Estado do Rio Grande do Norte - UERN • Pró-Reitoria de Administração (PROAD)
      </footer>
    </div>
  );
}
