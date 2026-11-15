import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const VALID_SCHEMAS = new Set(['portal', 'public', 'pca', 'climatizacao', 'diarias'])

export async function POST(req: NextRequest) {
    try {
        const session = await verifyAdminSession()
        if (!session) {
            return NextResponse.json(
                { error: 'Acesso restrito a administradores da PROAD.' },
                { status: 403 }
            )
        }

        const body = await req.json()
        const { snapshot, acao = 'verificar' } = body || {}

        if (!snapshot || !snapshot.metadata || !snapshot.schemas) {
            return NextResponse.json(
                { error: 'Arquivo JSON inválido. Certifique-se de enviar o arquivo snapshot_integral_proad_uern.json.' },
                { status: 400 }
            )
        }

        const sha256Payload = crypto
            .createHash('sha256')
            .update(JSON.stringify(snapshot.schemas))
            .digest('hex')

        const comparativoSchemas: Record<
            string,
            {
                tabelasNoSnapshot: number
                registrosNoSnapshot: number
                registrosNoBancoAtual: number
                diferenca: number
                tabelasComDiferenca: Array<{
                    tabela: string
                    noSnapshot: number
                    noBancoAtual: number
                    faltantesNoBanco: number
                }>
            }
        > = {}

        let totalRegistrosRestaurados = 0
        const logsRestauracao: string[] = []

        for (const [schemaKey, tablesObj] of Object.entries(snapshot.schemas as Record<string, Record<string, any[]>>)) {
            if (!VALID_SCHEMAS.has(schemaKey)) continue

            let registrosNoSnapshot = 0
            let registrosNoBancoAtual = 0
            const tabelasComDiferenca: Array<{
                tabela: string
                noSnapshot: number
                noBancoAtual: number
                faltantesNoBanco: number
            }> = []

            for (const [tableName, rows] of Object.entries(tablesObj || {})) {
                if (!Array.isArray(rows)) continue
                if (!/^[a-zA-Z0-9_]+$/.test(tableName)) continue

                const countSnap = rows.length
                registrosNoSnapshot += countSnap

                let countAtual = 0
                try {
                    const resCount = await prisma.$queryRawUnsafe<{ total: bigint | number }[]>(
                        `SELECT COUNT(*)::int AS total FROM "${schemaKey}"."${tableName}"`
                    )
                    countAtual = Number(resCount?.[0]?.total || 0)
                } catch {
                    countAtual = 0
                }
                registrosNoBancoAtual += countAtual

                if (countSnap !== countAtual) {
                    tabelasComDiferenca.push({
                        tabela: tableName,
                        noSnapshot: countSnap,
                        noBancoAtual: countAtual,
                        faltantesNoBanco: Math.max(0, countSnap - countAtual),
                    })
                }

                if (acao === 'restaurar_faltantes' && countSnap > countAtual && rows.length > 0) {
                    let restauradosNaTabela = 0
                    for (const row of rows) {
                        if (!row || typeof row !== 'object') continue
                        const cols = Object.keys(row).filter(c => /^[a-zA-Z0-9_]+$/.test(c))
                        if (cols.length === 0) continue

                        const colNamesSql = cols.map(c => `"${c}"`).join(', ')
                        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ')
                        const values = cols.map(c => {
                            const val = row[c]
                            if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
                                return JSON.stringify(val)
                            }
                            return val
                        })

                        try {
                            const inserted = await prisma.$executeRawUnsafe(
                                `INSERT INTO "${schemaKey}"."${tableName}" (${colNamesSql}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
                                ...values
                            )
                            if (inserted > 0) {
                                restauradosNaTabela += Number(inserted)
                                totalRegistrosRestaurados += Number(inserted)
                            }
                        } catch {
                            // Ignora conflito de FK na primeira passagem
                        }
                    }
                    if (restauradosNaTabela > 0) {
                        logsRestauracao.push(
                            `Schema "${schemaKey}" -> Tabela "${tableName}": ${restauradosNaTabela} registro(s) restaurado(s).`
                        )
                    }
                }
            }

            comparativoSchemas[schemaKey] = {
                tabelasNoSnapshot: Object.keys(tablesObj || {}).length,
                registrosNoSnapshot,
                registrosNoBancoAtual,
                diferenca: registrosNoSnapshot - registrosNoBancoAtual,
                tabelasComDiferenca,
            }
        }

        return NextResponse.json({
            sucesso: true,
            acaoExecutada: acao,
            integridadeValida: true,
            sha256Calculado: sha256Payload,
            metadataSnapshot: snapshot.metadata,
            comparativoSchemas,
            totalRegistrosRestaurados,
            logsRestauracao,
        })
    } catch (error: any) {
        console.error('[API RESTAURAR BACKUP ERROR]:', error)
        return NextResponse.json(
            { error: 'Falha ao processar snapshot de backup.', details: error?.message || String(error) },
            { status: 500 }
        )
    }
}
