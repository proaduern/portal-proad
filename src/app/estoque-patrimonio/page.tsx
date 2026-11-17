'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  PackageCheck,
  Archive,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Plus,
  X,
  ArrowLeft,
  ExternalLink,
  Calendar,
  MapPin,
  Truck,
  ChevronRight,
  FileText,
  User,
  Hash,
  Info,
  Layers,
  RefreshCw,
  Building2,
  DollarSign,
  Tag,
  Share2,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ITENS_PATRIMONIO_INICIAIS,
  PROCESSOS_AQUISICAO_INICIAIS,
  EMPRESTIMOS_ACERVO,
  EMPRESTIMOS_EVENTOS,
  ItemPatrimonio,
  LiberacaoItem,
  ProcessoAquisicao,
} from '@/data/patrimonioData';

function toIsoDate(dateStr?: string): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return '';
}

function toBrDate(dateStr?: string): string {
  if (!dateStr) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return dateStr;
}

type TabTipo =
  | 'BENS_PROAD'
  | 'BENS_OP'
  | 'CONSUMO'
  | 'CONCLUIDOS'
  | 'AQUISICOES'
  | 'EMPRESTIMOS'
  | 'CAMPUS_ANALYTICS';

export default function EstoquePatrimonioPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState<TabTipo>('BENS_PROAD');
  const [itens, setItens] = useState<ItemPatrimonio[]>(ITENS_PATRIMONIO_INICIAIS);
  const [processosAquisicao] = useState<ProcessoAquisicao[]>(PROCESSOS_AQUISICAO_INICIAIS);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
          const p = data.user.perfilPatrimonio || '';
          const isOnlyAlmox =
            p.includes('RESPONSAVEL_ALMOXARIFADO') &&
            !p.includes('ADMIN_PATRIMONIO') &&
            !p.includes('ADMIN_GERAL') &&
            !data.user.isAdminGeral;
          if (isOnlyAlmox) {
            setActiveTab('CONSUMO');
          }
        }
      })
      .catch((err) => console.error('Erro ao verificar autenticação:', err))
      .finally(() => setLoadingAuth(false));
  }, []);

  const isAdminGeral = Boolean(
    currentUser?.isAdminGeral ||
    currentUser?.perfilPatrimonio?.includes('ADMIN_GERAL') ||
    currentUser?.perfilSgc?.includes('ADMIN_PROAD') ||
    currentUser?.perfilPca?.includes('ADMIN') ||
    currentUser?.email === 'adj.proad@uern.br' ||
    currentUser?.email === 'pedroreboucas@uern.br'
  );

  const isPatrimonio = Boolean(
    currentUser?.perfilPatrimonio?.includes('ADMIN_PATRIMONIO')
  );

  const isAlmoxarifado = Boolean(
    currentUser?.perfilPatrimonio?.includes('RESPONSAVEL_ALMOXARIFADO')
  );

  const hasAcessoPatrimonio = isAdminGeral || isPatrimonio;
  const hasAcessoAlmoxarifado = isAdminGeral || isAlmoxarifado;
  const hasAcessoGeral = isAdminGeral || isPatrimonio || isAlmoxarifado;

  // Filtros de busca
  const [busca, setBusca] = useState('');
  const [filtroClassificacao, setFiltroClassificacao] = useState('TODAS');
  const [filtroFonte, setFiltroFonte] = useState('TODAS');
  const [filtroSituacao, setFiltroSituacao] = useState('TODAS');

  // Modal de Detalhes da Liberação
  const [modalLiberacaoAberta, setModalLiberacaoAberta] = useState(false);
  const [liberacaoSelecionada, setLiberacaoSelecionada] = useState<{
    itemNome: string;
    itemId: string;
    lib: LiberacaoItem;
    idx: number;
  } | null>(null);

  // Modal de Inserir Liberação
  const [modalNovaLiberacaoAberta, setModalNovaLiberacaoAberta] = useState(false);
  const [itemParaLiberar, setItemParaLiberar] = useState<ItemPatrimonio | null>(null);
  const [formNovaLiberacao, setFormNovaLiberacao] = useState({
    processo: '',
    destino: '',
    quantidade: 1,
    termoTransferencia: '',
    guiaMovimentacao: '',
    dataEntrega: new Date().toISOString().slice(0, 10),
    recebidoPor: '',
  });

  // Modal de Adicionar Novo Bem
  const [modalNovoItemAberto, setModalNovoItemAberto] = useState(false);
  const [formNovoItem, setFormNovoItem] = useState({
    origem: 'PROAD' as 'PROAD' | 'OP_CONVENIOS' | 'CONSUMO',
    classificacao: 'Equipamentos de Informática',
    nome: '',
    estadoBem: 'Novo',
    saldo: 1,
    valorUnitario: 0,
    processoAquisicao: '',
    fonteRecurso: 'Recursos Próprios (Tesouro Estadual)',
    tipoRecurso: '',
    destinoInicial: '11.01 - PROAD - PRÓ-REITORIA DE ADMINISTRAÇÃO',
  });

  // Alternar arquivamento (Processo Concluído)
  const handleToggleArquivado = (itemId: string) => {
    setItens((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          const novoStatus = !it.arquivado;
          return {
            ...it,
            arquivado: novoStatus,
            situacao: novoStatus ? 'Concluído / Arquivado' : it.saldo === 0 ? 'Estoque Zerado' : 'Aguardando Liberação',
          };
        }
        return it;
      })
    );
  };

  // Salvar alterações no modal da liberação
  const handleSalvarLiberacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liberacaoSelecionada) return;

    setItens((prev) =>
      prev.map((it) => {
        if (it.id === liberacaoSelecionada.itemId) {
          const novasLiberacoes = [...it.liberacoes];
          novasLiberacoes[liberacaoSelecionada.idx] = {
            ...novasLiberacoes[liberacaoSelecionada.idx],
            termoTransferencia: liberacaoSelecionada.lib.termoTransferencia,
            guiaMovimentacao: liberacaoSelecionada.lib.guiaMovimentacao,
            dataEntrega: liberacaoSelecionada.lib.dataEntrega,
            recebidoPor: liberacaoSelecionada.lib.recebidoPor,
          };
          return { ...it, liberacoes: novasLiberacoes };
        }
        return it;
      })
    );
    setModalLiberacaoAberta(false);
    alert('Dados do Termo de Transferência e Guia de Movimentação atualizados com sucesso!');
  };

  // Registrar nova liberação
  const handleCriarLiberacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemParaLiberar) return;

    if (formNovaLiberacao.quantidade > itemParaLiberar.saldo) {
      alert(`Quantidade informada (${formNovaLiberacao.quantidade}) é maior que o saldo em estoque (${itemParaLiberar.saldo}).`);
      return;
    }

    const novaLib: LiberacaoItem = {
      processo: formNovaLiberacao.processo,
      destino: formNovaLiberacao.destino,
      quantidade: Number(formNovaLiberacao.quantidade),
      termoTransferencia: formNovaLiberacao.termoTransferencia,
      guiaMovimentacao: formNovaLiberacao.guiaMovimentacao,
      dataEntrega: formNovaLiberacao.dataEntrega,
      recebidoPor: formNovaLiberacao.recebidoPor,
    };

    setItens((prev) =>
      prev.map((it) => {
        if (it.id === itemParaLiberar.id) {
          const novoSaldo = Math.max(0, it.saldo - novaLib.quantidade);
          return {
            ...it,
            saldo: novoSaldo,
            situacao: novoSaldo === 0 ? 'Estoque Zerado' : 'Liberado Parcialmente',
            liberacoes: [...it.liberacoes, novaLib],
          };
        }
        return it;
      })
    );

    setModalNovaLiberacaoAberta(false);
    setItemParaLiberar(null);
    alert('Liberação e Guia de Movimentação registradas com sucesso!');
  };

  // Criar novo bem
  const handleCriarNovoItem = (e: React.FormEvent) => {
    e.preventDefault();
    const novo: ItemPatrimonio = {
      id: `manual-${Date.now()}`,
      origem: formNovoItem.origem,
      classificacao: formNovoItem.classificacao,
      nome: formNovoItem.nome,
      estadoBem: formNovoItem.estadoBem,
      saldo: Number(formNovoItem.saldo),
      valorUnitario: Number(formNovoItem.valorUnitario),
      processoAquisicao: formNovoItem.processoAquisicao || '-',
      fonteRecurso: formNovoItem.fonteRecurso,
      tipoRecurso: formNovoItem.tipoRecurso,
      destinoInicial: formNovoItem.destinoInicial,
      situacao: 'Aguardando Liberação',
      arquivado: false,
      liberacoes: [],
    };

    setItens((prev) => [novo, ...prev]);
    setModalNovoItemAberto(false);
    alert('Novo bem patrimonial incorporado ao controle com sucesso!');
  };

  // Exportar para Excel
  const handleExportarExcel = (lista: ItemPatrimonio[], nomeArquivo: string) => {
    const dados = lista.map((it) => ({
      Classificação: it.classificacao,
      'Descrição do Bem': it.nome,
      'Estado de Conservação': it.estadoBem,
      'Saldo Disponível': it.saldo,
      'Valor Unitário (R$)': it.valorUnitario,
      'Valor Total em Estoque (R$)': it.saldo * it.valorUnitario,
      'Processo SEI Aquisição': it.processoAquisicao,
      'Fonte de Recurso': it.fonteRecurso,
      'Tipo de Recurso': it.tipoRecurso || '-',
      'Destino Inicial': it.destinoInicial,
      Situação: it.situacao,
      'Total Liberações': it.liberacoes.length,
      'Quantidades Liberadas': it.liberacoes.reduce((acc, l) => acc + l.quantidade, 0),
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estoque_Patrimonio');
    XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
  };

  // Filtragem conforme a aba ativa
  const itensFiltrados = useMemo(() => {
    return itens.filter((it) => {
      // Regra da aba
      if (activeTab === 'BENS_PROAD') {
        if (it.origem !== 'PROAD' || it.arquivado) return false;
      } else if (activeTab === 'BENS_OP') {
        if (it.origem !== 'OP_CONVENIOS' || it.arquivado) return false;
      } else if (activeTab === 'CONSUMO') {
        if (it.origem !== 'CONSUMO' || it.arquivado) return false;
      } else if (activeTab === 'CONCLUIDOS') {
        if (!it.arquivado) return false;
      }

      // Regra da busca
      if (busca) {
        const b = busca.toLowerCase();
        const matchNome = it.nome.toLowerCase().includes(b);
        const matchProc = it.processoAquisicao.toLowerCase().includes(b);
        const matchDest = it.destinoInicial.toLowerCase().includes(b);
        const matchLib = it.liberacoes.some(
          (l) =>
            l.processo.toLowerCase().includes(b) ||
            l.destino.toLowerCase().includes(b) ||
            (l.recebidoPor && l.recebidoPor.toLowerCase().includes(b)) ||
            (l.termoTransferencia && l.termoTransferencia.includes(b))
        );
        if (!matchNome && !matchProc && !matchDest && !matchLib) return false;
      }

      // Classificação
      if (filtroClassificacao !== 'TODAS' && it.classificacao !== filtroClassificacao) {
        return false;
      }

      // Fonte de Recurso
      if (filtroFonte !== 'TODAS' && it.fonteRecurso !== filtroFonte) {
        return false;
      }

      // Situação
      if (filtroSituacao !== 'TODAS' && it.situacao !== filtroSituacao) {
        return false;
      }

      return true;
    });
  }, [itens, activeTab, busca, filtroClassificacao, filtroFonte, filtroSituacao]);

  // KPIs Consolidados
  const totalItensAtivos = itens.filter((it) => !it.arquivado).length;
  const saldoTotalPecas = itens.filter((it) => !it.arquivado).reduce((acc, it) => acc + it.saldo, 0);
  const valorTotalEstoque = itens
    .filter((it) => !it.arquivado)
    .reduce((acc, it) => acc + it.saldo * it.valorUnitario, 0);
  const totalLiberacoes = itens.reduce((acc, it) => acc + it.liberacoes.length, 0);
  const totalConcluidos = itens.filter((it) => it.arquivado).length;

  // Classificações únicas para o dropdown
  const classificacoesUnicas = useMemo(() => {
    return Array.from(new Set(itens.map((it) => it.classificacao))).filter(Boolean);
  }, [itens]);

  // Fontes de recurso únicas
  const fontesUnicas = useMemo(() => {
    return Array.from(new Set(itens.map((it) => it.fonteRecurso))).filter(Boolean);
  }, [itens]);

  // Analytics de Entregas por Campus
  const analyticsCampi = useMemo(() => {
    const mapa: Record<string, { nome: string; totalItens: number; totalEntregas: number; liberacoes: any[] }> = {};

    itens.forEach((it) => {
      it.liberacoes.forEach((lib) => {
        let campusKey = 'Outros / Reitoria';
        const d = lib.destino.toUpperCase();
        if (d.includes('PAU DOS FERROS') || d.includes('CAPF')) campusKey = 'Campus Pau dos Ferros (CAPF)';
        else if (d.includes('ASSÚ') || d.includes('ASSU') || d.includes('CAA')) campusKey = 'Campus Assú (CAA)';
        else if (d.includes('CAICÓ') || d.includes('CAICO') || d.includes('CAC')) campusKey = 'Campus Caicó (CAC)';
        else if (d.includes('PATU') || d.includes('CAP')) campusKey = 'Campus Patu (CAP)';
        else if (d.includes('NATAL') || d.includes('CAN')) campusKey = 'Campus Natal (CAN)';
        else if (d.includes('FAFIC') || d.includes('FAEN') || d.includes('FACS') || d.includes('FANAT') || d.includes('FACEM') || d.includes('PROAD') || d.includes('PROPLAN'))
          campusKey = 'Campus Central / Mossoró';

        if (!mapa[campusKey]) {
          mapa[campusKey] = { nome: campusKey, totalItens: 0, totalEntregas: 0, liberacoes: [] };
        }
        mapa[campusKey].totalItens += lib.quantidade;
        mapa[campusKey].totalEntregas += 1;
        mapa[campusKey].liberacoes.push({
          itemNome: it.nome,
          quantidade: lib.quantidade,
          processo: lib.processo,
          destino: lib.destino,
          termo: lib.termoTransferencia || '-',
          guia: lib.guiaMovimentacao || '-',
          data: lib.dataEntrega || '-',
          recebidoPor: lib.recebidoPor || 'Pendente',
        });
      });
    });

    return Object.values(mapa).sort((a, b) => b.totalItens - a.totalItens);
  }, [itens]);

  if (!loadingAuth && !hasAcessoGeral) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 font-sans">
        <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-red-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Acesso Restrito ao Setor de Patrimônio e Almoxarifado</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Seu usuário não possui permissão concedida pelo Administrador Geral da PROAD para acessar o subsistema de estoque, patrimônio e almoxarifado.
            Entre em contato com a Diretoria do Setor de Patrimônio (SPAT) ou com a administração da PROAD para solicitar a habilitação do seu perfil.
          </p>
          <div className="pt-2">
            <Link
              href="/hub"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Hub de Subsistemas</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-white/10 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/hub"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Voltar ao Hub PROAD"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-slate-950 shadow-md">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  UERN • PROAD • DMP / SPAT
                </span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-0.2 rounded-full border border-emerald-500/30 font-semibold">
                  Sincronizado com Firebase
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Controle de Estoque e Entregas</span>
                <span className="text-xs text-slate-400 font-normal hidden md:inline">
                  • Almoxarifado Central e Gestão de Patrimônio
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {currentUser && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-white/10 text-xs">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <div className="flex flex-col text-left">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Perfil Concedido</span>
                  <span className="font-bold text-amber-300 text-[11px]">
                    {isAdminGeral
                      ? 'Administrador Geral (Acesso Irrestrito)'
                      : isPatrimonio && isAlmoxarifado
                      ? 'Patrimônio & Almoxarifado'
                      : isPatrimonio
                      ? 'Administrador de Patrimônio (SPAT)'
                      : isAlmoxarifado
                      ? 'Responsável pelo Almoxarifado (DMP)'
                      : 'Servidor UERN'}
                  </span>
                </div>
              </div>
            )}

            <a
              href="https://controle-interno-patrimonio.firebaseapp.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition"
              title="Abrir o sistema web legado SPAT/SA no Firebase"
            >
              <span>Abrir SPAT Firebase</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {((activeTab === 'CONSUMO' && hasAcessoAlmoxarifado) || (activeTab !== 'CONSUMO' && hasAcessoPatrimonio)) ? (
              <button
                type="button"
                onClick={() => {
                  setFormNovoItem((prev) => ({
                    ...prev,
                    origem: activeTab === 'CONSUMO' ? 'CONSUMO' : activeTab === 'BENS_OP' ? 'OP_CONVENIOS' : 'PROAD',
                  }));
                  setModalNovoItemAberto(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{activeTab === 'CONSUMO' ? 'Novo Material' : 'Novo Bem'}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-500 text-xs font-semibold cursor-not-allowed opacity-60"
                title={
                  activeTab === 'CONSUMO'
                    ? 'Inclusão de bens de consumo restrita ao Responsável pelo Almoxarifado'
                    : 'Inclusão de bens patrimoniais restrita ao Administrador de Patrimônio'
                }
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{activeTab === 'CONSUMO' ? 'Novo Material' : 'Novo Bem'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
              <span>Bens Ativos</span>
              <Package className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white">{totalItensAtivos}</div>
            <div className="text-[11px] text-slate-400 mt-1">PROAD + OP e Convênios</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
              <span>Saldo em Depósito (SPAT)</span>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-cyan-400">{saldoTotalPecas}</div>
            <div className="text-[11px] text-slate-400 mt-1">unidades aguardando entrega</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
              <span>Valor Estocado</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {valorTotalEstoque.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">valor patrimonial ativo</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
              <span>Compras em Aberto</span>
              <Clock className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400">{processosAquisicao.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">pedidos com fornecedores</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-sm col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
              <span>Entregas Concluídas</span>
              <Truck className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-400">{totalLiberacoes}</div>
            <div className="text-[11px] text-slate-400 mt-1">para campi e unidades</div>
          </div>
        </div>

        {/* Seletor de Abas Principais */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900 border border-white/10 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('BENS_PROAD')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'BENS_PROAD'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Bens Patrimoniais da PROAD</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/30">
              {itens.filter((it) => it.origem === 'PROAD' && !it.arquivado).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BENS_OP')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'BENS_OP'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Bens de OP e Convênios</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/30">
              {itens.filter((it) => it.origem === 'OP_CONVENIOS' && !it.arquivado).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CONSUMO')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'CONSUMO'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Bens de Consumo</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/30">
              {itens.filter((it) => it.origem === 'CONSUMO' && !it.arquivado).length}
            </span>
          </button>

          {/* ABA PROCESSOS CONCLUÍDOS (MANTIDA CONFORME SOLICITADO PELO USUÁRIO) */}
          <button
            type="button"
            onClick={() => setActiveTab('CONCLUIDOS')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'CONCLUIDOS'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Processos Concluídos</span>
            {totalConcluidos > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-200">
                {totalConcluidos}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('AQUISICOES')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'AQUISICOES'
                ? 'bg-rose-500 text-white font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Processos de Aquisição (Prazos)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-950 text-rose-200">
              {processosAquisicao.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EMPRESTIMOS')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'EMPRESTIMOS'
                ? 'bg-purple-500 text-white font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Empréstimos (SPAT)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CAMPUS_ANALYTICS')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'CAMPUS_ANALYTICS'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Entregas por Campus</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* SEÇÃO 1: TABELAS DE BENS (PROAD / OP / CONSUMO / CONCLUÍDOS) */}
        {/* ======================================================== */}
        {['BENS_PROAD', 'BENS_OP', 'CONSUMO', 'CONCLUIDOS'].includes(activeTab) && (
          <div className="bg-slate-900/80 rounded-2xl border border-white/10 shadow-lg p-5 space-y-4">
            {/* Barra de Filtros e Busca */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por descrição, processo SEI, destino ou recebedor..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filtroClassificacao}
                  onChange={(e) => setFiltroClassificacao(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-300 font-semibold focus:outline-none focus:border-amber-500"
                >
                  <option value="TODAS">Todas as Classificações</option>
                  {classificacoesUnicas.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  value={filtroFonte}
                  onChange={(e) => setFiltroFonte(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-300 font-semibold focus:outline-none focus:border-amber-500"
                >
                  <option value="TODAS">Todas as Fontes de Recurso</option>
                  {fontesUnicas.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleExportarExcel(itensFiltrados, `Relatorio_${activeTab}_PROAD`)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5 transition border border-white/10"
                  title="Baixar Planilha Excel"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Excel</span>
                </button>
              </div>
            </div>

            {/* Tabela de Itens */}
            <div className="rounded-xl border border-white/10 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-white/10">
                  <tr>
                    <th className="p-3">Classificação</th>
                    <th className="p-3">Descrição do Bem</th>
                    <th className="p-3 text-center">Saldo</th>
                    <th className="p-3">Valor Unit.</th>
                    <th className="p-3">Processo Aquisição</th>
                    <th className="p-3">Destino Inicial</th>
                    <th className="p-3">Situação</th>
                    <th className="p-3">Processo (Liberações)</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {itensFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        Nenhum item encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    itensFiltrados.map((it) => (
                      <tr key={it.id} className="hover:bg-white/[0.02] transition">
                        <td className="p-3 font-semibold text-slate-300">
                          <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 text-slate-300 border border-white/10">
                            {it.classificacao}
                          </span>
                        </td>
                        <td className="p-3 max-w-xs">
                          <div className="font-bold text-white text-xs">{it.nome}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                                it.estadoBem === 'Novo'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {it.estadoBem}
                            </span>
                            <span className="text-[10px] text-slate-400">{it.fonteRecurso}</span>
                            {it.tipoRecurso && (
                              <span className="text-[10px] text-purple-300 font-semibold">• {it.tipoRecurso}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-black ${
                              it.saldo === 0
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                            }`}
                          >
                            {it.saldo}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-200">
                          {it.valorUnitario > 0
                            ? it.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            : '-'}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-300">
                          {it.processoAquisicao}
                        </td>
                        <td className="p-3 text-slate-400 text-[11px] max-w-[180px] truncate" title={it.destinoInicial}>
                          {it.destinoInicial}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                              it.arquivado
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : it.situacao === 'Estoque Zerado'
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : it.situacao === 'Liberado Parcialmente'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {it.arquivado ? 'Concluído / Arquivado' : it.situacao}
                          </span>
                        </td>
                        <td className="p-3">
                          {it.liberacoes.length === 0 ? (
                            <span className="text-slate-500 text-[11px] italic">Sem liberações</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {it.liberacoes.map((lib, lIdx) => (
                                <button
                                  key={lIdx}
                                  type="button"
                                  onClick={() =>
                                    setLiberacaoSelecionada({
                                      itemNome: it.nome,
                                      itemId: it.id,
                                      lib: { ...lib },
                                      idx: lIdx,
                                    })
                                  }
                                  className="text-left px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-[10px] text-slate-200 transition group/btn flex items-center justify-between gap-1"
                                  title="Clique para ver detalhes do Termo de Transferência e Guia de Movimentação"
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-bold text-amber-300">{lib.processo}</span>
                                      <span className="text-slate-400">({lib.quantidade} unds)</span>
                                    </div>
                                    <div className="text-[9px] text-slate-400 truncate max-w-[170px]">
                                      {lib.destino}
                                    </div>
                                    {lib.dataEntrega && (
                                      <div className="text-[9px] text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                                        <span>Entregue em: {toBrDate(lib.dataEntrega)}</span>
                                        {lib.recebidoPor && <span className="text-slate-400 font-normal">({lib.recebidoPor})</span>}
                                      </div>
                                    )}
                                  </div>
                                  <ChevronRight className="w-3 h-3 text-slate-500 group-hover/btn:text-white shrink-0" />
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(() => {
                              const canActionThisItem =
                                isAdminGeral ||
                                (it.origem === 'CONSUMO' ? isAlmoxarifado : isPatrimonio);

                              if (!canActionThisItem) {
                                return (
                                  <span
                                    className="px-2 py-0.5 rounded text-[10px] text-slate-500 bg-slate-800/40 border border-white/5 cursor-not-allowed"
                                    title={
                                      it.origem === 'CONSUMO'
                                        ? 'Baixas e entregas de consumo restritas ao Responsável pelo Almoxarifado'
                                        : 'Liberações de bens patrimoniais restritas ao Administrador de Patrimônio'
                                    }
                                  >
                                    Apenas Leitura
                                  </span>
                                );
                              }

                              return (
                                <>
                                  {it.saldo > 0 && !it.arquivado && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setItemParaLiberar(it);
                                        setFormNovaLiberacao({
                                          processo: '',
                                          destino: it.destinoInicial,
                                          quantidade: 1,
                                          termoTransferencia: '',
                                          guiaMovimentacao: '',
                                          dataEntrega: new Date().toISOString().slice(0, 10),
                                          recebidoPor: '',
                                        });
                                        setModalNovaLiberacaoAberta(true);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-[11px] transition"
                                    >
                                      {it.origem === 'CONSUMO' ? 'Entregar / Baixa' : 'Liberar'}
                                    </button>
                                  )}

                                  {/* BOTÃO MANTIDO CONFORME PEDIDO DO USUÁRIO: "Mantenha esse botão para processo concluído, por ora." */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleArquivado(it.id)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition border ${
                                      it.arquivado
                                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/40 hover:bg-purple-500/25'
                                        : 'bg-slate-800 text-slate-300 border-white/10 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40'
                                    }`}
                                    title={it.arquivado ? 'Desarquivar e retornar ao estoque ativo' : 'Marcar como Processo Concluído'}
                                  >
                                    {it.arquivado ? 'Desarquivar' : 'Concluir'}
                                  </button>
                                </>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SEÇÃO 2: PROCESSOS DE AQUISIÇÃO (PRAZOS & FORNECEDORES) */}
        {/* ======================================================== */}
        {activeTab === 'AQUISICOES' && (
          <div className="bg-slate-900/80 rounded-2xl border border-white/10 shadow-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-400" />
                  <span>Esteira de Aquisições &amp; Acompanhamento de Prazos de Entrega</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Monitoramento contínuo das Ordens de Compra e Prazos Regulamentares (48h Confirmação • 30 dias Entrega).
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-white/10">
                  <tr>
                    <th className="p-3">Processo / Instrumentos</th>
                    <th className="p-3">Fornecedor &amp; Contatos</th>
                    <th className="p-3">Itens Pedidos</th>
                    <th className="p-3 text-center">Qtd.</th>
                    <th className="p-3">Situação Atual &amp; Prazos</th>
                    <th className="p-3 text-right">Cobrança</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {processosAquisicao.map((proc) => {
                    const isAtrasado =
                      proc.situacaoTexto.toLowerCase().includes('atrasad') ||
                      proc.situacaoTexto.toLowerCase().includes('venceu');
                    return (
                      <tr key={proc.id} className="hover:bg-white/[0.02] transition">
                        <td className="p-3">
                          <div className="font-mono font-bold text-white text-xs">{proc.numeroProcesso}</div>
                          {proc.ataRp && (
                            <div className="text-[10px] text-amber-300 font-semibold mt-0.5">
                              Ata RP: {proc.ataRp}
                            </div>
                          )}
                          {proc.ordemCompra && (
                            <div className="text-[10px] text-cyan-300 font-semibold">
                              Ordem de Compra: {proc.ordemCompra}
                            </div>
                          )}
                          {proc.numeroEmpenho && (
                            <div className="text-[10px] text-purple-300 font-mono">
                              Empenho: {proc.numeroEmpenho}
                            </div>
                          )}
                        </td>
                        <td className="p-3 max-w-xs">
                          <div className="font-bold text-slate-200 text-xs">{proc.fornecedor}</div>
                          <div className="text-[11px] text-slate-400">{proc.emailFornecedor}</div>
                          {proc.telefoneFornecedor && (
                            <div className="text-[10px] text-slate-500 mt-0.5">{proc.telefoneFornecedor}</div>
                          )}
                        </td>
                        <td className="p-3 text-slate-300 text-xs max-w-sm">
                          {proc.descricaoPedido}
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-bold text-white px-2 py-0.5 rounded bg-slate-800 border border-white/10">
                            {proc.quantidadeTotal}
                          </span>
                        </td>
                        <td className="p-3 max-w-xs">
                          <div
                            className={`p-2 rounded-xl text-[11px] border leading-relaxed ${
                              isAtrasado
                                ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                            }`}
                          >
                            <div className="font-bold flex items-center gap-1.5">
                              {isAtrasado ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                              <span>{proc.situacaoTexto.split('\n')[1] || proc.situacaoTexto}</span>
                            </div>
                            <div className="text-[10px] text-slate-300 mt-1">
                              {proc.situacaoTexto.split('\n')[2] || ''}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          {proc.historicoCobrancas ? (
                            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Cobrança Enviada
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Sem cobranças</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SEÇÃO 3: EMPRÉSTIMOS E ACERVO DA SPAT                   */}
        {/* ======================================================== */}
        {activeTab === 'EMPRESTIMOS' && (
          <div className="space-y-6">
            {/* Acervo de Equipamentos */}
            <div className="bg-slate-900/80 rounded-2xl border border-white/10 shadow-lg p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-purple-400" />
                <span>Acervo de Bens para Cautela e Empréstimo Temporário</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {EMPRESTIMOS_ACERVO.map((ac, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-white/10">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                      {ac.categoria}
                    </span>
                    <h4 className="font-bold text-white text-xs mt-1">{ac.item}</h4>
                    <div className="flex items-baseline justify-between mt-3 pt-3 border-t border-white/5">
                      <div>
                        <span className="text-2xl font-black text-white">{ac.disponivel}</span>
                        <span className="text-xs text-slate-400 ml-1">disp.</span>
                      </div>
                      <div className="text-xs text-slate-500 font-semibold">Total: {ac.total}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Eventos e Empréstimos */}
            <div className="bg-slate-900/80 rounded-2xl border border-white/10 shadow-lg p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Movimentações de Empréstimos &amp; Termos de Cautela</span>
              </h3>
              <div className="rounded-xl border border-white/10 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-white/10">
                    <tr>
                      <th className="p-3">Evento / Motivo</th>
                      <th className="p-3">Processo SEI</th>
                      <th className="p-3">Unidade Solicitante</th>
                      <th className="p-3">Itens Cautelados</th>
                      <th className="p-3">Período</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {EMPRESTIMOS_EVENTOS.map((ev, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition">
                        <td className="p-3 font-bold text-white text-xs">{ev.evento}</td>
                        <td className="p-3 font-mono text-slate-300">{ev.processo}</td>
                        <td className="p-3 text-slate-400">{ev.solicitante}</td>
                        <td className="p-3 font-semibold text-purple-300">{ev.itens}</td>
                        <td className="p-3 text-[11px] text-slate-300">
                          {ev.dataSaida} até {ev.dataDevolucaoPrevista}
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              ev.status === 'EM_USO'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : ev.status === 'DEVOLVIDO'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {ev.status === 'EM_USO'
                              ? 'Em Uso no Prazo'
                              : ev.status === 'DEVOLVIDO'
                              ? 'Devolvido'
                              : 'Agendado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SEÇÃO 4: ANALYTICS DE ENTREGAS POR CAMPUS               */}
        {/* ======================================================== */}
        {activeTab === 'CAMPUS_ANALYTICS' && (
          <div className="bg-slate-900/80 rounded-2xl border border-white/10 shadow-lg p-5 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>Distribuição Consolidada de Bens por Campus da UERN</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Consolidação dos bens permanentes distribuídos pelo Setor de Patrimônio com Termo de Transferência e Guia de Movimentação.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analyticsCampi.map((campus, cIdx) => (
                <div key={cIdx} className="p-5 rounded-2xl bg-slate-950 border border-white/10 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{campus.nome}</h4>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {campus.totalEntregas} entregas registradas
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 font-black text-sm border border-cyan-500/30">
                      {campus.totalItens} unds
                    </span>
                  </div>

                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Últimos Bens Enviados:
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {campus.liberacoes.map((lib, lIdx) => (
                        <div
                          key={lIdx}
                          className="p-2 rounded-lg bg-slate-900 border border-white/5 text-[11px] space-y-0.5"
                        >
                          <div className="font-bold text-slate-200">
                            {lib.itemNome} ({lib.quantidade} unds)
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center justify-between">
                            <span>Termo nº {lib.termo}</span>
                            <span>Data: {lib.data}</span>
                          </div>
                          <div className="text-[10px] text-amber-300">
                            Recebido por: {lib.recebidoPor}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL 1: DETALHES DO TERMO DE TRANSFERÊNCIA & GUIA        */}
      {/* ======================================================== */}
      {liberacaoSelecionada && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                  Controle Formal de Entrega • SPAT/SA
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  Termo de Transferência &amp; Guia de Movimentação
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{liberacaoSelecionada.itemNome}</p>
              </div>
              <button
                type="button"
                onClick={() => setLiberacaoSelecionada(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-white/10 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Processo SEI Liberação:</span>
                <span className="font-mono font-bold text-amber-400">
                  {liberacaoSelecionada.lib.processo}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Unidade de Destino:</span>
                <span className="font-semibold text-white">{liberacaoSelecionada.lib.destino}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Quantidade Liberada:</span>
                <span className="font-black text-cyan-400">
                  {liberacaoSelecionada.lib.quantidade} unidades
                </span>
              </div>
            </div>

            <form onSubmit={handleSalvarLiberacao} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Nº Termo Transferência
                  </label>
                  <input
                    type="text"
                    value={liberacaoSelecionada.lib.termoTransferencia || ''}
                    onChange={(e) =>
                      setLiberacaoSelecionada({
                        ...liberacaoSelecionada,
                        lib: { ...liberacaoSelecionada.lib, termoTransferencia: e.target.value },
                      })
                    }
                    placeholder="Ex: 3482/2026"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Nº Guia de Movimentação
                  </label>
                  <input
                    type="text"
                    value={liberacaoSelecionada.lib.guiaMovimentacao || ''}
                    onChange={(e) =>
                      setLiberacaoSelecionada({
                        ...liberacaoSelecionada,
                        lib: { ...liberacaoSelecionada.lib, guiaMovimentacao: e.target.value },
                      })
                    }
                    placeholder="Ex: 3245/2026"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Data da Entrega Efetiva
                  </label>
                  <input
                    type="date"
                    value={toIsoDate(liberacaoSelecionada.lib.dataEntrega)}
                    onChange={(e) =>
                      setLiberacaoSelecionada({
                        ...liberacaoSelecionada,
                        lib: { ...liberacaoSelecionada.lib, dataEntrega: toBrDate(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Recebido Por (Nome do Servidor)
                  </label>
                  <input
                    type="text"
                    value={liberacaoSelecionada.lib.recebidoPor || ''}
                    onChange={(e) =>
                      setLiberacaoSelecionada({
                        ...liberacaoSelecionada,
                        lib: { ...liberacaoSelecionada.lib, recebidoPor: e.target.value },
                      })
                    }
                    placeholder="Ex: Jailson José dos Santos"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setLiberacaoSelecionada(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-sm"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: INSERIR NOVA LIBERAÇÃO                           */}
      {/* ======================================================== */}
      {modalNovaLiberacaoAberta && itemParaLiberar && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                  Baixa de Estoque e Destinação
                </span>
                <h3 className="text-base font-bold text-white mt-1">Registrar Nova Liberação</h3>
                <p className="text-xs text-slate-400 mt-0.5">{itemParaLiberar.nome}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalNovaLiberacaoAberta(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCriarLiberacao} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Processo SEI Liberação *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNovaLiberacao.processo}
                    onChange={(e) =>
                      setFormNovaLiberacao({ ...formNovaLiberacao, processo: e.target.value })
                    }
                    placeholder="Ex: 04410022.000348/2026-70"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Quantidade a Liberar * (Saldo: {itemParaLiberar.saldo})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={itemParaLiberar.saldo}
                    required
                    value={formNovaLiberacao.quantidade}
                    onChange={(e) =>
                      setFormNovaLiberacao({ ...formNovaLiberacao, quantidade: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Unidade / Campus de Destino *
                </label>
                <input
                  type="text"
                  required
                  value={formNovaLiberacao.destino}
                  onChange={(e) =>
                    setFormNovaLiberacao({ ...formNovaLiberacao, destino: e.target.value })
                  }
                  placeholder="Ex: 11.16 - CAPF - CAMPUS AVANÇADO DE PAU DOS FERROS"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Nº Termo Transferência
                  </label>
                  <input
                    type="text"
                    value={formNovaLiberacao.termoTransferencia}
                    onChange={(e) =>
                      setFormNovaLiberacao({ ...formNovaLiberacao, termoTransferencia: e.target.value })
                    }
                    placeholder="Ex: 3495/2026"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Nº Guia Movimentação
                  </label>
                  <input
                    type="text"
                    value={formNovaLiberacao.guiaMovimentacao}
                    onChange={(e) =>
                      setFormNovaLiberacao({ ...formNovaLiberacao, guiaMovimentacao: e.target.value })
                    }
                    placeholder="Ex: 3257/2026"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Data da Entrega
                  </label>
                  <input
                    type="date"
                    value={toIsoDate(formNovaLiberacao.dataEntrega)}
                    onChange={(e) =>
                      setFormNovaLiberacao({ ...formNovaLiberacao, dataEntrega: toBrDate(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Recebido Por
                  </label>
                  <input
                    type="text"
                    value={formNovaLiberacao.recebidoPor}
                    onChange={(e) =>
                      setFormNovaLiberacao({ ...formNovaLiberacao, recebidoPor: e.target.value })
                    }
                    placeholder="Nome do servidor recebedor"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalNovaLiberacaoAberta(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-sm"
                >
                  Confirmar Liberação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: NOVO BEM PATRIMONIAL                             */}
      {/* ======================================================== */}
      {modalNovoItemAberto && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                  Incorporação ao Patrimônio
                </span>
                <h3 className="text-base font-bold text-white mt-1">Cadastrar Bem no Estoque Central</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNovoItemAberto(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCriarNovoItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Origem do Bem *
                  </label>
                  <select
                    value={formNovoItem.origem}
                    onChange={(e) =>
                      setFormNovoItem({ ...formNovoItem, origem: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {(isAdminGeral || isPatrimonio) && (
                      <>
                        <option value="PROAD">Bens Patrimoniais da PROAD (Móveis/Permanentes)</option>
                        <option value="OP_CONVENIOS">Bens de OP e Convênios (Permanentes)</option>
                      </>
                    )}
                    {(isAdminGeral || isAlmoxarifado) && (
                      <option value="CONSUMO">Bens de Consumo (Almoxarifado Central)</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Classificação *
                  </label>
                  <select
                    value={formNovoItem.classificacao}
                    onChange={(e) =>
                      setFormNovoItem({ ...formNovoItem, classificacao: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Equipamentos de Informática">Equipamentos de Informática</option>
                    <option value="Equipamentos de Mobília">Equipamentos de Mobília</option>
                    <option value="Equipamentos de Refrigeração">Equipamentos de Refrigeração</option>
                    <option value="Eletrodomésticos">Eletrodomésticos</option>
                    <option value="Equipamentos Diversos">Equipamentos Diversos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Descrição Completa do Bem *
                </label>
                <input
                  type="text"
                  required
                  value={formNovoItem.nome}
                  onChange={(e) => setFormNovoItem({ ...formNovoItem, nome: e.target.value })}
                  placeholder="Ex: AR CONDICIONADO SPLIT 18.000 BTUS INVERTER"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Estado do Bem
                  </label>
                  <select
                    value={formNovoItem.estadoBem}
                    onChange={(e) => setFormNovoItem({ ...formNovoItem, estadoBem: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Novo">Novo</option>
                    <option value="Usado">Usado</option>
                    <option value="Recuperado">Recuperado</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Quantidade Inicial *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formNovoItem.saldo}
                    onChange={(e) => setFormNovoItem({ ...formNovoItem, saldo: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Valor Unitário (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formNovoItem.valorUnitario}
                    onChange={(e) =>
                      setFormNovoItem({ ...formNovoItem, valorUnitario: Number(e.target.value) })
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Processo SEI Aquisição
                  </label>
                  <input
                    type="text"
                    value={formNovoItem.processoAquisicao}
                    onChange={(e) =>
                      setFormNovoItem({ ...formNovoItem, processoAquisicao: e.target.value })
                    }
                    placeholder="Ex: 04410037.001614/2026-12"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Fonte de Recurso
                  </label>
                  <select
                    value={formNovoItem.fonteRecurso}
                    onChange={(e) =>
                      setFormNovoItem({ ...formNovoItem, fonteRecurso: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Recursos Próprios (Tesouro Estadual)">
                      Recursos Próprios (Tesouro Estadual)
                    </option>
                    <option value="Recursos de Convênio (Esfera Federal/Estadual)">
                      Recursos de Convênio (Esfera Federal/Estadual)
                    </option>
                    <option value="Emenda Parlamentar">Emenda Parlamentar</option>
                    <option value="Doação (Pessoa Física ou Jurídica)">Doação</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Destino Inicial Previsto
                </label>
                <input
                  type="text"
                  value={formNovoItem.destinoInicial}
                  onChange={(e) =>
                    setFormNovoItem({ ...formNovoItem, destinoInicial: e.target.value })
                  }
                  placeholder="Ex: 11.01.70 - PROAD - SPAT - SETOR DE PATRIMÔNIO"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalNovoItemAberto(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-sm"
                >
                  Cadastrar Bem no Estoque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
