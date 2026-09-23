import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

function ReviewRequest({ name='Madame, Monsieur', reviewUrl='https://share.google/2u1kIaVRrVNB4drT0' }: { name?: string; reviewUrl?: string }) {
  return <Html lang="fr"><Head/><Preview>Votre avis sur PURE SPACE NETT</Preview><Body style={body}><Container style={container}>
    <Heading style={heading}>Votre retour nous intéresse</Heading>
    <Text style={text}>Bonjour {name},</Text>
    <Text style={text}>Merci pour votre confiance. Si vous avez quelques instants, votre avis sur notre intervention nous aiderait à améliorer notre service et à informer nos futurs clients.</Text>
    <Button href={reviewUrl} style={button}>Laisser un avis</Button>
    <Text style={small}>Merci pour votre retour.</Text>
    <Text style={footer}>PURE SPACE NETT — <Link href="https://www.purespacenett.com" style={link}>www.purespacenett.com</Link></Text>
  </Container></Body></Html>
}
const body={backgroundColor:'#f4f7f7',fontFamily:'Arial,sans-serif'}
const container={backgroundColor:'#fff',margin:'24px auto',padding:'32px',borderRadius:'12px',maxWidth:'560px'}
const heading={color:'#0d3b3e',fontSize:'22px'}
const text={color:'#1f2d2e',fontSize:'14px',lineHeight:'22px'}
const button={backgroundColor:'#0f766e',color:'#fff',padding:'12px 18px',borderRadius:'8px',textDecoration:'none',fontSize:'14px'}
const small={color:'#64748b',fontSize:'12px',marginTop:'20px'}
const footer={color:'#64748b',fontSize:'12px'}
const link={color:'#0f766e'}
export const template: TemplateEntry={component:ReviewRequest,subject:'Votre avis sur PURE SPACE NETT',displayName:'Demande d’avis',previewData:{name:'Madame, Monsieur'}}