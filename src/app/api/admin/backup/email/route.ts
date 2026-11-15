import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/auth'
import { gerarPacoteZipBackupCompleto } from '@/lib/backup-engine'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function dispararBackupPorEmail(params: {
    destinatario: string
    smtpHost?: string
    smtpPort?: number
    smtpUser?: string
    smtpPass?: string
    resendApiKey?: string
    origemDisparo: 'MANUAL' | 'CRON_AUTOMATICO'
}) {
    const { buffer, nomeArquivo, snapshot, sha256 } = await gerarPacoteZipBackupCompleto()

    const dataBr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })
    const tamanhoMb = (buffer.length / (1024 * 1024)).toFixed(2)

    const htmlEmail = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #0f2847; color: #ffffff; padding: 24px;">
            <h2 style="margin: 0; font-size: 20px;">🛡️ Backup Integral Tripla Camada — Ecossistema PROAD UERN</h2>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #cbd5e1;">
                Pró-Reitoria de Administração • Universidade do Estado do Rio Grande do Norte
            </p>
        </div>
        <div style="padding: 24px; background: #ffffff;">
            <p style="font-size: 14px; line-height: 1.6;">
                Segue anexo o pacote consolidado de <strong>Backup e Contingência Integral</strong> de todos os sistemas da PROAD/UERN
                (<strong>Portal PROAD</strong>, <strong>SGC-UERN</strong>, <strong>PCA-UERN</strong>, <strong>Climatização</strong> e <strong>Diárias</strong>).
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 13px;">
                <p style="margin: 4px 0;"><strong>📅 Data/Hora da Geração:</strong> ${dataBr}</p>
                <p style="margin: 4px 0;"><strong>⚙️ Origem do Disparo:</strong> ${params.origemDisparo === 'CRON_AUTOMATICO' ? 'Agendamento Automático (Cron)' : 'Disparo Manual pelo Painel Admin'}</p>
                <p style="margin: 4px 0;"><strong>📦 Arquivo Anexo:</strong> <code>${nomeArquivo}</code> (${tamanhoMb} MB)</p>
                <p style="margin: 4px 0;"><strong>🗄️ Total de Tabelas Exportadas:</strong> ${snapshot.metadata.totalTabelas}</p>
                <p style="margin: 4px 0;"><strong>📊 Total de Registros Salvos:</strong> ${snapshot.metadata.totalRegistros}</p>
                <p style="margin: 4px 0;"><strong>🔒 Hash de Integridade SHA-256:</strong> <code style="font-size: 11px;">${sha256}</code></p>
            </div>
            <h3 style="font-size: 14px; color: #0f2847; margin-top: 20px;">Conteúdo do Pacote ZIP Anexo:</h3>
            <ul style="font-size: 13px; line-height: 1.7; color: #334155;">
                <li><strong>01_Planilhas_Excel_XLSX/</strong>: 4 pastas de trabalho (.xlsx) contendo todas as tabelas de Contratos, Atas, Ordens de Compra/Serviço, Faturas, DFDs, Cotações, Licitações, Usuários, Climatização e Diárias.</li>
                <li><strong>02_Documentos_Word_DOCX/</strong>: 2 cadernos documentais editáveis (.docx) contendo todos os ETPs, Mapas de Risco, Termos de Referência, Minutas, Contratos, Ordens e Atos.</li>
                <li><strong>03_Snapshot_Restauracao_JSON/</strong>: Snapshot relacional completo (<code>snapshot_integral_proad_uern.json</code>) + Manifesto SHA-256 para restauração imediata.</li>
            </ul>
        </div>
    </div>
    `

    const smtpUser = params.smtpUser || process.env.SMTP_USER || process.env.GMAIL_USER
    const smtpPass = params.smtpPass || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD
    const smtpHost = params.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com'
    const smtpPort = Number(params.smtpPort || process.env.SMTP_PORT || 465)
    const resendKey = params.resendApiKey || process.env.RESEND_API_KEY

    // Opção 1: Envio via Gmail SMTP / Nodemailer
    if (smtpUser && smtpPass) {
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        })

        const info = await transporter.sendMail({
            from: `"Central de Backup PROAD UERN" <${smtpUser}>`,
            to: params.destinatario,
            subject: `[BACKUP PROAD UERN] Pacote Integral (${dataBr}) - ${snapshot.metadata.totalRegistros} registros`,
            html: htmlEmail,
            attachments: [
                {
                    filename: nomeArquivo,
                    content: buffer,
                    contentType: 'application/zip',
                },
            ],
        })

        return {
            metodo: 'SMTP_GMAIL',
            messageId: info.messageId,
            destinatario: params.destinatario,
            nomeArquivo,
            tamanhoMb,
            totalRegistros: snapshot.metadata.totalRegistros,
            sha256,
        }
    }

    // Opção 2: Envio via Resend API
    if (resendKey) {
        const resp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: process.env.RESEND_FROM_EMAIL || 'PROAD Backup <onboarding@resend.dev>',
                to: [params.destinatario],
                subject: `[BACKUP PROAD UERN] Pacote Integral (${dataBr}) - ${snapshot.metadata.totalRegistros} registros`,
                html: htmlEmail,
                attachments: [
                    {
                        filename: nomeArquivo,
                        content: buffer.toString('base64'),
                    },
                ],
            }),
        })

        if (!resp.ok) {
            const errTxt = await resp.text()
            throw new Error(`Erro na API Resend: ${errTxt}`)
        }

        const dataResend = await resp.json()
        return {
            metodo: 'RESEND_API',
            messageId: dataResend.id,
            destinatario: params.destinatario,
            nomeArquivo,
            tamanhoMb,
            totalRegistros: snapshot.metadata.totalRegistros,
            sha256,
        }
    }

    throw new Error(
        'CONFIG_CREDENCIAIS_EMAIL_AUSENTE: Informe o E-mail Gmail e a Senha de App (16 dígitos do Google) no painel ou configure GMAIL_USER e GMAIL_APP_PASSWORD nas variáveis de ambiente.'
    )
}

export async function POST(req: NextRequest) {
    try {
        const session = await verifyAdminSession()
        if (!session) {
            return NextResponse.json(
                { error: 'Acesso restrito a administradores da PROAD.' },
                { status: 403 }
            )
        }

        const body = await req.json().catch(() => ({}))
        const destinatario =
            body.destinatario ||
            process.env.BACKUP_EMAIL_TO ||
            'adj.proad@uern.br, proad@uern.br'

        const resultado = await dispararBackupPorEmail({
            destinatario,
            smtpHost: body.smtpHost,
            smtpPort: body.smtpPort,
            smtpUser: body.smtpUser,
            smtpPass: body.smtpPass,
            resendApiKey: body.resendApiKey,
            origemDisparo: 'MANUAL',
        })

        return NextResponse.json({
            sucesso: true,
            mensagem: `Backup integral enviado com sucesso para ${destinatario}!`,
            ...resultado,
        })
    } catch (error: any) {
        console.error('[API BACKUP EMAIL POST ERROR]:', error)
        const msg = error?.message || String(error)
        const isConfigMissing = msg.includes('CONFIG_CREDENCIAIS_EMAIL_AUSENTE')
        return NextResponse.json(
            {
                error: isConfigMissing
                    ? 'Credenciais de envio de e-mail ainda não informadas.'
                    : 'Falha ao enviar o backup por e-mail.',
                details: msg.replace('CONFIG_CREDENCIAIS_EMAIL_AUSENTE: ', ''),
                requerCredenciais: isConfigMissing,
            },
            { status: isConfigMissing ? 422 : 500 }
        )
    }
}

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET || 'proad_backup_cron_secret_2026'
        const session = await verifyAdminSession()

        if (authHeader !== `Bearer ${cronSecret}` && !session) {
            return NextResponse.json({ error: 'Não autorizado para execução de Cron.' }, { status: 401 })
        }

        const destinatario = process.env.BACKUP_EMAIL_TO || 'adj.proad@uern.br'
        const resultado = await dispararBackupPorEmail({
            destinatario,
            origemDisparo: 'CRON_AUTOMATICO',
        })

        return NextResponse.json({
            sucesso: true,
            mensagem: `Backup automático agendado enviado para ${destinatario}.`,
            ...resultado,
        })
    } catch (error: any) {
        console.error('[API BACKUP EMAIL CRON ERROR]:', error)
        return NextResponse.json(
            { error: 'Falha no disparo automático de backup.', details: error?.message || String(error) },
            { status: 500 }
        )
    }
}
