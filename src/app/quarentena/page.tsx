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
  Edit3,
  AlertTriangle,
  ArrowRight
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
        if (data.user.status === 'DEVOLVIDO_CORRECAO') {
          setStatusMsg('Seu cadastro está devolvido para correção. Por favor, ajuste os dados e reenvie.');
        } else {
          setStatusMsg('Seu cadastro continua em análise pela administração da PROAD.');
        }
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

  const isDevolvido = user?.status === 'DEVOLVIDO_CORRECAO';

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
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner ${
                isDevolvido
                  ? 'bg-rose-500/10 border-2 border-rose-500/40 text-rose-400'
                  : 'bg-amber-500/10 border-2 border-amber-500/40 text-amber-400'
              }`}
            >
              {isDevolvido ? (
                <AlertTriangle className="w-8 h-8 animate-pulse text-rose-400" />
              ) : (
                <Clock className="w-8 h-8 animate-pulse text-amber-400" />
              )}
            </div>

            <div
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-2 border ${
                isDevolvido
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              }`}
            >
              {isDevolvido
                ? 'Status: Devolvido para Correção pela Administração'
                : 'Status: Aguardando Homologação da PROAD'}
            </div>

            <h1 className="text-xl font-bold text-white tracking-tight">
              {isDevolvido ? 'Seu Cadastro Precisa de Ajustes' : 'Solicitação Recebida com Sucesso'}
            </h1>

            <p className="text-xs text-slate-300 mt-2 max-w-md mx-auto">
              {isDevolvido
                ? 'A equipe da PROAD analisou sua solicitação e apontou pendências a serem corrigidas antes da liberação dos acessos.'
                : 'Seus dados foram registrados com segurança no ecossistema central. O acesso aos módulos (SGC, PCA, Manutenção e Diárias) será liberado após conferência pela equipe de administração.'}
            </p>
          </div>

          {/* Banner de Devolução com Mensagem do Administrador */}
          {isDevolvido && user?.motivoDevolucao && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs shadow-lg space-y-2">
              <div className="flex items-center gap-2 text-rose-300 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Orientações da Administração da PROAD:</span>
              </div>
              <p className="text-white italic bg-black/40 p-3 rounded-lg border border-white/5">
                &ldquo;{user.motivoDevolucao}&rdquo;
              </p>
              <p className="text-[11px] text-slate-300">
                Clique no botão abaixo para ajustar seus dados cadastrais e reenviar.
              </p>
            </div>
          )}

          {/* Feedback de verificação */}
          {statusMsg && (
            <div className="mb-5 p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Resumo do Usuário */}
          <div className="bg-slate-950/70 border border-white/10 rounded-xl p-4 text-xs space-y-3 mb-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                Resumo do Cadastro Enviado
              </span>
              <button
                type="button"
                onClick={() => router.push('/pre-cadastro')}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline"
              >
                <Edit3 className="w-3 h-3" /> Editar Dados
              </button>
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
                    <span className="text-amber-300 font-medium font-mono">{user?.matricula || '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[11px]">Unidade de Lotação:</span>
                    <span className="text-emerald-300 font-medium">
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
            {/* Se estiver devolvido, botão de edição fica em destaque máximo */}
            {isDevolvido ? (
              <button
                type="button"
                onClick={() => router.push('/pre-cadastro')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-[0.99]"
              >
                <Edit3 className="w-4 h-4" />
                <span>Corrigir e Reenviar Meu Cadastro</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push('/pre-cadastro')}
                className="w-full py-2.5 px-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Editar Informações do Meu Cadastro</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => carregarStatus(true)}
              disabled={verificando}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-60"
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
