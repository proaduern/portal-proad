'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Building2,
  Users,
  CheckCircle2,
  ExternalLink,
  Wrench,
  Snowflake,
  FileText,
  Plane,
  ShoppingBag,
  Lock,
  AlertTriangle,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

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

export default function TreinamentoPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [launchingSystem, setLaunchingSystem] = useState<string | null>(null);
  const [resetando, setResetando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

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

  const handleLaunchSystemTreino = async (
    targetSystem: 'SGC' | 'MANUTENCAO' | 'PCA' | 'DIARIAS' | 'CLIMATIZACAO'
  ) => {
    setLaunchingSystem(targetSystem);
    setErro(null);

    // Abre nova aba no momento do clique para contornar bloqueador de pop-ups
    const novaAba = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null;

    try {
      const res = await fetch('/api/sso/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetSystem, isTreinamento: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (novaAba) novaAba.close();
        setErro(data.error || 'Erro ao gerar acesso ao treinamento.');
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
        setErro('URL de redirecionamento não informada.');
        setLaunchingSystem(null);
      }
    } catch (err: any) {
      if (novaAba) novaAba.close();
      setErro(err.message || 'Erro ao comunicar com o servidor.');
      setLaunchingSystem(null);
    }
  };

  const handleResetarTurma = async () => {
    if (
      !confirm(
        'Atenção Administrador / Instrutor PROAD:\n\nDeseja restaurar as bases didáticas de treinamento para o estado limpo?\nTodos os chamados e dados gerados durante as simulações recentes serão reinicializados.'
      )
    ) {
      return;
    }

    setResetando(true);
    setMensagem(null);
    setErro(null);
    try {
      const res = await fetch('/api/treinamento/reset', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMensagem(data.mensagem || 'Bases didáticas restauradas com sucesso!');
        setTimeout(() => setMensagem(null), 5000);
      } else {
        setErro(data.error || 'Erro ao resetar base de treinamento.');
      }
    } catch (err: any) {
      setErro(err.message || 'Falha ao conectar com o serviço de reset.');
    } finally {
      setResetando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-300">Carregando permissões do Ambiente de Treinamento...</p>
        </div>
      </div>
    );
  }

  // Permissões ativas por sistema
  const hasAccessSgc = Boolean(user?.perfilSgc || user?.isAdminGeral);
  const hasAccessPca = Boolean(user?.perfilPca || user?.isAdminGeral);
  const hasAccessManut = Boolean(user?.perfilManut || user?.isAdminGeral);
  const hasAccessDiarias = Boolean(user?.perfilDiarias || user?.isAdminGeral);
  const hasAccessClima = Boolean(user?.perfilClimatizacao || user?.isAdminGeral);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/hub"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
              title="Voltar ao Painel Geral"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-slate-950 shadow-md">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">UERN • PROAD</span>
                <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold">
                  Sandbox Didático
                </span>
              </div>
              <h1 className="text-sm font-bold text-white tracking-tight">
                Ambiente de Treinamento & Capacitação
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/hub"
              className="px-3.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold transition"
            >
              Ir para Produção Oficial
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* Banner Institucional do Treinamento */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950 via-yellow-950 to-slate-900 border border-amber-500/40 p-6 sm:p-8 mb-8 shadow-2xl">
          <div className="max-w-3xl relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-yellow-300 border border-amber-400/30 text-xs font-extrabold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Capacitação Contínua UERN
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Treine com seus Acessos Reais, sem Risco à Produção
            </h2>
            <p className="text-xs sm:text-sm text-amber-200/90 mt-2 leading-relaxed">
              Bem-vindo ao Ambiente de Treinamento da PROAD. Neste espaço, você pode exercitar fluxos completos,
              abrir chamados, emitir pareceres e atestar serviços sobre dados temporários didáticos.
            </p>

            <div className="mt-4 p-3.5 rounded-xl bg-slate-950/70 border border-amber-500/30 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-white">Governança Integrada:</strong> O acesso ao treinamento reflete
                estritamente a homologação efetuada pelo Administrador da PROAD no mundo real.
                Você só pode treinar nos subsistemas e com os perfis atribuídos à sua conta institucional.
              </div>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Feedback Messages */}
        {mensagem && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{mensagem}</span>
          </div>
        )}

        {erro && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {/* Card do Usuário Real Conectado */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 mb-8 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow">
              {user?.nome?.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{user?.nome}</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                  Status: ATIVO HOMOLOGADO
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {user?.email} • {user?.unidadeSigla ? `${user.unidadeSigla} (Campus ${user.unidadeCampus || 'Central'})` : 'Campus Central'}
                {user?.matricula && ` • Matrícula: ${user.matricula}`}
              </p>
            </div>
          </div>

          {/* Painel de Instrutor / Reset se for Admin Geral */}
          {user?.isAdminGeral && (
            <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-4">
              <button
                type="button"
                onClick={handleResetarTurma}
                disabled={resetando}
                className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold text-xs flex items-center gap-2 shadow transition cursor-pointer disabled:opacity-50"
                title="Reinicializar todos os chamados e dados didáticos do treinamento"
              >
                <RefreshCw className={`w-4 h-4 ${resetando ? 'animate-spin' : ''}`} />
                <span>{resetando ? 'Resetando...' : 'Resetar Base Didática da Turma'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Grid de Subsistemas com Checagem de Permissão Real */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span>Seus Subsistemas Habilitados para Treinamento</span>
            </h3>
            <span className="text-xs text-slate-400">
              Clique para ingressar no módulo de treino com seus acessos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. SIG-CLIMA */}
            <div className={`p-6 rounded-2xl border transition flex flex-col justify-between shadow-lg relative ${
              hasAccessClima
                ? 'bg-slate-900/90 border-cyan-500/40 hover:border-cyan-400'
                : 'bg-slate-900/40 border-white/5 opacity-60'
            }`}>
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Snowflake className="w-6 h-6 animate-pulse" />
                  </div>
                  {hasAccessClima ? (
                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
                      Perfil Real: {user?.perfilClimatizacao || (user?.isAdminGeral ? 'ADMIN' : 'DEMANDANTE')}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs flex items-center gap-1 font-semibold">
                      <Lock className="w-3.5 h-3.5" /> Sem Autorização Real
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold text-white">SIG-CLIMA (Treinamento)</h4>
                  <span className="text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                    Climatização
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Pratique abertura de chamados, regras de prioridade de sala de aula, diagnóstico com fotos e o fluxo de ateste tácito de 5 dias corridos sem custos reais.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">Dados Didáticos Isolados</span>
                {hasAccessClima ? (
                  <button
                    type="button"
                    onClick={() => handleLaunchSystemTreino('CLIMATIZACAO')}
                    disabled={launchingSystem === 'CLIMATIZACAO'}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{launchingSystem === 'CLIMATIZACAO' ? 'Iniciando...' : 'Entrar no Treinamento'}</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Solicitar homologação à PROAD
                  </span>
                )}
              </div>
            </div>

            {/* 2. SGC */}
            <div className={`p-6 rounded-2xl border transition flex flex-col justify-between shadow-lg relative ${
              hasAccessSgc
                ? 'bg-slate-900/90 border-blue-500/40 hover:border-blue-400'
                : 'bg-slate-900/40 border-white/5 opacity-60'
            }`}>
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  {hasAccessSgc ? (
                    <span className="px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold">
                      Perfil Real: {user?.perfilSgc || 'ADMIN'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs flex items-center gap-1 font-semibold">
                      <Lock className="w-3.5 h-3.5" /> Sem Autorização Real
                    </span>
                  )}
                </div>

                <h4 className="text-lg font-bold text-white">SGC - Gestão de Contratos (Treinamento)</h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Simulação de fiscalização de contratos, atas de registro de preços, medições mensais e emissão de atestes com dados didáticos temporários.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">Dados Didáticos Isolados</span>
                {hasAccessSgc ? (
                  <button
                    type="button"
                    onClick={() => handleLaunchSystemTreino('SGC')}
                    disabled={launchingSystem === 'SGC'}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{launchingSystem === 'SGC' ? 'Iniciando...' : 'Entrar no Treinamento'}</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Solicitar homologação à PROAD
                  </span>
                )}
              </div>
            </div>

            {/* 3. Manutenção Predial */}
            <div className={`p-6 rounded-2xl border transition flex flex-col justify-between shadow-lg relative ${
              hasAccessManut
                ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-400'
                : 'bg-slate-900/40 border-white/5 opacity-60'
            }`}>
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Wrench className="w-6 h-6" />
                  </div>
                  {hasAccessManut ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                      Perfil Real: {user?.perfilManut || 'ADMIN'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs flex items-center gap-1 font-semibold">
                      <Lock className="w-3.5 h-3.5" /> Sem Autorização Real
                    </span>
                  )}
                </div>

                <h4 className="text-lg font-bold text-white">Manutenção Predial (Treinamento)</h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Pratique a abertura e fiscalização de Ordens de Serviço prediais estimativas, balanceamento de saldos e atestes de obras com segurança.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">Dados Didáticos Isolados</span>
                {hasAccessManut ? (
                  <button
                    type="button"
                    onClick={() => handleLaunchSystemTreino('MANUTENCAO')}
                    disabled={launchingSystem === 'MANUTENCAO'}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{launchingSystem === 'MANUTENCAO' ? 'Iniciando...' : 'Entrar no Treinamento'}</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Solicitar homologação à PROAD
                  </span>
                )}
              </div>
            </div>

            {/* 4. PCA */}
            <div className={`p-6 rounded-2xl border transition flex flex-col justify-between shadow-lg relative ${
              hasAccessPca
                ? 'bg-slate-900/90 border-purple-500/40 hover:border-purple-400'
                : 'bg-slate-900/40 border-white/5 opacity-60'
            }`}>
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  {hasAccessPca ? (
                    <span className="px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold">
                      Perfil Real: {user?.perfilPca || 'ADMIN'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs flex items-center gap-1 font-semibold">
                      <Lock className="w-3.5 h-3.5" /> Sem Autorização Real
                    </span>
                  )}
                </div>

                <h4 className="text-lg font-bold text-white">PCA - Contratações Anual (Treinamento)</h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Simulação de elaboração de Documentos de Formalização de Demanda (DFD) e consolidação do plano anual de contratações.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">Dados Didáticos Isolados</span>
                {hasAccessPca ? (
                  <button
                    type="button"
                    onClick={() => handleLaunchSystemTreino('PCA')}
                    disabled={launchingSystem === 'PCA'}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{launchingSystem === 'PCA' ? 'Iniciando...' : 'Entrar no Treinamento'}</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Solicitar homologação à PROAD
                  </span>
                )}
              </div>
            </div>

            {/* 5. Diárias */}
            <div className={`p-6 rounded-2xl border transition flex flex-col justify-between shadow-lg relative ${
              hasAccessDiarias
                ? 'bg-slate-900/90 border-cyan-500/40 hover:border-cyan-400'
                : 'bg-slate-900/40 border-white/5 opacity-60'
            }`}>
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Plane className="w-6 h-6" />
                  </div>
                  {hasAccessDiarias ? (
                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
                      Perfil Real: {user?.perfilDiarias || 'ADMIN'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs flex items-center gap-1 font-semibold">
                      <Lock className="w-3.5 h-3.5" /> Sem Autorização Real
                    </span>
                  )}
                </div>

                <h4 className="text-lg font-bold text-white">Diárias e Passagens (Treinamento)</h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Pratique solicitação de diárias, prestação de contas e homologação de bilhetes em ambiente de teste didático.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">Dados Didáticos Isolados</span>
                {hasAccessDiarias ? (
                  <button
                    type="button"
                    onClick={() => handleLaunchSystemTreino('DIARIAS')}
                    disabled={launchingSystem === 'DIARIAS'}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{launchingSystem === 'DIARIAS' ? 'Iniciando...' : 'Entrar no Treinamento'}</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Solicitar homologação à PROAD
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950 px-6 py-4 text-center text-xs text-slate-400">
        © 2026 Universidade do Estado do Rio Grande do Norte - UERN • Pró-Reitoria de Administração (PROAD)
      </footer>
    </div>
  );
}
