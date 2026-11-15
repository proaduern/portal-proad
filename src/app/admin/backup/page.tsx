'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    HardDriveDownload,
    FileSpreadsheet,
    FileText,
    FileCode2,
    Mail,
    ShieldCheck,
    Database,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    UploadCloud,
    Lock,
    Server,
    Layers,
    Send,
    Clock,
    Check,
    Sparkles,
    Archive,
} from 'lucide-react'

interface ResumoSchema {
    tabelas: number
    registros: number
}

interface ResumoBackup {
    geradoEm: string
    totalTabelas: number
    totalRegistros: number
    porSchema: Record<string, ResumoSchema>
}

export default function BackupAdminPage() {
    const router = useRouter()
    const [resumo, setResumo] = useState<ResumoBackup | null>(null)
    const [loadingResumo, setLoadingResumo] = useState<boolean>(true)
    const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    // Estado para envio por e-mail (Gmail PROAD)
    const [emailDestino, setEmailDestino] = useState<string>('adj.proad@uern.br, proad@uern.br')
    const [mostrarConfigSmtp, setMostrarConfigSmtp] = useState<boolean>(false)
    const [smtpUser, setSmtpUser] = useState<string>('')
    const [smtpPass, setSmtpPass] = useState<string>('')
    const [enviandoEmail, setEnviandoEmail] = useState<boolean>(false)

    // Estado para Verificação / Restauração de Snapshot JSON
    const [arquivoSnapshot, setArquivoSnapshot] = useState<File | null>(null)
    const [resultadoRestauracao, setResultadoRestauracao] = useState<any | null>(null)
    const [processandoSnapshot, setProcessandoSnapshot] = useState<boolean>(false)

    const carregarResumo = async () => {
        setLoadingResumo(true)
        setErrorMsg(null)
        try {
            const res = await fetch('/api/admin/backup?formato=resumo', { cache: 'no-store' })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao carregar resumo do banco de dados.')
            }
            setResumo(data.resumo)
        } catch (err: any) {
            setErrorMsg(err.message || 'Falha ao consultar resumo de backup.')
        } finally {
            setLoadingResumo(false)
        }
    }

    useEffect(() => {
        carregarResumo()
    }, [])

    const handleDownload = async (formato: string, label: string) => {
        setDownloadingFormat(formato)
        setErrorMsg(null)
        setSuccessMsg(null)
        try {
            const res = await fetch(`/api/admin/backup?formato=${encodeURIComponent(formato)}`)
            if (!res.ok) {
                let errText = 'Falha ao gerar arquivo de backup.'
                try {
                    const errJson = await res.json()
                    errText = errJson.error || errJson.details || errText
                } catch {
                    // ignore
                }
                throw new Error(errText)
            }

            const blob = await res.blob()
            const disposition = res.headers.get('Content-Disposition') || ''
            let filename = `BACKUP_PROAD_${formato}_${new Date().toISOString().slice(0, 10)}`
            const match = disposition.match(/filename="?([^"]+)"?/)
            if (match && match[1]) {
                filename = match[1]
            }

            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)

            setSuccessMsg(`Download concluído com sucesso: ${label} (${filename})`)
        } catch (err: any) {
            setErrorMsg(err.message || 'Erro durante a geração do backup.')
        } finally {
            setDownloadingFormat(null)
        }
    }

    const handleEnviarEmail = async (e: React.FormEvent) => {
        e.preventDefault()
        setEnviandoEmail(true)
        setErrorMsg(null)
        setSuccessMsg(null)
        try {
            const res = await fetch('/api/admin/backup/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destinatario: emailDestino,
                    smtpUser: smtpUser.trim() || undefined,
                    smtpPass: smtpPass.trim() || undefined,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.instrucoes ? `${data.error} — ${data.instrucoes}` : data.error || 'Erro ao enviar e-mail.')
            }
            setSuccessMsg(
                `Backup (${data.arquivo} • ${data.tamanhoMB} MB) enviado com sucesso para ${data.destinatario} via ${data.metodo}!`
            )
        } catch (err: any) {
            setErrorMsg(err.message || 'Falha ao enviar o backup por e-mail.')
        } finally {
            setEnviandoEmail(false)
        }
    }

    const handleProcessarSnapshot = async (acao: 'verificar' | 'restaurar_faltantes') => {
        if (!arquivoSnapshot) {
            setErrorMsg('Selecione primeiro um arquivo snapshot_integral_proad_uern.json do seu computador.')
            return
        }
        setProcessandoSnapshot(true)
        setErrorMsg(null)
        setSuccessMsg(null)
        try {
            const text = await arquivoSnapshot.text()
            const parsed = JSON.parse(text)
            const res = await fetch('/api/admin/backup/restaurar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    snapshot: parsed,
                    acao,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Falha ao processar snapshot.')
            }
            setResultadoRestauracao(data)
            if (acao === 'verificar') {
                setSuccessMsg(
                    `Integridade SHA-256 validada com sucesso! Hash: ${data.sha256Calculado.slice(0, 16)}...`
                )
            } else {
                setSuccessMsg(
                    `Restauração concluída! ${data.totalRegistrosRestaurados} registro(s) faltante(s) foram reinseridos com segurança.`
                )
                carregarResumo()
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'O arquivo selecionado não é um JSON de snapshot válido.')
        } finally {
            setProcessandoSnapshot(false)
        }
    }

    const LABELS_SCHEMA: Record<string, { titulo: string; cor: string; desc: string }> = {
        public: {
            titulo: 'SGC-UERN (Contratos, Atas, OS/OC, Faturas)',
            cor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
            desc: 'Schema public • Contratos, ARPs, Ordens de Compra/Serviço, Medições, Conta Vinculada',
        },
        pca: {
            titulo: 'PCA-UERN (DFDs, ETPs, Riscos, TR, Licitações)',
            cor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
            desc: 'Schema pca • Demandas, Cotas Orçamentárias, Artefatos da Fase Interna e Certames',
        },
        portal: {
            titulo: 'Portal PROAD (Usuários, Perfis, Unidades, Logs)',
            cor: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
            desc: 'Schema portal • Identidades Unificadas SSO, Unidades Organizacionais e Auditoria',
        },
        climatizacao: {
            titulo: 'Climatização UERN (Aparelhos, Chamados, OS)',
            cor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
            desc: 'Schema climatizacao • Inventário de Ar-Condicionados e Manutenções',
        },
        diarias: {
            titulo: 'Diárias UERN (Requisições, Roteiros, Prestação)',
            cor: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
            desc: 'Schema diarias • Concessões de Diárias, Passagens e Relatórios de Viagem',
        },
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-white/10 px-6 py-4">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.push('/admin')}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition"
                            title="Voltar ao Painel Admin"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Segurança de Dados & Alta Disponibilidade
                                </span>
                                <span className="text-xs text-slate-400">Ecossistema PROAD • UERN</span>
                            </div>
                            <h1 className="text-lg font-extrabold text-white mt-0.5">
                                Central de Backup Integral (Tripla Camada) & Blindagem de Concorrência
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={carregarResumo}
                            disabled={loadingResumo}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-200 transition"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loadingResumo ? 'animate-spin' : ''}`} />
                            <span>Atualizar Contagem</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDownload('zip', 'Pacote ZIP Completo (Tripla Camada)')}
                            disabled={downloadingFormat !== null}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
                        >
                            <HardDriveDownload className="w-4 h-4" />
                            <span>
                                {downloadingFormat === 'zip'
                                    ? 'Gerando Pacote ZIP Completo...'
                                    : 'Baixar Backup Completo no HD (.ZIP)'}
                            </span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 space-y-6">
                {/* Alertas */}
                {errorMsg && (
                    <div className="p-4 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                        <button onClick={() => setErrorMsg(null)} className="text-red-300 hover:text-white font-bold">
                            ✕
                        </button>
                    </div>
                )}

                {successMsg && (
                    <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{successMsg}</span>
                        </div>
                        <button
                            onClick={() => setSuccessMsg(null)}
                            className="text-emerald-300 hover:text-white font-bold"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Bloco 1: Resumo em Tempo Real do Ecossistema */}
                <section className="p-5 rounded-2xl bg-slate-900/90 border border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2.5">
                            <Database className="w-5 h-5 text-amber-400" />
                            <div>
                                <h2 className="text-sm font-bold text-white">
                                    Inventário ao Vivo do Banco de Dados Unificado (5 Schemas • 6 Sistemas)
                                </h2>
                                <p className="text-xs text-slate-400">
                                    Todos os dados abaixo são extraídos em tempo real sem bloquear o uso dos sistemas.
                                </p>
                            </div>
                        </div>
                        {resumo && (
                            <div className="flex items-center gap-3">
                                <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-xs">
                                    <span className="text-slate-400">Total de Tabelas: </span>
                                    <strong className="text-white">{resumo.totalTabelas}</strong>
                                </div>
                                <div className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-xs">
                                    <span className="text-amber-200">Total de Registros Ativos: </span>
                                    <strong className="text-amber-400">
                                        {resumo.totalRegistros.toLocaleString('pt-BR')}
                                    </strong>
                                </div>
                            </div>
                        )}
                    </div>

                    {loadingResumo ? (
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div
                                    key={i}
                                    className="h-24 rounded-xl bg-slate-800/50 animate-pulse border border-white/5"
                                />
                            ))}
                        </div>
                    ) : (
                        resumo && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                {Object.entries(resumo.porSchema).map(([schemaKey, info]) => {
                                    const meta = LABELS_SCHEMA[schemaKey] || {
                                        titulo: schemaKey,
                                        cor: 'text-slate-300 border-white/10 bg-slate-800',
                                        desc: '',
                                    }
                                    return (
                                        <div
                                            key={schemaKey}
                                            className={`p-3.5 rounded-xl border ${meta.cor} flex flex-col justify-between`}
                                        >
                                            <div>
                                                <span className="text-[11px] font-bold block leading-snug">
                                                    {meta.titulo}
                                                </span>
                                                <span className="text-[10px] text-slate-400 mt-1 block leading-tight">
                                                    {meta.desc}
                                                </span>
                                            </div>
                                            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                                                <span className="text-slate-300">
                                                    <strong>{info.tabelas}</strong> tabelas
                                                </span>
                                                <span className="font-extrabold">
                                                    {info.registros.toLocaleString('pt-BR')} reg.
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    )}
                </section>

                {/* Bloco 2: Central de Downloads em Tripla Camada */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Card Pacote Completo ZIP */}
                    <div className="lg:col-span-3 p-6 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="space-y-1.5">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Recomendado para Guarda em HD Externo / Computador Local</span>
                            </div>
                            <h3 className="text-base font-extrabold text-white">
                                Pacote Consolidado de Backup Tripla Camada (.ZIP)
                            </h3>
                            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                                Gera em um único arquivo compactado{' '}
                                <code className="text-emerald-300 font-mono">
                                    BACKUP_PROAD_UERN_AAAA-MM-DD_HHmm.zip
                                </code>{' '}
                                contendo: <strong>(1)</strong> as 4 pastas de trabalho em Planilhas Excel (
                                <code className="text-emerald-300">.xlsx</code>) com todas as tabelas do SGC, PCA,
                                Portal, Climatização e Diárias; <strong>(2)</strong> os 2 Dossiês Textuais em Word (
                                <code className="text-emerald-300">.docx</code>) com todos os ETPs, Mapas de Riscos, TRs,
                                Minutas, Contratos, Ordens de Compra/Serviço e Atos; e <strong>(3)</strong> o Snapshot
                                Relacional Integral (<code className="text-emerald-300">.json</code>) + Manifesto de
                                Integridade <code className="text-emerald-300">SHA-256</code> para restauração imediata.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => handleDownload('zip', 'Pacote ZIP Completo (Tripla Camada)')}
                            disabled={downloadingFormat !== null}
                            className="shrink-0 flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/20 transition disabled:opacity-50"
                        >
                            <Archive className="w-5 h-5" />
                            <span>
                                {downloadingFormat === 'zip'
                                    ? 'Compactando Todas as Camadas...'
                                    : 'Baixar Pacote Completo (.ZIP)'}
                            </span>
                        </button>
                    </div>

                    {/* Camada 1: Planilhas Excel (.xlsx) */}
                    <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 flex flex-col justify-between space-y-4">
                        <div>
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
                                    <FileSpreadsheet className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                        Camada 1 • Dados Tabulares
                                    </span>
                                    <h3 className="text-sm font-bold text-white">Planilhas Excel (.XLSX)</h3>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                Todas as tabelas e cadastros exportados em pastas de trabalho multi-abas prontas para
                                abrir no Microsoft Excel ou Google Planilhas.
                            </p>

                            <div className="space-y-2">
                                {[
                                    {
                                        id: 'xlsx-sgc',
                                        nome: '01_SGC_UERN_Contratos_Atas_Ordens_Faturas.xlsx',
                                        sub: 'Contratos, ARPs, Itens, Empenhos, OS/OC, Faturas, Conta Vinculada e Fiscais',
                                    },
                                    {
                                        id: 'xlsx-pca',
                                        nome: '02_PCA_UERN_DFDs_Dotacoes_Planejamento_Licitacoes.xlsx',
                                        sub: 'Unidades, Cotas, DFDs, Itens, Preços, Processos e Licitações',
                                    },
                                    {
                                        id: 'xlsx-portal',
                                        nome: '03_Portal_PROAD_Identidades_Unidades_Auditoria.xlsx',
                                        sub: 'Usuários, Perfis Multi-Sistema, Unidades UERN e Logs de Auditoria',
                                    },
                                    {
                                        id: 'xlsx-operacional',
                                        nome: '04_Climatizacao_e_Diarias_UERN.xlsx',
                                        sub: 'Equipamentos, Chamados de Climatização e Concessões de Diárias',
                                    },
                                ].map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleDownload(item.id, item.nome)}
                                        disabled={downloadingFormat !== null}
                                        className="w-full text-left p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-white/10 hover:border-emerald-500/40 transition flex items-center justify-between gap-2 group"
                                    >
                                        <div className="min-w-0">
                                            <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 truncate">
                                                {item.nome}
                                            </div>
                                            <div className="text-[10px] text-slate-400 truncate">{item.sub}</div>
                                        </div>
                                        <HardDriveDownload className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Camada 2: Documentos Word (.docx) */}
                    <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 flex flex-col justify-between space-y-4">
                        <div>
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="p-2 rounded-lg bg-blue-500/15 text-blue-400">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                                        Camada 2 • Peças e Textos
                                    </span>
                                    <h3 className="text-sm font-bold text-white">Dossiês em Word (.DOCX)</h3>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                Todos os documentos textuais, justificativas, termos técnicos, minutas, ordens de
                                serviço/compra e atos normativos estruturados em documentos editáveis do Microsoft Word.
                            </p>

                            <div className="space-y-2.5">
                                {[
                                    {
                                        id: 'docx-sgc',
                                        nome: '01_Caderno_Documental_SGC_Contratos_Ordens_Atos.docx',
                                        sub: 'Dossiê completo de Contratos vigentes, Designações de Fiscais, Ordens de Serviço/Compra (OS/OC), Ocorrências e Documentos Gerados no SGC',
                                    },
                                    {
                                        id: 'docx-pca',
                                        nome: '02_Caderno_Artefatos_PCA_ETP_Riscos_TR_Minutas.docx',
                                        sub: 'Caderno completo de DFDs (Justificativas), Estudos Técnicos Preliminares (ETP), Mapas de Riscos, Termos de Referência (TR), Pareceres e Minutas do PCA',
                                    },
                                ].map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleDownload(item.id, item.nome)}
                                        disabled={downloadingFormat !== null}
                                        className="w-full text-left p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-white/10 hover:border-blue-500/40 transition flex items-center justify-between gap-2 group"
                                    >
                                        <div className="min-w-0">
                                            <div className="text-xs font-bold text-slate-200 group-hover:text-blue-300 truncate">
                                                {item.nome}
                                            </div>
                                            <div className="text-[10px] text-slate-400 leading-snug mt-0.5">
                                                {item.sub}
                                            </div>
                                        </div>
                                        <HardDriveDownload className="w-4 h-4 text-slate-400 group-hover:text-blue-400 shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/20 text-[11px] text-blue-200">
                            💡 <strong>Regra aplicada:</strong> Dados tabulares viram planilhas (<code>.xlsx</code>) e
                            artefatos textuais/documentais viram documentos editáveis (<code>.docx</code>).
                        </div>
                    </div>

                    {/* Camada 3: Snapshot Relacional (.json) & Restauração */}
                    <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 flex flex-col justify-between space-y-4">
                        <div>
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                                    <FileCode2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                                        Camada 3 • Restauração Exata
                                    </span>
                                    <h3 className="text-sm font-bold text-white">
                                        Snapshot Relacional (.JSON + SHA-256)
                                    </h3>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed mb-3">
                                Espelho fiel de todas as chaves primárias, chaves estrangeiras e vínculos entre os 5
                                schemas. Permite restaurar o banco sem perda de vínculos.
                            </p>

                            <button
                                type="button"
                                onClick={() => handleDownload('json', 'snapshot_integral_proad_uern.json')}
                                disabled={downloadingFormat !== null}
                                className="w-full text-left p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-white/10 hover:border-amber-500/40 transition flex items-center justify-between gap-2 group mb-4"
                            >
                                <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-200 group-hover:text-amber-300 truncate">
                                        snapshot_integral_proad_uern.json
                                    </div>
                                    <div className="text-[10px] text-slate-400 truncate">
                                        Snapshot completo + Assinatura Criptográfica SHA-256
                                    </div>
                                </div>
                                <HardDriveDownload className="w-4 h-4 text-slate-400 group-hover:text-amber-400 shrink-0" />
                            </button>

                            {/* Box de Verificação e Restauração */}
                            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-2.5">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                                    <UploadCloud className="w-4 h-4" />
                                    <span>Verificar ou Restaurar Snapshot (.JSON)</span>
                                </div>
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={e => {
                                        setArquivoSnapshot(e.target.files?.[0] || null)
                                        setResultadoRestauracao(null)
                                    }}
                                    className="block w-full text-[11px] text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-amber-500/20 file:text-amber-300 hover:file:bg-amber-500/30"
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        disabled={!arquivoSnapshot || processandoSnapshot}
                                        onClick={() => handleProcessarSnapshot('verificar')}
                                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-bold text-white transition disabled:opacity-40"
                                    >
                                        {processandoSnapshot ? 'Analisando...' : '1. Verificar SHA-256'}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!arquivoSnapshot || processandoSnapshot}
                                        onClick={() => handleProcessarSnapshot('restaurar_faltantes')}
                                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[11px] font-bold text-slate-950 transition disabled:opacity-40"
                                    >
                                        2. Restaurar Faltantes
                                    </button>
                                </div>

                                {resultadoRestauracao && (
                                    <div className="mt-2 p-2.5 rounded-lg bg-slate-900 border border-amber-500/30 text-[11px] space-y-1">
                                        <div className="text-emerald-400 font-bold">
                                            ✓ SHA-256: {resultadoRestauracao.sha256Calculado?.slice(0, 20)}...
                                        </div>
                                        {Object.entries(resultadoRestauracao.comparativoSchemas || {}).map(
                                            ([sch, info]: [string, any]) => (
                                                <div key={sch} className="flex justify-between text-slate-300">
                                                    <span>Schema {sch}:</span>
                                                    <span>
                                                        Snapshot: <strong>{info.registrosNoSnapshot}</strong> | Banco:{' '}
                                                        <strong>{info.registrosNoBancoAtual}</strong>
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Bloco 3: Envio Automático e Sob Demanda para o Gmail da PROAD */}
                <section className="p-6 rounded-2xl bg-slate-900/90 border border-white/10">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-bold text-white">
                                        Envio de Backup para o Gmail Institucional da PROAD
                                    </h2>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                        Cron Semanal Ativo + Disparo 1-Clique
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Envia o pacote <code className="text-slate-200">.ZIP</code> completo anexado
                                    diretamente para a caixa de entrada da PROAD, funcionando como cofre externo em
                                    nuvem independente do servidor.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setMostrarConfigSmtp(!mostrarConfigSmtp)}
                            className="text-xs text-amber-400 hover:text-amber-300 underline font-semibold"
                        >
                            {mostrarConfigSmtp
                                ? 'Ocultar credenciais SMTP opcionais'
                                : 'Configurar Senha de App do Gmail (opcional)'}
                        </button>
                    </div>

                    <form onSubmit={handleEnviarEmail} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                            <div className="md:col-span-3">
                                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                    E-mail(s) de Destino da PROAD (separados por vírgula)
                                </label>
                                <input
                                    type="text"
                                    value={emailDestino}
                                    onChange={e => setEmailDestino(e.target.value)}
                                    placeholder="adj.proad@uern.br, proad@uern.br"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-500"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={enviandoEmail}
                                className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                                <span>
                                    {enviandoEmail ? 'Gerando e Enviando ZIP...' : 'Enviar Backup Agora por E-mail'}
                                </span>
                            </button>
                        </div>

                        {mostrarConfigSmtp && (
                            <div className="p-4 rounded-xl bg-slate-950 border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                        E-mail Gmail Remetente (se não configurado no servidor)
                                    </label>
                                    <input
                                        type="email"
                                        value={smtpUser}
                                        onChange={e => setSmtpUser(e.target.value)}
                                        placeholder="Ex.: adj.proad@uern.br"
                                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-xs text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                        Senha de App do Google (16 caracteres gerada em myaccount.google.com/apppasswords)
                                    </label>
                                    <input
                                        type="password"
                                        value={smtpPass}
                                        onChange={e => setSmtpPass(e.target.value)}
                                        placeholder="xxxx xxxx xxxx xxxx"
                                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-xs text-white"
                                    />
                                </div>
                            </div>
                        )}
                    </form>
                </section>

                {/* Bloco 4: Painel de Blindagem de Concorrência e Acessos Simultâneos */}
                <section className="p-6 rounded-2xl bg-slate-900/90 border border-white/10 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2.5">
                            <ShieldCheck className="w-5 h-5 text-emerald-400" />
                            <div>
                                <h2 className="text-sm font-bold text-white">
                                    Status da Blindagem para Acessos Simultâneos em Massa (6 Sistemas)
                                </h2>
                                <p className="text-xs text-slate-400">
                                    Proteções ativas na arquitetura para suportar centenas de demandantes, fiscais e
                                    gestores operando ao mesmo tempo.
                                </p>
                            </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" />
                            <span>100% das Travas Atômicas Ativas</span>
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/25 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-emerald-400 uppercase">
                                    1. Pool de Conexões
                                </span>
                                <Server className="w-4 h-4 text-emerald-400" />
                            </div>
                            <h3 className="text-xs font-extrabold text-white">
                                PgBouncer Ativo nos 6 Sistemas
                            </h3>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                Portal, PCA, SGC, Manutenção, Climatização e Diárias operam via endpoint{' '}
                                <code>-pooler</code> com fila gerenciada (<code>pool_timeout=20s</code>) e reuso global
                                de conexão, suportando até 10.000 conexões simultâneas sem erro de limite.
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/25 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-emerald-400 uppercase">
                                    2. Numeração SGC
                                </span>
                                <Lock className="w-4 h-4 text-emerald-400" />
                            </div>
                            <h3 className="text-xs font-extrabold text-white">
                                Sequencial Atômico no PostgreSQL
                            </h3>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                A reserva de numeração oficial de Ordens de Serviço/Compra e Ofícios no SGC utiliza{' '}
                                <code>INSERT ... ON CONFLICT DO UPDATE RETURNING</code> direto no banco, impedindo que 2
                                fiscais recebam o mesmo número no mesmo milissegundo.
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/25 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-emerald-400 uppercase">
                                    3. Cotas e DFDs no PCA
                                </span>
                                <Layers className="w-4 h-4 text-emerald-400" />
                            </div>
                            <h3 className="text-xs font-extrabold text-white">
                                Lock de Unidade + Retry Automático
                            </h3>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                A criação e o envio de DFDs aplicam trava de linha (<code>SELECT ... FOR UPDATE</code>)
                                na Unidade e revalidam o saldo da Cota Orçamentária e do Teto do PCA dentro da mesma
                                transação, evitando estouro de orçamento por duplo clique.
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/25 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-emerald-400 uppercase">
                                    4. Saldo de Contratos / Atas
                                </span>
                                <Clock className="w-4 h-4 text-emerald-400" />
                            </div>
                            <h3 className="text-xs font-extrabold text-white">
                                Validação Atômica de Saldo de Itens
                            </h3>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                Na emissão de Ordens de Compra/Serviço no SGC, o contrato é bloqueado em nível de linha
                                durante a verificação de saldo disponível de cada item, impedindo consumo acima da
                                quantidade contratada.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    )
}
