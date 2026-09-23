import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

function RequestFollowup({ name = 'Madame, Monsieur' }: { name?: string }) {
  return <Html lang="fr"><Head /><Preview>Suivi de votre demande PURE SPACE NETT</Preview><Body style={body}><Container style={container}>
    <Heading style={heading}>Suivi de votre demande</Heading>
    <Text style={text}>Bonjour {name},</Text>
    <Text style={text}>Je reviens vers vous concernant votre demande de nettoyage auprès de PURE SPACE NETT. Nous restons disponibles pour préciser le besoin, organiser un échange ou convenir d'une visite.</Text>
    <Text style={text}>Vous pouvez simplement répondre à cet email ou nous appeler au 07 59 48 30 21.</Text>
    <Hr style={hr}/><Text style={footer}>PURE SPACE NETT — <Link href="https://www.purespacenett.com" style={link}>www.purespacenett.com</Link></Text>
  </Container></Body></Html>
}
const body={backgroundColor:'#f4f7f7',fontFamily:'Arial,sans-serif'}
const container={backgroundColor:'#fff',margin:'24px auto',padding:'32px',borderRadius:'12px',maxWidth:'560px'}
const heading={color:'#0d3b3e',fontSize:'22px',margin:'0 0 16px'}
const text={color:'#1f2d2e',fontSize:'14px',lineHeight:'22px'}
const hr={borderColor:'#e2e8e8',margin:'24px 0 16px'}
const footer={color:'#64748b',fontSize:'12px'}
const link={color:'#0f766e'}
export const template: TemplateEntry={component:RequestFollowup,subject:'Suivi de votre demande — PURE SPACE NETT',displayName:'Relance demande de devis',previewData:{name:'Madame, Monsieur'}}