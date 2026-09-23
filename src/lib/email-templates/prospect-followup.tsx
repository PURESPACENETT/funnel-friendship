import { Body, Button, Container, Head, Heading, Hr, Html, Link, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
function ProspectFollowup({ companyName='votre entreprise' }: { companyName?: string }) { return <Html lang="fr"><Head/><Preview>Suite à mon précédent message — PURE SPACE NETT</Preview><Body style={body}><Container style={container}><Heading style={heading}>Suite à mon précédent message</Heading><Text style={text}>Bonjour,</Text><Text style={text}>Je me permets un bref retour vers {companyName}. PURE SPACE NETT accompagne des entreprises de nettoyage en Île-de-France pour absorber un surcroît d'activité, prendre en charge des chantiers délégués ou renforcer une équipe.</Text><Section style={card}><Text style={cardText}><strong>Si vous avez actuellement un chantier à déléguer ou un besoin de renfort</strong>, je peux vous répondre rapidement avec les modalités d'intervention.</Text></Section><Button href="mailto:contact@purespacenett.com" style={button}>Répondre par email</Button><Text style={text}>Si ce sujet n'est pas d'actualité, dites-le-moi simplement et je ne vous relancerai pas.</Text><Hr style={hr}/><Text style={footer}>Amazigh — PURE SPACE NETT<br/><Link href="https://www.purespacenett.com" style={link}>www.purespacenett.com</Link><br/>Message professionnel. Répondez à cet email pour ne plus être contacté.</Text></Container></Body></Html> }
const body={backgroundColor:'#f5f7f7',fontFamily:'Arial,sans-serif',margin:0,padding:'24px 0'}
const container={backgroundColor:'#fff',borderRadius:'12px',maxWidth:'560px',padding:'32px',margin:'0 auto'}
const heading={color:'#0d3b3e',fontSize:'23px',lineHeight:'30px',margin:'0 0 16px'}
const text={color:'#1d2b2b',fontSize:'15px',lineHeight:'24px'}
const card={backgroundColor:'#f0f7f6',borderRadius:'8px',padding:'4px 16px',margin:'20px 0'}
const cardText={color:'#1d2b2b',fontSize:'14px',lineHeight:'22px'}
const button={backgroundColor:'#0f766e',color:'#fff',padding:'12px 18px',borderRadius:'8px',textDecoration:'none',fontSize:'14px'}
const hr={borderColor:'#e2e8e8',margin:'24px 0 16px'}
const footer={color:'#6b7a7a',fontSize:'12px',lineHeight:'18px'}
const link={color:'#0f6b63'}
export const template:TemplateEntry={component:ProspectFollowup,subject:'Suite à mon précédent message — PURE SPACE NETT',displayName:'Relance prospect',previewData:{companyName:'Entreprise de nettoyage'}}