'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  UserCheck,
  CreditCard,
  Hash,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  ArrowLeft,
  Check,
  Edit3,
  X,
  AlertTriangle
} from 'lucide-react';
import {
  validarCpf,
  validarMatricula,
  formatarCpf,
  formatarMatricula,
  normalizarMatriculaUern,
} from '@/lib/validators';

interface Unidade {
  id: string;
  sigla: string;
  nome: string;
  campus: string;
  predioNome?: string | null;
}

export default function PreCadastroPage() {
  const router = useRouter();

  // Dados do formulário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [matricula, setMatricula] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [unidadeId, setUnidadeId] = useState('');

  // Unidades da UERN
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(true);

  // Estados de feedback e edição
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [motivoDevolucaoAlerta, setMotivoDevolucaoAlerta] = useState<string | null>(null);
  const [showModalRevisao, setShowModalRevisao] = useState(false);

  // Validação em tempo real
  const cpfValido = cpf.replace(/\D/g, '').length === 11 ? validarCpf(cpf) : null;
  const matriculaValida = matricula.replace(/\D/g, '').length >= 2 ? validarMatricula(matricula) : null;

  useEffect(() => {
    async function inicializarDados() {
      // 1. Verifica se já existe sessão ativa com cadastro pendente ou devolvido
      try {
        const resMe = await fetch('/api/auth/me');
        if (resMe.ok) {
          const dataMe = await resMe.json();
          if (dataMe.authenticated && dataMe.user) {
            const u = dataMe.user;
            if (u.email) setEmail(u.email);
            if (u.nome && u.nome.includes(' ')) setNome(u.nome);
            if (u.cpf) setCpf(u.cpf);
            if (u.matricula) setMatricula(u.matricula);
            if (u.telefone) setTelefone(u.telefone);
            if (u.unidadeId) setUnidadeId(u.unidadeId);
            if (u.status === 'DEVOLVIDO_CORRECAO' && u.motivoDevolucao) {
              setMotivoDevolucaoAlerta(u.motivoDevolucao);
            }
          }
        }
      } catch (e) {
        console.error('Erro ao verificar usuário existente:', e);
      }

      // 2. Se não pegou do auth/me, tenta recuperar do sessionStorage do Google
      const googleDataRaw = sessionStorage.getItem('preCadastro_google');
      if (googleDataRaw) {
        try {
          const parsed = JSON.parse(googleDataRaw);
          if (parsed.email) setEmail(parsed.email);
          // Só aproveita o nome se vier nome civil com sobrenome (com espaço)
          if (parsed.nome && parsed.nome.trim().includes(' ')) {
            setNome(parsed.nome.trim());
          }
        } catch (e) {
          console.error(e);
        }
      }

      // 3. Busca lista de unidades do banco central
      try {
        const res = await fetch('/api/unidades');
        if (res.ok) {
          const data = await res.json();
          setUnidades(data.unidades || []);
          if (data.unidades && data.unidades.length > 0 && !unidadeId) {
            setUnidadeId(data.unidades[0].id);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar unidades:', err);
      } finally {
        setLoadingUnidades(false);
      }
    }

    inicializarDados();
  }, []);

  // Formata CPF ao digitar
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatarCpf(e.target.value);
    setCpf(formatted);
  };

  // Matrícula: permite digitar números corridos
  const handleMatriculaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d-]/g, '').slice(0, 8);
    setMatricula(raw);
  };

  // Ao sair do campo (onBlur), auto-completa os zeros à esquerda
  const handleMatriculaBlur = () => {
    if (matricula) {
      const normalizada = normalizarMatriculaUern(matricula);
      if (normalizada) {
        setMatricula(normalizada);
      }
    }
  };

  // Validação prévia para abrir o modal de revisão
  const handleAbrirRevisao = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Valida Nome com pelo menos nome e sobrenome
    if (!nome.trim() || !nome.trim().includes(' ')) {
      setErrorMsg('Por favor, informe seu Nome Completo Civil por extenso (com nome e sobrenome). Evite abreviações ou apenas seu nome de usuário.');
      return;
    }

    if (!validarCpf(cpf)) {
      setErrorMsg('O CPF digitado é inválido. Por favor, verifique os 11 dígitos.');
      return;
    }

    const matNormalizada = normalizarMatriculaUern(matricula);
    if (!validarMatricula(matNormalizada)) {
      setErrorMsg('A matrícula deve conter números válidos da UERN (ex: 81558 ou 008155-8).');
      return;
    }
    // Garante que o estado reflita a normalizada
    setMatricula(matNormalizada);

    if (!unidadeId) {
      setErrorMsg('Por favor, selecione sua unidade de lotação na UERN.');
      return;
    }

    setShowModalRevisao(true);
  };

  // Envio final para a API
  const handleConfirmarEnvio = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const matFinal = normalizarMatriculaUern(matricula);

      const res = await fetch('/api/auth/pre-cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim(),
          cpf: formatarCpf(cpf),
          matricula: matFinal,
          unidadeId,
          telefone: telefone ? telefone.trim() : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar cadastro.');
      }

      // Limpa dados temporários
      sessionStorage.removeItem('preCadastro_google');
      setShowModalRevisao(false);

      // Redireciona para tela de quarentena
      router.push('/quarentena');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado.');
      setShowModalRevisao(false);
    } finally {
      setLoading(false);
    }
  };

  // Agrupa unidades por campus
  const unidadesPorCampus = unidades.reduce((acc, u) => {
    if (!acc[u.campus]) acc[u.campus] = [];
    acc[u.campus].push(u);
    return acc;
  }, {} as Record<string, Unidade[]>);

  const unidadeSelecionada = unidades.find((u) => u.id === unidadeId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001f3f] via-[#002b55] to-[#00132b] text-slate-100 flex flex-col justify-between py-8 px-4">
      <div className="max-w-2xl mx-auto w-full">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Login
          </button>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">PROAD • UERN</span>
          </div>
        </div>

        {/* Card do Formulário */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
              <UserCheck className="w-3.5 h-3.5" /> Identificação Institucional
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Autocadastro de Servidor da UERN
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Informe seus dados funcionais completos. Você poderá revisar todas as informações antes de enviar para homologação da PROAD.
            </p>
          </div>

          {/* Alerta de Devolução pelo Administrador */}
          {motivoDevolucaoAlerta && (
            <div className="mb-6 p-4 rounded-xl bg-amber-950/80 border border-amber-500/60 text-amber-200 text-xs flex items-start gap-3 shadow-lg">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold text-sm">
                  Cadastro Devolvido pela Administração para Correção:
                </strong>
                <p className="mt-1 text-amber-300 italic">
                  &ldquo;{motivoDevolucaoAlerta}&rdquo;
                </p>
                <p className="mt-2 text-slate-300 text-[11px]">
                  Efetue os ajustes necessários nos campos abaixo e clique em &ldquo;Revisar e Reenviar&rdquo;.
                </p>
              </div>
            </div>
          )}

          {/* Erro */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Não foi possível prosseguir:</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleAbrirRevisao} className="space-y-5">
            {/* Linha 1: Nome e E-mail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Nome Completo Civil *
                  </label>
                  <span className="text-[10px] text-slate-400">Sem apelidos/login</span>
                </div>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Mário Sérgio Leite"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-white placeholder-slate-500 outline-none transition"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Informe seu nome completo por extenso. Não use seu nome de usuário.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  E-mail Institucional (@uern.br)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    readOnly
                    value={email}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-amber-200 cursor-not-allowed outline-none"
                    title="O e-mail institucional é autenticado via Google Workspace institucional."
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Autenticado via Google Workspace institucional.
                </span>
              </div>
            </div>

            {/* Linha 2: Matrícula e CPF */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Matrícula Funcional */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Matrícula Funcional UERN *
                  </label>
                  {matriculaValida === true && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Matrícula Válida
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={matricula}
                    onChange={handleMatriculaChange}
                    onBlur={handleMatriculaBlur}
                    placeholder="Ex: 81558 ou 008155-8"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-white placeholder-slate-500 outline-none transition font-mono"
                  />
                </div>
                <span className="text-[10px] text-amber-300/80 mt-1 block">
                  Digite os números corridos (ex: 81558). O sistema preenche os zeros automaticamente para 008155-8.
                </span>
              </div>

              {/* CPF com validação algorítmica */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    CPF (Validação Oficial) *
                  </label>
                  {cpfValido === true && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3 h-3" /> CPF Válido
                    </span>
                  )}
                  {cpfValido === false && (
                    <span className="text-[11px] text-red-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3" /> CPF Inválido
                    </span>
                  )}
                </div>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    maxLength={14}
                    value={cpf}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Conferência algorítmica dos 11 dígitos da Receita Federal.
                </span>
              </div>
            </div>

            {/* Linha 3: Unidade de Lotação */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Unidade de Lotação / Vínculo (UERN) *
              </label>
              {loadingUnidades ? (
                <div className="py-2.5 px-3 bg-slate-950/60 rounded-xl text-xs text-slate-400 border border-slate-800">
                  Carregando lista oficial de unidades...
                </div>
              ) : (
                <select
                  required
                  value={unidadeId}
                  onChange={(e) => setUnidadeId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-white outline-none transition cursor-pointer"
                >
                  <option value="" disabled>Selecione sua unidade...</option>
                  {Object.entries(unidadesPorCampus).map(([campus, lista]) => (
                    <optgroup key={campus} label={`Campus ${campus}`}>
                      {lista.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.sigla} - {u.nome} {u.predioNome ? `(${u.predioNome})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
              <span className="text-[10px] text-slate-400 mt-1 block">
                Selecione o setor, departamento, faculdade ou pró-reitoria onde você está lotado.
              </span>
            </div>

            {/* Linha 4: Telefone / WhatsApp */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Telefone de Contato / WhatsApp (Opcional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(84) 99999-9999 ou ramal"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-white placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            {/* Botão de Revisão */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={loading || cpfValido === false}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Revisar e Enviar para Homologação da PROAD</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* MODAL DE REVISÃO E CONFERÊNCIA ANTES DO ENVIO */}
      {showModalRevisao && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Conferência de Dados do Cadastro</h3>
                  <p className="text-[11px] text-slate-400">Verifique se suas informações estão corretas antes de enviar.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModalRevisao(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950/80 rounded-xl p-4 border border-white/10 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Nome Completo Civil:</span>
                <strong className="text-white text-sm block mt-0.5">{nome}</strong>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Matrícula UERN:</span>
                  <span className="text-amber-300 font-mono font-bold">{normalizarMatriculaUern(matricula)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">CPF:</span>
                  <span className="text-white font-mono">{cpf}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">E-mail Institucional:</span>
                <span className="text-amber-200">{email}</span>
              </div>

              <div className="pt-2 border-t border-white/5">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Unidade de Lotação:</span>
                <span className="text-emerald-300 font-semibold block">
                  {unidadeSelecionada?.sigla} - {unidadeSelecionada?.nome} ({unidadeSelecionada?.campus})
                </span>
              </div>

              {telefone && (
                <div className="pt-2 border-t border-white/5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Telefone:</span>
                  <span className="text-slate-200">{telefone}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModalRevisao(false)}
                className="px-4 py-2.5 rounded-xl border border-white/15 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Voltar e Corrigir</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmarEnvio}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 transition shadow shadow-amber-500/20 active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Enviando dados...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar e Enviar à PROAD</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
