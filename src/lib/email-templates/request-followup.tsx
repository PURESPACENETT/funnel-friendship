import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
function RequestFollowup({ name='Madame, Monsieur' }: { name?: string }) { return <Html lang="fr"><Head/><Preview>Nous revenons vers vous concernant votre demande de devis</Preview><Body style={body}><Container style={container}><Heading style={heading}>Un point sur votre demande</Heading><Text style={text}>Bonjour {name},</Text><Text style={text}>Nous revenons vers vous au sujet de votre demande de devis auprès de PURE SPACE NETT. Si votre projet est toujours d'actualité, nous pouvons préciser le besoin, organiser une visite ou convenir directement d'une intervention.</Text><Section style={card}><Text style={cardText}>Répondez simplement à cet email avec vos disponibilités, ou appelez-nous au <strong>07 59 48 30 21</strong>.</Text></Section><Button href="tel:+33759483021" style={button}>Nous appeler</Button><Text style={text}>Si votre besoin a changé, indiquez-nous simplement ce qu'il faut ajuster.</Text><Hr style={hr}/><Text style={footer}>PURE SPACE NETT — nettoyage professionnel en Île-de-France — <Link href="https://www.purespacenett.com" style={link}>purespacenett.com</Link></Text></Container></Body></Html> }
const body={backgroundColor:'#f4f7f7',fontFamily:'Arial,sans-serif',margin:0,padding:'24px 0'}
const container={backgroundColor:'#fff',margin:'0 auto',padding:'32px',borderRadius:'12px',maxWidth:'560px'}
const heading={color:'#0d3b3e',fontSize:'23px',lineHeight:'30px',margin:'0 0 16px'}
const text={color:'#1f2d2e',fontSize:'15px',lineHeight:'24px'}
const card={backgroundColor:'#f0f7f6',borderRadius:'8px',padding:'4px 16px',margin:'20px 0'}
const cardText={color:'#1f2d2e',fontSize:'14px',lineHeight:'22px'}
const button={backgroundColor:'#0f766e',color:'#fff',padding:'12px 18px',borderRadius:'8px',textDecoration:'none',fontSize:'14px'}
const hr={borderColor:'#e2e8e8',margin:'24px 0 16px'}
const footer={color:'#64748b',fontSize:'12px',lineHeight:'18px'}
const link={color:'#0f766e'}
export const template:TemplateEntry={component:RequestFollowup,subject:'Suivi de votre demande de devis — PURE SPACE NETT',displayName:'Relance demande de devis',previewData:{name:'Madame, Monsieur'}}