'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Building2,
  Users,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Wrench,
  ThermometerSnowflake,
  FileText,
  Plane,
} from 'lucide-react';
import Link from 'next/link';

interface PerfilTreino {
  titulo: string;
  nome: string;
  email: string;
  icone: string;
  papel: string;
  badge: string;
  corBadge: string;
  descricao: string;
  sistemas: string[];
}

export default function TreinamentoPage() {
  const router = useRouter();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [resetando, setResetando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const perfis: PerfilTreino[] = [
    {
      titulo: 'Administrador Geral / Instrutor',
      nome: 'Instrutor PROAD',
      email: 'aluno.admin@uern.br',
      icone: '🏛️',
      papel: 'ADMIN_PROAD',
      badge: 'Acesso Máximo Total',
      corBadge: 'bg-purple-100 text-purple-800 border-purple-200',
      descricao: 'Acesso amplo e irrestrito a todos os 6 subsistemas: homologação, auditoria, parametrização, contratos e reset da turma.',
      sistemas: ['Portal Central', 'SGC', 'SIG-CLIMA', 'Manutenção Predial', 'PCA', 'Diárias'],
    },
    {
      titulo: 'Fiscal Administrativo / Gestor',
      nome: 'Dra. Renata Medeiros',
      email: 'aluno.fiscal.adm@uern.br',
      icone: '📋',
      papel: 'FISCAL_ADM',
      badge: 'Gestão Orçamentária',
      corBadge: 'bg-blue-100 text-blue-800 border-blue-200',
      descricao: 'Abertura de OS prévia estimativa, acompanhamento de limites e saldos contratuais, atestes de medições e aprovação de orçamentos.',
      sistemas: ['SGC', 'SIG-CLIMA', 'Manutenção Predial', 'PCA'],
    },
    {
      titulo: 'Fiscal Técnico',
      nome: 'Eng. Carlos Eduardo',
      email: 'aluno.fiscal.tec@uern.br',
      icone: '🔍',
      papel: 'FISCAL_TECNICO',
      badge: 'Vistoria e Pareceres',
      corBadge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      descricao: 'Avaliação técnica de orçamentos, vistorias in loco de equipamentos, validação de peças e emissão de atestes parciais.',
      sistemas: ['SGC', 'SIG-CLIMA', 'Manutenção Predial'],
    },
    {
      titulo: 'Demandante da Unidade',
      nome: 'Profª Fátima Souza',
      email: 'aluno.demandante@uern.br',
      icone: '🎓',
      papel: 'DEMANDANTE',
      badge: 'Unidade Requisitante',
      corBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      descricao: 'Praticar o fluxo da ponta: abertura de chamados de refrigeração/obras, cadastro de ambientes/máquinas e o novo ateste tácito de 5 dias.',
      sistemas: ['Portal Central', 'SIG-CLIMA', 'Manutenção Predial', 'Diárias', 'PCA (DFD)'],
    },
    {
      titulo: 'Empresa Prestadora / Contratada',
      nome: 'Roberto Silva (Preposto ECOCLIMA)',
      email: 'aluno.empresa@prestadora.com',
      icone: '🛠️',
      papel: 'EMPRESA',
      badge: 'Contratada Terceirizada',
      corBadge: 'bg-amber-100 text-amber-800 border-amber-200',
      descricao: 'Visão externa do prestador: recebimento de chamados, elaboração de orçamentos com tabela de peças, laudos de condenação e conclusão de serviços.',
      sistemas: ['SIG-CLIMA', 'Manutenção Predial', 'SGC'],
    },
    {
      titulo: 'Pedro Rebouças (Admin PROAD)',
      nome: 'Pedro Rebouças de Oliveira Neto',
      email: 'pedroreboucas@uern.br',
      icone: '⭐',
      papel: 'ADMIN_PROAD',
      badge: 'Gestor Titular PROAD',
      corBadge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      descricao: 'Acesso mestre direto com suas credenciais oficiais institucionalizadas em todos os módulos.',
      sistemas: ['Todos os 6 Subsistemas'],
    },
  ];

  const handleEntrarComo = async (perfil: PerfilTreino) => {
    setLoadingEmail(perfil.email);
    setMensagem(null);
    setErro(null);

    try {
      const res = await fetch('/api/treinamento/simular-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: perfil.email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao simular login de treinamento.');
      }

      // Ativa flag no localStorage para manter a tarja amarela de treinamento ativa em todos os subsistemas
      localStorage.setItem('uern_modo_treinamento', 'true');

      setMensagem(`Autenticado com sucesso como ${perfil.nome}! Redirecionando para o Hub...`);
      setTimeout(() => {
        router.push(data.redirect || '/hub');
      }, 700);
    } catch (err: any) {
      setErro(err.message || 'Erro ao conectar ao perfil de treinamento.');
      setLoadingEmail(null);
    }
  };

  const handleResetarBase = async () => {
    if (
      !confirm(
        'ATENÇÃO INSTRUTOR PROAD:\n\nDeseja realmente RESETAR todos os dados didáticos do ambiente de treinamento?\n\nTodas as solicitações simuladas, orçamentos e chamados da turma atual serão apagados e a base voltará ao estado inicial com os usuários e contratos didáticos padrões. A produção oficial NÃO será afetada.'
      )
    ) {
      return;
    }

    setResetando(true);
    setMensagem(null);
    setErro(null);

    try {
      const res = await fetch('/api/treinamento/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao resetar banco de treinamento.');
      }

      setMensagem('Base de dados de treinamento resetada e semeada com sucesso! Pronta para a turma.');
    } catch (err: any) {
      setErro(err.message || 'Erro ao resetar ambiente.');
    } finally {
      setResetando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Tarja Amarela Oficial de Treinamento */}
      <div className="bg-amber-400 text-slate-950 px-4 py-2.5 font-bold text-xs uppercase tracking-wider flex items-center justify-between border-b border-amber-500 shadow-md">
        <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
          <ShieldAlert className="w-5 h-5 text-slate-950 flex-shrink-0 animate-pulse" />
          <span>
            AMBIENTE DE TREINAMENTO & CAPACITAÇÃO PROAD • SANDBOX DIDÁTICO ISOLADO (DADOS SEM VALIDADE JURÍDICA)
          </span>
        </div>
      </div>

      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                Hub de Treinamento PROAD • UERN
              </h1>
              <p className="text-xs text-slate-400">Simulador de papéis e capacitação de servidores</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetarBase}
              disabled={resetando}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all cursor-pointer disabled:opacity-50"
              title="Apagar dados criados pelos alunos e restaurar estado zero"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resetando ? 'animate-spin' : ''}`} />
              <span>{resetando ? 'Resetando...' : 'Resetar Dados da Turma'}</span>
            </button>
            <Link
              href="/"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              Ir para Login Oficial
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Banner Explicativo */}
        <div className="bg-gradient-to-r from-amber-500/10 via-slate-800/60 to-blue-500/10 border border-amber-500/30 p-6 rounded-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            Banco de Dados Isolado no Neon • Zero Risco para a Produção
          </div>
          <h2 className="text-xl font-bold text-white">
            Como acessar o ambiente de treinamento como Administrador?
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
            Basta clicar em qualquer um dos cartões abaixo para entrar instantaneamente no sistema com o papel
            correspondente. Ao escolher o perfil de <strong>Administrador Geral</strong>, você terá visão e controle
            pleno sobre todos os módulos do Portal, SGC, SIG-CLIMA, Manutenção Predial, PCA e Diárias.
          </p>
        </div>

        {mensagem && (
          <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{mensagem}</span>
          </div>
        )}

        {erro && (
          <div className="p-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-sm flex items-center gap-3 animate-in fade-in">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {/* Grade de Perfis Didáticos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {perfis.map((p) => {
            const isLoading = loadingEmail === p.email;
            return (
              <div
                key={p.email}
                className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 hover:border-amber-400/50 hover:bg-slate-800 transition-all flex flex-col justify-between shadow-lg group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="text-3xl p-2 rounded-xl bg-slate-900 border border-slate-700 group-hover:scale-110 transition-transform">
                      {p.icone}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${p.corBadge}`}>
                      {p.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                      {p.titulo}
                    </h3>
                    <p className="text-xs text-slate-300 font-medium">{p.nome}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{p.email}</p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{p.descricao}</p>

                  <div className="pt-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Módulos com Acesso Didático:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {p.sistemas.map((sis) => (
                        <span
                          key={sis}
                          className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] border border-slate-700 font-medium"
                        >
                          {sis}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-5 border-t border-slate-700/60 mt-4">
                  <button
                    onClick={() => handleEntrarComo(p)}
                    disabled={isLoading || loadingEmail !== null}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 hover:shadow-amber-500/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span>{isLoading ? 'Autenticando...' : 'Entrar com este Perfil'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Links Rápidos para Subsistemas no Treinamento */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            Acesso Direto aos Subsistemas em Modo Treinamento
          </h3>
          <p className="text-xs text-slate-400">
            Você também pode abrir os subsistemas diretamente com o modo treinamento ativado através das URLs abaixo:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <a
              href="https://climatizacao-uern.vercel.app/?treinamento=1"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-amber-400/50 flex items-center justify-between text-xs text-slate-200 font-semibold transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <ThermometerSnowflake className="w-4 h-4 text-sky-400" />
                <span>SIG-CLIMA (Climatização)</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
            </a>

            <a
              href="https://sgc-uern.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-amber-400/50 flex items-center justify-between text-xs text-slate-200 font-semibold transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>SGC (Contratos e Atas)</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
            </a>

            <a
              href="https://manutencao-uern.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-amber-400/50 flex items-center justify-between text-xs text-slate-200 font-semibold transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Wrench className="w-4 h-4 text-amber-400" />
                <span>Manutenção Predial</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
            </a>

            <a
              href="https://pca-uern.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-amber-400/50 flex items-center justify-between text-xs text-slate-200 font-semibold transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span>PCA (Contratações)</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
            </a>

            <a
              href="https://diarias-proaduern.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-amber-400/50 flex items-center justify-between text-xs text-slate-200 font-semibold transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Plane className="w-4 h-4 text-indigo-400" />
                <span>Diárias e Passagens</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
            </a>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        Pró-Reitoria de Administração (PROAD) • Universidade do Estado do Rio Grande do Norte (UERN)
      </footer>
    </div>
  );
}
