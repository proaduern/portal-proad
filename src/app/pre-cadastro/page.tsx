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
} from 'lucide-react';
import {
  validarCpf,
  validarMatricula,
  formatarCpf,
  formatarMatricula,
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

  // Estados de feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Validação em tempo real
  const cpfValido = cpf.replace(/\D/g, '').length === 11 ? validarCpf(cpf) : null;
  const matriculaValida = matricula.length >= 8 ? validarMatricula(matricula) : null;

  useEffect(() => {
    // 1. Recupera dados passados pelo Google no sessionStorage
    const googleDataRaw = sessionStorage.getItem('preCadastro_google');
    if (googleDataRaw) {
      try {
        const parsed = JSON.parse(googleDataRaw);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.nome) setNome(parsed.nome);
      } catch (e) {
        console.error(e);
      }
    } else {
      // Se não houver, coloca valor padrão para facilitar teste
      setEmail('novo.servidor@uern.br');
      setNome('Novo Servidor UERN');
    }

    // 2. Busca lista de unidades do banco central
    async function carregarUnidades() {
      try {
        const res = await fetch('/api/unidades');
        if (res.ok) {
          const data = await res.json();
          setUnidades(data.unidades || []);
          if (data.unidades && data.unidades.length > 0) {
            setUnidadeId(data.unidades[0].id);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar unidades:', err);
      } finally {
        setLoadingUnidades(false);
      }
    }
    carregarUnidades();
  }, []);

  // Formata CPF ao digitar
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatarCpf(e.target.value);
    setCpf(formatted);
  };

  // Formata Matrícula ao digitar (xxxxxx-x)
  const handleMatriculaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatarMatricula(e.target.value);
    setMatricula(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validações no cliente
    if (!validarCpf(cpf)) {
      setErrorMsg('O CPF digitado é inválido. Por favor, verifique os 11 dígitos.');
      return;
    }

    if (!validarMatricula(matricula)) {
      setErrorMsg('A matrícula deve estar no formato oficial da UERN: 6 dígitos seguidos de hífen e dígito (ex: 123456-7).');
      return;
    }

    if (!unidadeId) {
      setErrorMsg('Por favor, selecione sua unidade de lotação na UERN.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/pre-cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          email,
          cpf,
          matricula,
          unidadeId,
          telefone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar pré-cadastro.');
      }

      // Limpa dados temporários
      sessionStorage.removeItem('preCadastro_google');

      // Redireciona para tela de quarentena
      router.push('/quarentena');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado.');
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
              <UserCheck className="w-3.5 h-3.5" /> Primeiro Acesso Institucional
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Pré-Cadastro de Servidor
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Complete suas informações funcionais da UERN. Após o envio, seu cadastro será analisado pela administração da PROAD para liberação dos sistemas (SGC, PCA, Manutenção e Diárias).
            </p>
          </div>

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

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Linha 1: Nome e E-mail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-white placeholder-slate-500 outline-none transition"
                />
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
                    Matrícula Funcional UERN
                  </label>
                  {matriculaValida === true && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Formato correto
                    </span>
                  )}
                  {matriculaValida === false && (
                    <span className="text-[11px] text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Use xxxxxx-x
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={matricula}
                    onChange={handleMatriculaChange}
                    placeholder="123456-7"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/70 border text-xs text-white placeholder-slate-500 outline-none transition ${
                      matriculaValida === false
                        ? 'border-red-500/70 focus:border-red-500'
                        : matriculaValida === true
                        ? 'border-emerald-500/70 focus:border-emerald-500'
                        : 'border-slate-700 focus:border-amber-500'
                    }`}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Padrão UERN de 6 dígitos seguidos de hífen e dígito verificador.
                </span>
              </div>

              {/* CPF com validação algorítmica */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    CPF (Validação Oficial)
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
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/70 border text-xs text-white placeholder-slate-500 outline-none transition ${
                      cpfValido === false
                        ? 'border-red-500/70 focus:border-red-500'
                        : cpfValido === true
                        ? 'border-emerald-500/70 focus:border-emerald-500'
                        : 'border-slate-700 focus:border-amber-500'
                    }`}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Os dígitos verificadores do CPF são conferidos algorítmicamente.
                </span>
              </div>
            </div>

            {/* Linha 3: Unidade de Lotação */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Unidade de Lotação / Vínculo (UERN)
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
                Selecione o setor, departamento, faculdade ou pró-reitoria onde você exerce suas atividades.
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

            {/* Botão de Envio */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={loading || cpfValido === false || matriculaValida === false}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processando pré-cadastro...' : 'Concluir e Enviar para Homologação PROAD'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
