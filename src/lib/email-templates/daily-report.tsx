import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props { summary?: string }
function DailyReport({ summary='Rapport commercial quotidien' }: Props) {
 return <Html lang="fr"><Head/><Preview>Rapport commercial quotidien PURE SPACE NETT</Preview><Body style={body}><Container style={container}><Heading style={heading}>Rapport commercial quotidien</Heading><Text style={text}>{summary}</Text><Hr style={hr}/><Text style={footer}>PURE SPACE NETT — automatisation commerciale</Text></Container></Body></Html>
}
const body={backgroundColor:'#f4f7f7',fontFamily:'Arial,sans-serif'}
const container={backgroundColor:'#fff',margin:'24px auto',padding:'32px',borderRadius:'12px',maxWidth:'600px'}
const heading={color:'#0d3b3e',fontSize:'22px'}
const text={color:'#1f2d2e',fontSize:'14px',lineHeight:'22px',whiteSpace:'pre-line' as const}
const hr={borderColor:'#e2e8e8',margin:'24px 0 16px'}
const footer={color:'#64748b',fontSize:'12px'}
export const template: TemplateEntry={component:DailyReport,subject:'Rapport commercial quotidien — PURE SPACE NETT',displayName:'Reporting quotidien',previewData:{summary:'Aucune action automatique.'}}