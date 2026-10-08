'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Briefcase,
  UserCheck,
  CreditCard,
  Lock,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  FileText,
} from 'lucide-react';
import {
  validarCnpj,
  validarCpf,
  formatarCnpj,
  formatarCpf,
} from '@/lib/validators';

export default function CredenciamentoPage() {
  const router = useRouter();

  // Dados da Empresa
  const [cnpj, setCnpj] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');

  // Dados do Representante
  const [nomeRepresentante, setNomeRepresentante] = useState('');
  const [cpfRepresentante, setCpfRepresentante] = useState('');
  const [cargoPreposto, setCargoPreposto] = useState('');

  // Acesso e Contato
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  // Feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Validação em tempo real
  const cnpjValido = cnpj.replace(/\D/g, '').length === 14 ? validarCnpj(cnpj) : null;
  const cpfValido = cpfRepresentante.replace(/\D/g, '').length === 11 ? validarCpf(cpfRepresentante) : null;

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnpj(formatarCnpj(e.target.value));
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpfRepresentante(formatarCpf(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validarCnpj(cnpj)) {
      setErrorMsg('O CNPJ digitado é inválido. Por favor, confira os números informados.');
      return;
    }

    if (!validarCpf(cpfRepresentante)) {
      setErrorMsg('O CPF do representante/preposto é inválido.');
      return;
    }

    if (senha.length < 6) {
      setErrorMsg('A senha de acesso deve ter pelo menos 6 caracteres.');
      return;
    }

    if (senha !== confirmarSenha) {
      setErrorMsg('A confirmação de senha não coincide com a senha digitada.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/fornecedor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'registro',
          cnpjEmpresa: cnpj,
          razaoSocial,
          nomeFantasia: nomeFantasia || razaoSocial,
          nome: nomeRepresentante,
          cpf: cpfRepresentante,
          cargoPreposto,
          email,
          telefone,
          senha,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao submeter credenciamento.');
      }

      router.push('/quarentena');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado ao solicitar credenciamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001f3f] via-[#002b55] to-[#00132b] text-slate-100 flex flex-col justify-between py-8 px-4">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
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
              <Briefcase className="w-3.5 h-3.5" /> Fornecedores & Prestadores de Serviço
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Credenciamento de Empresa Fornecedora
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Cadastre sua empresa para interagir com o Sistema de Gestão de Contratos (SGC) e Manutenção Predial da UERN.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Erro no preenchimento:</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bloco 1: Dados da Empresa */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-white/10 pb-2">
                <Building2 className="w-4 h-4" /> 1. Dados Jurídicos da Empresa
              </h2>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    CNPJ (Validação Oficial da Receita)
                  </label>
                  {cnpjValido === true && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> CNPJ Válido
                    </span>
                  )}
                  {cnpjValido === false && (
                    <span className="text-[11px] text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> CNPJ Inválido
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  maxLength={18}
                  value={cnpj}
                  onChange={handleCnpjChange}
                  placeholder="00.000.000/0000-00"
                  className={`w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border text-xs text-white placeholder-slate-500 outline-none transition ${
                    cnpjValido === false
                      ? 'border-red-500/70 focus:border-red-500'
                      : cnpjValido === true
                      ? 'border-emerald-500/70 focus:border-emerald-500'
                      : 'border-slate-700 focus:border-amber-500'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Razão Social
                  </label>
                  <input
                    type="text"
                    required
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    placeholder="Nome empresarial registrado"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Nome Fantasia (Opcional)
                  </label>
                  <input
                    type="text"
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    placeholder="Nome comercial da marca"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 2: Representante Legal / Preposto */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-white/10 pb-2">
                <UserCheck className="w-4 h-4" /> 2. Preposto / Representante Responsável
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Nome do Preposto / Representante
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeRepresentante}
                    onChange={(e) => setNomeRepresentante(e.target.value)}
                    placeholder="Nome completo do representante"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      CPF do Representante
                    </label>
                    {cpfValido === true && (
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Válido
                      </span>
                    )}
                    {cpfValido === false && (
                      <span className="text-[11px] text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Inválido
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    value={cpfRepresentante}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    className={`w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border text-xs text-white placeholder-slate-500 outline-none transition ${
                      cpfValido === false
                        ? 'border-red-500/70 focus:border-red-500'
                        : cpfValido === true
                        ? 'border-emerald-500/70 focus:border-emerald-500'
                        : 'border-slate-700 focus:border-amber-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Cargo / Função do Representante
                </label>
                <input
                  type="text"
                  value={cargoPreposto}
                  onChange={(e) => setCargoPreposto(e.target.value)}
                  placeholder="Ex: Sócio-Administrador, Procurador, Engenheiro Responsável"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-white placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            {/* Bloco 3: Dados de Login e Contato */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-white/10 pb-2">
                <Lock className="w-4 h-4" /> 3. Credenciais de Acesso e Contato
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    E-mail de Contato / Login
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="financeiro@empresa.com.br"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-white placeholder-slate-500 outline-none transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Telefone / WhatsApp da Empresa
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(84) 3333-0000"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-white placeholder-slate-500 outline-none transition"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Criar Senha de Acesso
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Confirmar Senha
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Repita a senha criada"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Enviar */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || cnpjValido === false || cpfValido === false}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submetendo credenciamento...' : 'Enviar Solicitação de Credenciamento'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
