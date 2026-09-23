import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
function ReviewRequest({ name='Madame, Monsieur', reviewUrl='https://share.google/2u1kIaVRrVNB4drT0' }: { name?: string; reviewUrl?: string }) { return <Html lang="fr"><Head/><Preview>Merci pour votre confiance — votre avis compte pour PURE SPACE NETT</Preview><Body style={body}><Container style={container}><Heading style={heading}>Merci pour votre confiance</Heading><Text style={text}>Bonjour {name},</Text><Text style={text}>Merci d'avoir fait confiance à PURE SPACE NETT pour votre intervention.</Text><Text style={text}>Si vous avez une minute, pourriez-vous partager votre expérience ? Votre retour nous aide à améliorer notre service et permet à d'autres personnes de mieux comprendre notre façon de travailler.</Text><Section style={card}><Text style={cardText}>Votre avis peut être laissé en quelques instants.</Text><Button href={reviewUrl} style={button}>Partager mon avis</Button></Section><Text style={small}>Merci pour le temps consacré à ce retour.</Text><Hr style={hr}/><Text style={footer}>PURE SPACE NETT — <Link href="https://www.purespacenett.com" style={link}>purespacenett.com</Link></Text></Container></Body></Html> }
const body={backgroundColor:'#f4f7f7',fontFamily:'Arial,sans-serif',margin:0,padding:'24px 0'}
const container={backgroundColor:'#fff',margin:'0 auto',padding:'32px',borderRadius:'12px',maxWidth:'560px'}
const heading={color:'#0d3b3e',fontSize:'23px',lineHeight:'30px',margin:'0 0 16px'}
const text={color:'#1f2d2e',fontSize:'15px',lineHeight:'24px'}
const card={backgroundColor:'#f0f7f6',borderRadius:'8px',padding:'18px',margin:'20px 0'}
const cardText={color:'#1f2d2e',fontSize:'14px',lineHeight:'22px',margin:'0 0 12px'}
const button={backgroundColor:'#0f766e',color:'#fff',padding:'12px 18px',borderRadius:'8px',textDecoration:'none',fontSize:'14px'}
const small={color:'#64748b',fontSize:'12px',lineHeight:'18px'}
const hr={borderColor:'#e2e8e8',margin:'24px 0 16px'}
const footer={color:'#64748b',fontSize:'12px'}
const link={color:'#0f766e'}
export const template:TemplateEntry={component:ReviewRequest,subject:'Merci pour votre confiance — votre avis compte',displayName:'Demande d’avis',previewData:{name:'Madame, Monsieur'}}