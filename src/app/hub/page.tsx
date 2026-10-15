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
    targetSystem: 'SGC' | 'MANUTENCAO' | 'PCA' | 'DIARIAS' | 'CLIMATIZACAO',
    forcarTreinamento?: boolean
  ) => {
    const isTreino = forcarTreinamento !== undefined ? forcarTreinamento : modoAmbiente === 'TREINAMENTO';
    setLaunchingSystem(targetSystem);
    try {
      const res = await fetch('/api/sso/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetSystem, isTreinamento: isTreino }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erro ao gerar acesso SSO.');
        setLaunchingSystem(null);
        return;
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        alert('URL de redirecionamento não informada.');
        setLaunchingSystem(null);
      }
    } catch (err: any) {
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

  // Permissões ativas por sistema
  const hasAccessSgc = Boolean(user?.perfilSgc || user?.isAdminGeral);
  const hasAccessPca = Boolean(user?.perfilPca || user?.isAdminGeral);
  const hasAccessManut = Boolean(user?.perfilManut || user?.isAdminGeral);
  const hasAccessDiarias = Boolean(user?.perfilDiarias || user?.isAdminGeral);
  const hasAccessClima = Boolean(user?.perfilClimatizacao || user?.isAdminGeral);

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
                Você está no ambiente oficial de governança da UERN. Todas as ordens, demandas e atestes abertos aqui possuem efeito jurídico e administrativo pleno.
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

        {/* Grid dos 5 Sistemas */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span>Sistemas Integrados PROAD</span>
              <span className="text-xs font-normal text-slate-500">(5 subsistemas disponíveis)</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. SGC - Gestão de Contratos e Terceirização */}
            <div className={`rounded-2xl bg-slate-900/80 border p-6 transition flex flex-col justify-between shadow-lg relative group ${
              hasAccessSgc ? 'border-white/10 hover:border-amber-500/40' : 'border-white/5 opacity-75'
            }`}>
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  {hasAccessSgc ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                      Perfil Real: {user?.perfilSgc || 'ADMIN'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Sem Acesso
                    </span>
                  )}
                </div>

                <h4 className="text-lg font-bold text-white group-hover:text-amber-400 transition">
                  SGC - Contratos e Terceirização
                </h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Gestão completa de Contratos Administrativos, Atas de Registro de Preços, fiscalização técnica e setorial, terceirização de mão de obra e controle de conta vinculada.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">Porta 3000 • Prisma 5 / Next.js 14</span>
                {hasAccessSgc ? (
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
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Não autorizado no mundo real
                  </span>
                )}
              </div>
            </div>

            {/* 2. SIG-CLIMA - Climatização e Refrigeração */}
            <div className={`rounded-2xl bg-slate-900/80 border p-6 transition flex flex-col justify-between shadow-lg relative group ${
              hasAccessClima ? 'border-white/10 hover:border-cyan-500/40' : 'border-white/5 opacity-75'
            }`}>
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Snowflake className="w-6 h-6 animate-pulse" />
                  </div>
                  {hasAccessClima ? (
                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
                      Perfil Real: {user?.perfilClimatizacao || (user?.isAdminGeral ? 'ADMIN' : 'DEMANDANTE')}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Sem Acesso
                    </span>
                  )}
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
                  Chamados e manutenção de condicionadores de ar, geladeiras, freezers e bebedouros de toda a UERN. Gestão de garantia de 90 dias, priorização de salas de aula e ateste tácito de 5 dias.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">Porta 3005 • Prisma 5 / Next.js 14</span>
                {hasAccessClima ? (
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
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Não autorizado no mundo real
                  </span>
                )}
              </div>
            </div>

            {/* 3. Manutenção Predial - Ordem de Serviço */}
            <div className={`rounded-2xl bg-slate-900/80 border p-6 transition flex flex-col justify-between shadow-lg relative group ${
              hasAccessManut ? 'border-white/10 hover:border-emerald-500/40' : 'border-white/5 opacity-75'
            }`}>
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Wrench className="w-6 h-6" />
                  </div>
                  {hasAccessManut ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                      Perfil Real: {user?.perfilManut || 'ADMIN'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Sem Acesso
                    </span>
                  )}
                </div>

                <h4 className="text-lg font-bold text-white group-hover:text-emerald-400 transition">
                  Manutenção Predial & Ordem de Serviço
                </h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Abertura de chamados, vistorias prediais, execução de Ordens de Serviço (OS) pela SOBE e empresas contratadas em todos os campi da UERN.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">Porta 3003 • Prisma 5 / Next.js 14</span>
                {hasAccessManut ? (
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
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Não autorizado no mundo real
                  </span>
                )}
              </div>
            </div>

            {/* 4. PCA - Plano de Contratações Anual */}
            <div className={`rounded-2xl bg-slate-900/80 border p-6 transition flex flex-col justify-between shadow-lg relative group ${
              hasAccessPca ? 'border-white/10 hover:border-purple-500/40' : 'border-white/5 opacity-75'
            }`}>
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  {hasAccessPca ? (
                    <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                      Perfil Real: {user?.perfilPca || 'ADMIN'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Sem Acesso
                    </span>
                  )}
                </div>

                <h4 className="text-lg font-bold text-white group-hover:text-purple-400 transition">
                  PCA - Plano de Contratações Anual
                </h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Planejamento e consolidação das demandas de aquisição de bens e contratação de serviços por todas as unidades da UERN. Sincronizado automaticamente com contratos vigentes.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">Porta 3002 • Prisma 6 / Next.js 16</span>
                {hasAccessPca ? (
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
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Não autorizado no mundo real
                  </span>
                )}
              </div>
            </div>

            {/* 5. Diárias e Passagens */}
            <div className={`rounded-2xl bg-slate-900/80 border p-6 transition flex flex-col justify-between shadow-lg relative group ${
              hasAccessDiarias ? 'border-white/10 hover:border-cyan-500/40' : 'border-white/5 opacity-75'
            }`}>
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Plane className="w-6 h-6" />
                  </div>
                  {hasAccessDiarias ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                      Perfil Real: {user?.perfilDiarias || 'ADMIN'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Sem Acesso
                    </span>
                  )}
                </div>

                <h4 className="text-lg font-bold text-white group-hover:text-cyan-400 transition">
                  Diárias e Passagens
                </h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Solicitação de deslocamentos institucionais, autorização prévia por gestores, emissão de bilhetes aéreos e prestação de contas de diárias.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">Porta 3004 • Prisma 6 / Next.js 16</span>
                {hasAccessDiarias ? (
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
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Não autorizado no mundo real
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
