import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/auth'
import {
    gerarPacoteZipBackupCompleto,
    gerarApenasPlanilhasXlsx,
    gerarApenasDocumentosDocx,
    coletarSnapshotIntegral,
    obterResumoBackupRapido,
} from '@/lib/backup-engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
    try {
        const session = await verifyAdminSession()
        const authHeader = req.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET || 'proad_backup_cron_secret_2026'
        const isCronAuthorized = authHeader === `Bearer ${cronSecret}`

        if (!session && !isCronAuthorized) {
            return NextResponse.json(
                { error: 'Acesso restrito a administradores da PROAD.' },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(req.url)
        const formato = (searchParams.get('formato') || 'zip').toLowerCase()

        // 1. Apenas resumo rápido de contagem de tabelas/registros (para o painel UI)
        if (formato === 'resumo') {
            const resumo = await obterResumoBackupRapido()
            return NextResponse.json({
                sucesso: true,
                resumo,
            })
        }

        const dataSlug = new Date().toISOString().slice(0, 10)

        // 2. Pacote ZIP Completo (Tripla Camada: XLSX + DOCX + JSON + SHA256)
        if (formato === 'zip') {
            const { buffer, nomeArquivo } = await gerarPacoteZipBackupCompleto()
            return new NextResponse(new Uint8Array(buffer), {
                status: 200,
                headers: {
                    'Content-Type': 'application/zip',
                    'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
                    'Cache-Control': 'no-store',
                },
            })
        }

        // 3. Snapshot JSON Integral
        if (formato === 'json') {
            const snap = await coletarSnapshotIntegral()
            const jsonStr = JSON.stringify(snap, null, 2)
            return new NextResponse(jsonStr, {
                status: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Content-Disposition': `attachment; filename="snapshot_integral_proad_uern_${dataSlug}.json"`,
                    'Cache-Control': 'no-store',
                },
            })
        }

        // 4. Planilhas Excel (.xlsx) por subsistema
        if (formato.startsWith('xlsx-')) {
            const { arquivos } = await gerarApenasPlanilhasXlsx()
            const mapa: Record<string, string> = {
                'xlsx-sgc': '01_SGC_UERN_Contratos_Atas_Ordens_Faturas.xlsx',
                'xlsx-pca': '02_PCA_UERN_DFDs_Dotacoes_Planejamento_Licitacoes.xlsx',
                'xlsx-portal': '03_Portal_PROAD_Identidades_Unidades_Auditoria.xlsx',
                'xlsx-operacional': '04_Climatizacao_e_Diarias_UERN.xlsx',
            }
            const nomeAlvo = mapa[formato] || '01_SGC_UERN_Contratos_Atas_Ordens_Faturas.xlsx'
            const buf = arquivos[nomeAlvo]
            return new NextResponse(new Uint8Array(buf), {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${nomeAlvo.replace('.xlsx', `_${dataSlug}.xlsx`)}"`,
                    'Cache-Control': 'no-store',
                },
            })
        }

        // 5. Documentos Word (.docx) por subsistema
        if (formato.startsWith('docx-')) {
            const { arquivos } = await gerarApenasDocumentosDocx()
            const mapaDocx: Record<string, string> = {
                'docx-sgc': '01_Caderno_Documental_SGC_Contratos_Ordens_Atos.docx',
                'docx-pca': '02_Caderno_Artefatos_PCA_ETP_Riscos_TR_Minutas.docx',
            }
            const nomeAlvo = mapaDocx[formato] || '01_Caderno_Documental_SGC_Contratos_Ordens_Atos.docx'
            const buf = arquivos[nomeAlvo]
            return new NextResponse(new Uint8Array(buf), {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'Content-Disposition': `attachment; filename="${nomeAlvo.replace('.docx', `_${dataSlug}.docx`)}"`,
                    'Cache-Control': 'no-store',
                },
            })
        }

        return NextResponse.json({ error: `Formato não suportado: ${formato}` }, { status: 400 })
    } catch (error: any) {
        console.error('[API BACKUP ERROR]:', error)
        return NextResponse.json(
            { error: 'Falha ao gerar backup.', details: error?.message || String(error) },
            { status: 500 }
        )
    }
}
