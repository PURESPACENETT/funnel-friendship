import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
interface Props { summary?: string }
function DailyReport({ summary='Aucune action automatique.' }: Props) { const lines=summary.split('\n'); return <Html lang="fr"><Head/><Preview>Rapport commercial quotidien — PURE SPACE NETT</Preview><Body style={body}><Container style={container}><Heading style={heading}>Rapport commercial quotidien</Heading><Text style={intro}>Voici le résumé des actions automatiques exécutées aujourd'hui.</Text><Section style={card}>{lines.map((line,i)=><Text key={i} style={row}>{line}</Text>)}</Section><Text style={note}>Consultez votre espace PURE SPACE NETT pour traiter les prospects intéressés et les demandes nécessitant une action.</Text><Hr style={hr}/><Text style={footer}>PURE SPACE NETT — automatisation commerciale</Text></Container></Body></Html> }
const body={backgroundColor:'#f4f7f7',fontFamily:'Arial,sans-serif',margin:0,padding:'24px 0'}
const container={backgroundColor:'#fff',margin:'0 auto',padding:'32px',borderRadius:'12px',maxWidth:'600px'}
const heading={color:'#0d3b3e',fontSize:'23px',lineHeight:'30px',margin:'0 0 8px'}
const intro={color:'#64748b',fontSize:'14px',lineHeight:'22px',margin:'0 0 20px'}
const card={backgroundColor:'#f0f7f6',borderRadius:'8px',padding:'12px 18px'}
const row={color:'#1f2d2e',fontSize:'14px',lineHeight:'22px',margin:'6px 0'}
const note={color:'#1f2d2e',fontSize:'14px',lineHeight:'22px'}
const hr={borderColor:'#e2e8e8',margin:'24px 0 16px'}
const footer={color:'#64748b',fontSize:'12px'}
export const template:TemplateEntry={component:DailyReport,subject:'Rapport commercial quotidien — PURE SPACE NETT',displayName:'Reporting quotidien',previewData:{summary:'Relances demandes : 2\nRelances prospects : 4\nDemandes d’avis : 1'}}