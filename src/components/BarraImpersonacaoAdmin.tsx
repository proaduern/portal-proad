'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ChevronDown,
  Building2,
  FileText,
  Wrench,
  DollarSign,
  Briefcase,
  X,
  Sparkles,
  Plane,
  Scale,
  Search,
  UserCheck,
  Building,
  Loader2,
} from 'lucide-react';

interface BarraImpersonacaoAdminProps {
  sessaoReal?: any;
  sessaoAtual?: any;
}

export default function BarraImpersonacaoAdmin({
  sessaoReal,
  sessaoAtual,
}: BarraImpersonacaoAdminProps) {
  const [isPending, startTransition] = useTransition();
  const [menuAberto, setMenuAberto] = useState(false);
  const [modalBuscaAberto, setModalBuscaAberto] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);

  const isAdminReal =
    sessaoReal?.perfilSgc === 'ADMIN_PROAD' ||
    sessaoReal?.perfilManut === 'ADMIN' ||
    Boolean(sessaoReal?.perfilPca?.toUpperCase().includes('ADMIN')) ||
    sessaoReal?.email === 'adj.proad@uern.br' ||
    sessaoReal?.email === 'pedroreboucas@uern.br';

  if (!isAdminReal) {
    return null;
  }

  const isImpersonando =
    sessaoAtual &&
    (sessaoAtual.id !== sessaoReal?.id ||
      sessaoAtual.id.startsWith('sim_'));

  // Busca de usuários com debounce
  useEffect(() => {
    if (!modalBuscaAberto) return;
    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await fetch(`/api/admin/usuarios/busca?q=${encodeURIComponent(termoBusca)}`);
        if (res.ok) {
          const data = await res.json();
          setResultadosBusca(data.usuarios || []);
        }
      } catch (err) {
        console.error('Erro ao buscar usuários:', err);
      } finally {
        setBuscando(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [termoBusca, modalBuscaAberto]);

  const handleTrocarParaUsuarioReal = async (u: any) => {
    setModalBuscaAberto(false);
    setMenuAberto(false);
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/atuar-como', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'USUARIO_REAL',
            usuarioId: u.id,
          }),
        });
        if (res.ok) {
          window.location.reload();
        } else {
          const data = await res.json();
          alert(data.error || 'Erro ao alternar para este usuário.');
        }
      } catch (err: any) {
        alert(err.message || 'Erro de conexão.');
      }
    });
  };

  const handleTrocarPerfil = async (opcoes: {
    tipo?: 'ARQUETIPO' | 'FORNECEDOR' | 'USUARIO_REAL';
    role?: string;
    usuarioId?: string;
    fornecedorNome?: string;
    fornecedorCnpj?: string;
  }) => {
    setMenuAberto(false);
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/atuar-como', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(opcoes),
        });
        if (res.ok) {
          window.location.reload();
        } else {
          const data = await res.json();
          alert(data.error || 'Erro ao alternar perfil.');
        }
      } catch (err: any) {
        alert(err.message || 'Erro de conexão.');
      }
    });
  };

  const handleEncerrar = async () => {
    setMenuAberto(false);
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/encerrar-atuar-como', {
          method: 'POST',
        });
        if (res.ok) {
          window.location.reload();
        } else {
          alert('Erro ao retornar para o modo Administrador.');
        }
      } catch (err: any) {
        alert(err.message || 'Erro de conexão.');
      }
    });
  };

  const isUsuarioReal = sessaoAtual && !sessaoAtual.id.startsWith('sim_') && sessaoAtual.id !== sessaoReal?.id;

  return (
    <>
      {isImpersonando ? (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-slate-950 px-4 py-2 border-b border-amber-400 shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-black/20 text-white animate-pulse">
                <ShieldAlert className="w-4 h-4 text-yellow-100" />
              </span>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-black text-amber-300 font-extrabold uppercase px-1.5 py-0.5 rounded text-[10px] tracking-wider">
                    {isUsuarioReal ? '🎭 Atuando como Usuário Real' : 'Modo Simulação PROAD'}
                  </span>
                  <span>Operando como:</span>
                  <strong className="text-black bg-white/80 px-2 py-0.5 rounded font-black shadow-sm">
                    {sessaoAtual?.nome}
                  </strong>
                  <span className="text-amber-950 font-bold">
                    {sessaoAtual?.tipoUsuario === 'FORNECEDOR_EXTERNO' ? (
                      <>• Empresa: {sessaoAtual?.razaoSocial || sessaoAtual?.nome} (CNPJ: {sessaoAtual?.cnpjEmpresa || '—'})</>
                    ) : (
                      <>• Matrícula: {sessaoAtual?.matricula || '—'} {sessaoAtual?.unidadeSigla ? `(${sessaoAtual?.unidadeSigla})` : ''}</>
                    )}
                  </span>
                </div>
                <div className="text-[11px] text-amber-950 mt-0.5">
                  Sessão Real Preservada: <strong>{sessaoReal?.nome}</strong> ({sessaoReal?.email})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 relative">
              <button
                type="button"
                onClick={() => setModalBuscaAberto(true)}
                disabled={isPending}
                className="px-2.5 py-1 rounded bg-black/20 hover:bg-black/30 text-slate-950 font-black flex items-center gap-1 border border-black/10 transition shadow-sm cursor-pointer"
                title="Buscar e selecionar outro usuário real ativo"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Trocar Usuário</span>
              </button>

              <button
                type="button"
                onClick={() => setMenuAberto(!menuAberto)}
                disabled={isPending}
                className="px-2.5 py-1 rounded bg-black/10 hover:bg-black/20 text-slate-950 font-bold flex items-center gap-1 border border-black/10 transition"
              >
                <span>Opções</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleEncerrar}
                disabled={isPending}
                className="px-3 py-1 rounded-lg bg-slate-950 text-white hover:bg-slate-900 font-bold flex items-center gap-1.5 shadow transition disabled:opacity-50 cursor-pointer"
                title="Restaurar modo Administrador PROAD"
              >
                <X className="w-3.5 h-3.5 text-amber-400" />
                <span>{isPending ? 'Saindo...' : 'Voltar para Admin'}</span>
              </button>

              {menuAberto && (
                <div className="absolute right-0 top-9 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Alternar Perfil
                    </span>
                    <button
                      onClick={() => setMenuAberto(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setMenuAberto(false);
                      setModalBuscaAberto(true);
                    }}
                    className="w-full text-left px-3 py-2 text-xs bg-amber-50/70 hover:bg-amber-100/70 text-amber-950 flex items-center gap-2 transition font-bold border-b border-amber-200"
                  >
                    <Search className="w-4 h-4 text-amber-600" />
                    <div>
                      <div>Buscar Usuário Real Ativo...</div>
                      <div className="text-[10px] text-amber-700 font-normal">Selecione qualquer servidor ou fornecedor</div>
                    </div>
                  </button>

                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                    Arquétipos Didáticos
                  </div>
                  <button
                    onClick={() => handleTrocarPerfil({ role: 'GESTOR' })}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 transition"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Gestor do Contrato</div>
                      <div className="text-[10px] text-slate-500">Gestão global e recebimento</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrocarPerfil({ role: 'FISCAL_ADMINISTRATIVO' })}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 transition"
                  >
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Fiscal Administrativo</div>
                      <div className="text-[10px] text-slate-500">Conta vinculada e encargos</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrocarPerfil({ role: 'FISCAL_TECNICO' })}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 transition"
                  >
                    <Wrench className="w-4 h-4 text-orange-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Fiscal Técnico</div>
                      <div className="text-[10px] text-slate-500">Atestes provisórios e medições</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrocarPerfil({ role: 'DEMANDANTE' })}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 transition"
                  >
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Demandante da Unidade</div>
                      <div className="text-[10px] text-slate-500">Abertura de chamados e DFDs</div>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 p-2 mt-1">
                    <button
                      onClick={handleEncerrar}
                      className="w-full text-center py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition"
                    >
                      Voltar ao Administrador PROAD
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 text-slate-200 border-b border-slate-800 px-4 py-1.5 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>
                Sessão Oficial PROAD: <strong>{sessaoReal?.nome}</strong> (Administrador Geral)
              </span>
            </div>

            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalBuscaAberto(true)}
                className="px-2.5 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1.5 transition text-[11px] cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>🎭 Atuar Como Usuário...</span>
                <Search className="w-3 h-3 ml-0.5" />
              </button>

              <Link
                href="/admin"
                className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-[11px] transition hidden sm:inline-block"
              >
                Lista de Usuários
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Busca Rápida de Usuários Reais */}
      {modalBuscaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            {/* Cabeçalho do Modal */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Atuar como Usuário Real Ativo</h3>
                  <p className="text-[11px] text-slate-400">
                    Selecione um usuário ativo para visualizar o Portal e os subsistemas sob a ótica dele.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalBuscaAberto(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input de Busca */}
            <div className="p-4 border-b border-white/10 bg-slate-950/30">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  placeholder="Buscar por nome, e-mail, matrícula, CPF ou empresa..."
                  autoFocus
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
                {buscando && (
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                )}
              </div>
            </div>

            {/* Lista de Resultados */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {resultadosBusca.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  {buscando ? (
                    <span>Carregando usuários ativos...</span>
                  ) : termoBusca ? (
                    <span>Nenhum usuário ativo encontrado para "{termoBusca}".</span>
                  ) : (
                    <span>Digite para pesquisar servidores Hermes ou fornecedores credenciados.</span>
                  )}
                </div>
              ) : (
                resultadosBusca.map((u) => {
                  const isServidor = u.tipoUsuario === 'SERVIDOR_UERN';
                  return (
                    <div
                      key={u.id}
                      className="p-3 rounded-xl bg-white/5 hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/40 transition flex items-center justify-between gap-3 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <strong className="text-xs text-white group-hover:text-amber-300 transition truncate">
                            {u.nome}
                          </strong>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              isServidor
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            {isServidor ? 'Servidor UERN' : 'Fornecedor'}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                          <span>{u.email}</span>
                          {isServidor ? (
                            <>
                              <span>•</span>
                              <span>Matrícula: <strong>{u.matricula || '—'}</strong></span>
                              <span>•</span>
                              <span className="text-amber-300/90 font-medium">
                                {u.unidade?.sigla || 'Sem Unidade'} {u.unidade?.campus ? `(${u.unidade.campus})` : ''}
                              </span>
                            </>
                          ) : (
                            <>
                              <span>•</span>
                              <span>CNPJ: {u.cnpjEmpresa || '—'}</span>
                              <span>•</span>
                              <span className="text-purple-300/90 font-medium truncate max-w-[200px]">
                                {u.razaoSocial || 'Fornecedor Externo'}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Perfis nos subsistemas */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {u.perfilSgc && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-500/30 text-[9px]">
                              SGC: {u.perfilSgc}
                            </span>
                          )}
                          {u.perfilPca && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-500/30 text-[9px]">
                              PCA: {u.perfilPca}
                            </span>
                          )}
                          {u.perfilManut && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-500/30 text-[9px]">
                              Manut: {u.perfilManut}
                            </span>
                          )}
                          {u.perfilClimatizacao && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-900/60 text-sky-200 border border-sky-500/30 text-[9px]">
                              Clima: {u.perfilClimatizacao}
                            </span>
                          )}
                          {u.perfilDiarias && (
                            <span className="px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-200 border border-cyan-500/30 text-[9px]">
                              Diárias: {u.perfilDiarias}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTrocarParaUsuarioReal(u)}
                        disabled={isPending}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1 shadow-md cursor-pointer shrink-0"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Atuar Como</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé */}
            <div className="p-3 border-t border-white/10 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
              <span>Para cadastrar ou editar usuários, acesse a gestão completa.</span>
              <Link
                href="/admin"
                onClick={() => setModalBuscaAberto(false)}
                className="text-amber-400 hover:text-amber-300 font-bold hover:underline"
              >
                Gerenciar Usuários (/admin) &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
