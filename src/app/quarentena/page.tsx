'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Clock,
  ShieldCheck,
  User,
  LogOut,
  RefreshCw,
  Building,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

export default function QuarentenaPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const carregarStatus = async (manual = false) => {
    if (manual) setVerificando(true);
    setStatusMsg(null);

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

      if (data.user.status === 'ATIVO') {
        router.push('/hub');
        return;
      }

      setUser(data.user);
      if (manual) {
        setStatusMsg('Seu cadastro continua em análise pela administração da PROAD.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setVerificando(false);
    }
  };

  useEffect(() => {
    carregarStatus();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (e) {
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-300">Consultando status do cadastro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001f3f] via-[#002b55] to-[#00132b] text-slate-100 flex flex-col justify-between py-8 px-4">
      <div className="max-w-xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">UERN • PROAD</div>
              <div className="text-xs text-slate-300">Pró-Reitoria de Administração</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-200 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>

        {/* Card Principal de Quarentena */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-inner">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <div className="inline-block px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
              Status: Aguardando Homologação da PROAD
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Solicitação Recebida com Sucesso
            </h1>
            <p className="text-xs text-slate-300 mt-2 max-w-md mx-auto">
              Seus dados foram registrados com segurança no ecossistema central. O acesso aos módulos (SGC, PCA, Manutenção e Diárias) será liberado após conferência pela equipe de administração.
            </p>
          </div>

          {/* Feedback de verificação */}
          {statusMsg && (
            <div className="mb-5 p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Resumo do Usuário */}
          <div className="bg-slate-950/70 border border-white/10 rounded-xl p-4 text-xs space-y-3 mb-6">
            <div className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-white/10 pb-1.5">
              Resumo do Cadastro Enviado
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block text-[11px]">Nome:</span>
                <span className="text-white font-medium">{user?.nome}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">E-mail:</span>
                <span className="text-white font-medium truncate block">{user?.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">CPF:</span>
                <span className="text-white font-medium">{user?.cpf}</span>
              </div>

              {user?.tipoUsuario === 'SERVIDOR_UERN' ? (
                <>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Matrícula UERN:</span>
                    <span className="text-white font-medium">{user?.matricula || '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[11px]">Unidade de Lotação:</span>
                    <span className="text-amber-300 font-medium">
                      {user?.unidadeSigla} - {user?.unidadeNome}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-slate-400 block text-[11px]">CNPJ da Empresa:</span>
                    <span className="text-white font-medium">{user?.cnpjEmpresa || '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[11px]">Razão Social:</span>
                    <span className="text-amber-300 font-medium">{user?.razaoSocial}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => carregarStatus(true)}
              disabled={verificando}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verificando ? 'animate-spin' : ''}`} />
              {verificando ? 'Verificando com o servidor...' : 'Verificar se já Fui Aprovado'}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2 px-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-xs flex items-center justify-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair e Retornar Mais Tarde
            </button>
          </div>
        </div>

        {/* Informações de Contato / Suporte */}
        <div className="text-center mt-6 text-xs text-slate-400 space-y-1">
          <p>Dúvidas ou urgência no acesso? Entre em contato com a PROAD:</p>
          <p className="text-amber-300 font-medium">proad@uern.br • (84) 3315-2121</p>
        </div>
      </div>
    </div>
  );
}
