import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

function ProspectFollowup({ companyName='Votre entreprise' }: { companyName?: string }) {
  return <Html lang="fr"><Head/><Preview>Suite à notre message — PURE SPACE NETT</Preview><Body style={body}><Container style={container}>
    <Heading style={heading}>Suite à notre message</Heading>
    <Text style={text}>Bonjour,</Text>
    <Text style={text}>Je me permets de revenir vers {companyName} à la suite de mon précédent message. PURE SPACE NETT peut intervenir en Île-de-France pour renforcer une équipe, prendre en charge des chantiers délégués ou assurer des prestations de nettoyage selon vos besoins.</Text>
    <Text style={text}>Si le sujet est d'actualité, je peux vous présenter rapidement notre fonctionnement. Il suffit de répondre à cet email.</Text>
    <Hr style={hr}/><Text style={footer}>PURE SPACE NETT — <Link href="https://www.purespacenett.com" style={link}>www.purespacenett.com</Link><br/>Message professionnel adressé à votre établissement. Répondez à cet email pour ne plus être contacté.</Text>
  </Container></Body></Html>
}
const body={backgroundColor:'#f5f7f7',fontFamily:'Arial,sans-serif'}
const container={backgroundColor:'#fff',borderRadius:'12px',maxWidth:'560px',padding:'32px',margin:'24px auto'}
const heading={color:'#0d3b3e',fontSize:'22px',margin:'0 0 16px'}
const text={color:'#1d2b2b',fontSize:'15px',lineHeight:'24px'}
const hr={borderColor:'#e2e8e8',margin:'24px 0 16px'}
const footer={color:'#6b7a7a',fontSize:'12px',lineHeight:'18px'}
const link={color:'#0f6b63'}
export const template: TemplateEntry={component:ProspectFollowup,subject:'Suite à notre message — PURE SPACE NETT',displayName:'Relance prospect',previewData:{companyName:'Entreprise'}}