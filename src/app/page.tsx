'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
  Briefcase,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'servidor' | 'fornecedor'>('servidor');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados do formulário de servidor
  const [servidorEmail, setServidorEmail] = useState('');
  const [sessaoAtiva, setSessaoAtiva] = useState<any>(null);

  // Estados do formulário de fornecedor
  const [fornecedorEmail, setFornecedorEmail] = useState('');
  const [fornecedorSenha, setFornecedorSenha] = useState('');

  // Verifica se já está autenticado
  useEffect(() => {
    async function checkCurrentSession() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setSessaoAtiva(data.user);
          }
        }
      } catch (err) {
        console.error('Erro ao verificar sessão:', err);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkCurrentSession();
  }, []);

  const handleDeslogar = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setSessaoAtiva(null);
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handler de login do Google / Servidor UERN
  const handleGoogleLogin = async (emailToUse?: string, nomeToUse?: string) => {
    setLoading(true);
    setErrorMsg(null);

    const email = (emailToUse || servidorEmail || '').trim().toLowerCase();
    if (!email) {
      setErrorMsg('Por favor, informe seu e-mail institucional @uern.br.');
      setLoading(false);
      return;
    }

    if (!email.endsWith('@uern.br')) {
      setErrorMsg('Apenas e-mails institucionais com o domínio @uern.br são permitidos.');
      setLoading(false);
      return;
    }

    const nome = nomeToUse || email.split('@')[0];

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          nome,
          fotoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=003366&color=fff`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao autenticar com Google Institucional.');
      }

      if (data.redirect) {
        // Se for primeiro acesso, grava dados temporários no sessionStorage para preencher a tela de pré-cadastro
        if (data.status === 'PRIMEIRO_ACESSO') {
          sessionStorage.setItem('preCadastro_google', JSON.stringify({ email: data.email, nome: data.nome }));
        }
        router.push(data.redirect);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  // Handler de login do fornecedor
  const handleFornecedorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/fornecedor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: fornecedorEmail,
          senha: fornecedorSenha,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Credenciais inválidas.');
      }

      if (data.redirect) {
        router.push(data.redirect);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-300 font-medium">Carregando ecossistema PROAD...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001f3f] via-[#002b55] to-[#00132b] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Decorative background glow elements */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-slate-950 shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-amber-400 font-semibold">UERN • Universidade do Estado do RN</div>
              <div className="text-sm font-bold tracking-tight text-white">Pró-Reitoria de Administração (PROAD)</div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1.5 bg-emerald-950/60 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" /> SSO Central Ativo
            </span>
            <span>Versão 1.0 (PROAD Integrada)</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-6 sm:p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Portal de Acesso Único</h1>
              <p className="text-xs text-slate-300 mt-1">
                Acesse SGC, PCA, Manutenção Predial e Diárias com credenciais unificadas
              </p>
            </div>

            {/* Sessão Ativa Detectada */}
            {sessaoAtiva && (
              <div className="mb-5 p-4 rounded-xl bg-slate-950/90 border border-amber-500/40 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <ShieldCheck className="w-4 h-4" /> Sessão Ativa no Navegador
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {sessaoAtiva.status}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{sessaoAtiva.nome}</div>
                  <div className="text-xs text-slate-300">{sessaoAtiva.email}</div>
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(sessaoAtiva.status === 'PENDENTE_APROVACAO' ? '/quarentena' : '/hub')}
                    className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                  >
                    Acessar Hub PROAD
                  </button>
                  <button
                    type="button"
                    onClick={handleDeslogar}
                    disabled={loading}
                    className="py-2 px-3 rounded-lg bg-red-950/70 hover:bg-red-900 border border-red-500/30 text-red-200 text-xs font-semibold transition"
                  >
                    Trocar de Conta / Sair
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Tab Selector */}
            <div className="flex rounded-xl bg-slate-950/60 p-1 border border-white/10 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('servidor');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'servidor'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-4 h-4" /> Servidor UERN
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('fornecedor');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'fornecedor'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Briefcase className="w-4 h-4" /> Fornecedor
              </button>
            </div>

            {/* Tab 1: Servidor UERN */}
            {activeTab === 'servidor' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleGoogleLogin();
                }}
                className="space-y-4"
              >
                <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3.5 text-xs text-blue-200 space-y-1">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" /> Acesso com Google Institucional
                  </div>
                  <p className="text-slate-300">
                    Informe seu e-mail do domínio <strong className="text-amber-300">@uern.br</strong> cadastrado no sistema.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    E-mail Institucional (@uern.br)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={servidorEmail}
                      onChange={(e) => setServidorEmail(e.target.value)}
                      placeholder="pedroreboucas@uern.br"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-white placeholder-slate-500 outline-none transition"
                    />
                  </div>
                </div>

                {/* Botão Oficial Google OAuth */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-white/20 active:scale-[0.98] disabled:opacity-60"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  {loading ? 'Autenticando...' : 'Entrar com Conta @uern.br'}
                </button>
              </form>
            )}

            {/* Tab 2: Fornecedor / Empresa */}
            {activeTab === 'fornecedor' && (
              <form onSubmit={handleFornecedorLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    E-mail Corporativo
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={fornecedorEmail}
                      onChange={(e) => setFornecedorEmail(e.target.value)}
                      placeholder="licitacao@suaempresa.com.br"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-white placeholder-slate-500 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={fornecedorSenha}
                      onChange={(e) => setFornecedorSenha(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-white placeholder-slate-500 outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-md active:scale-[0.98] disabled:opacity-60"
                >
                  {loading ? 'Entrando...' : 'Acessar Área do Fornecedor'}
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Seeded supplier quick access */}
                <div className="pt-2 border-t border-white/10 flex justify-between items-center text-[11px] text-slate-400">
                  <span>Empresa de teste cadastrada:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFornecedorEmail('contato@engenhariafacil.com.br');
                      setFornecedorSenha('Uern@2026');
                    }}
                    className="text-amber-400 hover:underline font-semibold"
                  >
                    Engenharia Fácil (Preencher)
                  </button>
                </div>

                {/* Botão de Auto-Credenciamento */}
                <div className="pt-2 text-center">
                  <p className="text-xs text-slate-400 mb-2">Sua empresa ainda não possui cadastro na UERN?</p>
                  <button
                    type="button"
                    onClick={() => router.push('/credenciamento')}
                    className="w-full py-2 px-3 rounded-xl border border-amber-500/50 hover:bg-amber-500/10 text-amber-300 font-semibold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Briefcase className="w-4 h-4" />
                    Solicitar Novo Credenciamento
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer note */}
          <div className="text-center mt-6 text-xs text-slate-400 flex items-center justify-center gap-4">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-400" /> Acesso Criptografado
            </span>
            <span>•</span>
            <span>Suporte PROAD: proad@uern.br</span>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-white/10 bg-black/30 backdrop-blur-md px-6 py-3 text-center text-xs text-slate-400">
        © 2026 Universidade do Estado do Rio Grande do Norte - UERN. Todos os direitos reservados.
      </footer>
    </div>
  );
}
