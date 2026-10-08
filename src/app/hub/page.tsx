'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  FileText,
  Wrench,
  ShoppingBag,
  Plane,
  ShieldCheck,
  User,
  LogOut,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
  Settings,
  HelpCircle,
} from 'lucide-react';

interface UserData {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  matricula?: string | null;
  tipoUsuario: 'SERVIDOR_UERN' | 'FORNECEDOR_EXTERNO';
  status: 'PENDENTE_APROVACAO' | 'ATIVO' | 'BLOQUEADO';
  unidadeSigla?: string | null;
  unidadeNome?: string | null;
  unidadeCampus?: string | null;
  cnpjEmpresa?: string | null;
  razaoSocial?: string | null;
  perfilSgc?: string | null;
  perfilManut?: string | null;
  perfilPca?: string | null;
  perfilDiarias?: string | null;
  isAdminGeral: boolean;
}

export default function HubPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [launchingSystem, setLaunchingSystem] = useState<string | null>(null);
  const [ssoModal, setSsoModal] = useState<{
    open: boolean;
    system: string;
    token?: string;
    targetUrl?: string;
  } | null>(null);

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

  const handleLaunchSystem = async (targetSystem: 'SGC' | 'MANUTENCAO' | 'PCA' | 'DIARIAS') => {
    setLaunchingSystem(targetSystem);
    try {
      const res = await fetch('/api/sso/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetSystem }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erro ao gerar acesso SSO.');
        return;
      }

      // Exibe modal explicativo ou redireciona
      setSsoModal({
        open: true,
        system: targetSystem,
        token: data.token,
        targetUrl: data.redirectUrl,
      });
    } catch (err: any) {
      alert(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
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
          <div className="flex items-center gap-4">
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

            {/* Botão de Painel de Governança para Administradores */}
            {user?.isAdminGeral && (
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold transition shadow-sm"
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
        {/* Banner de Boas-vindas */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-[#002244] to-slate-900 border border-blue-500/30 p-6 sm:p-8 mb-8 shadow-xl">
          <div className="max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Acesso Unificado Liberado
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Olá, {user?.nome?.split(' ')[0]}!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2">
              Selecione o sistema desejado para navegar com suas permissões ativas. O ecossistema integrado da PROAD garante que seus dados de unidade, contratos e demandas estejam conectados.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Grid dos 4 Sistemas */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span>Sistemas Disponíveis</span>
              <span className="text-xs font-normal text-slate-500">(4 módulos integrados)</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. SGC - Gestão de Contratos e Terceirização */}
            <div className="rounded-2xl bg-slate-900/80 border border-white/10 hover:border-amber-500/40 p-6 transition flex flex-col justify-between shadow-lg relative group">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  {user?.perfilSgc ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                      Perfil: {user.perfilSgc}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs">
                      Sem Acesso
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
                {user?.perfilSgc ? (
                  <button
                    type="button"
                    onClick={() => handleLaunchSystem('SGC')}
                    disabled={launchingSystem === 'SGC'}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 disabled:opacity-50"
                  >
                    <span>{launchingSystem === 'SGC' ? 'Iniciando...' : 'Entrar no SGC'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Solicitar liberação
                  </span>
                )}
              </div>
            </div>

            {/* 2. PCA - Plano de Contratações Anual */}
            <div className="rounded-2xl bg-slate-900/80 border border-white/10 hover:border-amber-500/40 p-6 transition flex flex-col justify-between shadow-lg relative group">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  {user?.perfilPca ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                      Perfil: {user.perfilPca}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs">
                      Sem Acesso
                    </span>
                  )}
                </div>

                <h4 className="text-lg font-bold text-white group-hover:text-amber-400 transition">
                  PCA - Plano de Contratações Anual
                </h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Planejamento e consolidação das demandas de aquisição de bens e contratação de serviços por todas as unidades da UERN. Sincronizado automaticamente com contratos vigentes do SGC.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">Porta 3002 • Prisma 6 / Next.js 16</span>
                {user?.perfilPca ? (
                  <button
                    type="button"
                    onClick={() => handleLaunchSystem('PCA')}
                    disabled={launchingSystem === 'PCA'}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 disabled:opacity-50"
                  >
                    <span>{launchingSystem === 'PCA' ? 'Iniciando...' : 'Entrar no PCA'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Solicitar liberação
                  </span>
                )}
              </div>
            </div>

            {/* 3. Manutenção Predial - Ordem de Serviço */}
            <div className="rounded-2xl bg-slate-900/80 border border-white/10 hover:border-amber-500/40 p-6 transition flex flex-col justify-between shadow-lg relative group">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Wrench className="w-6 h-6" />
                  </div>
                  {user?.perfilManut ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                      Perfil: {user.perfilManut}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs">
                      Sem Acesso
                    </span>
                  )}
                </div>

                <h4 className="text-lg font-bold text-white group-hover:text-amber-400 transition">
                  Manutenção Predial & Ordem de Serviço
                </h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Abertura de chamados, vistorias prediais, execução de Ordens de Serviço (OS) pela SOBE e empresas contratadas em todos os campi da UERN.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">Porta 3003 • Prisma 5 / Next.js 14</span>
                {user?.perfilManut ? (
                  <button
                    type="button"
                    onClick={() => handleLaunchSystem('MANUTENCAO')}
                    disabled={launchingSystem === 'MANUTENCAO'}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 disabled:opacity-50"
                  >
                    <span>{launchingSystem === 'MANUTENCAO' ? 'Iniciando...' : 'Entrar no Manutenção'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Solicitar liberação
                  </span>
                )}
              </div>
            </div>

            {/* 4. Diárias e Passagens */}
            <div className="rounded-2xl bg-slate-900/80 border border-white/10 hover:border-amber-500/40 p-6 transition flex flex-col justify-between shadow-lg relative group">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Plane className="w-6 h-6" />
                  </div>
                  {user?.perfilDiarias ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                      Perfil: {user.perfilDiarias}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs">
                      Sem Acesso
                    </span>
                  )}
                </div>

                <h4 className="text-lg font-bold text-white group-hover:text-amber-400 transition">
                  Diárias e Passagens
                </h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Solicitação de deslocamentos institucionais, autorização prévia por gestores, emissão de bilhetes aéreos e prestação de contas de diárias.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">Porta 3004 • Prisma 6 / Next.js 16</span>
                {user?.perfilDiarias ? (
                  <button
                    type="button"
                    onClick={() => handleLaunchSystem('DIARIAS')}
                    disabled={launchingSystem === 'DIARIAS'}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 disabled:opacity-50"
                  >
                    <span>{launchingSystem === 'DIARIAS' ? 'Iniciando...' : 'Entrar no Diárias'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Solicitar liberação
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* SSO Handover Modal */}
      {ssoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white text-center">
              Transição Segura SSO ({ssoModal.system})
            </h3>
            <p className="text-xs text-slate-300 text-center mt-2">
              Seu token de autenticação de sessão única foi emitido com validade temporária de 2 minutos.
            </p>

            <div className="my-5 p-3 rounded-xl bg-slate-950/80 border border-white/10 text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Destino:</span>
                <span className="text-amber-300 font-bold">{ssoModal.system}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Identidade:</span>
                <span className="text-white truncate max-w-[200px]">{user?.email}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>URL de Destino:</span>
                <span className="text-slate-300 truncate max-w-[200px]">{ssoModal.targetUrl}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSsoModal(null)}
                className="flex-1 py-2 px-3 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-slate-300 transition"
              >
                Fechar
              </button>
              <a
                href={ssoModal.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSsoModal(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition text-center"
              >
                <span>Abrir Sistema</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
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
