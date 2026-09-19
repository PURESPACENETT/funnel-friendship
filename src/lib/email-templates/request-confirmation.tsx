import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface ConfirmationProps {
  name?: string
  estimateMin?: string
  estimateMax?: string
  frequency?: string
  city?: string
}

function ConfirmationEmail({
  name = 'Jean Dupont',
  estimateMin = '450 €',
  estimateMax = '520 €',
  frequency = 'Hebdomadaire',
  city = 'Lyon',
}: ConfirmationProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>Votre demande de devis PURE SPACE NETT est bien reçue</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Merci {name} !</Heading>
          <Text style={text}>
            Votre demande de devis est bien arrivée. Voici votre estimation
            indicative pour un nettoyage {frequency.toLowerCase()} à {city} :
          </Text>
          <Section style={card}>
            <Text style={price}>
              {estimateMin} – {estimateMax}
            </Text>
            <Text style={note}>Estimation indicative, confirmée après visite ou échange.</Text>
          </Section>
          <Text style={text}>
            Nous revenons vers vous sous 24 h ouvrées pour affiner votre devis.
            Une question ? Répondez simplement à cet email.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            PURE SPACE NETT —{' '}
            <Link href="https://www.purespacenett.com" style={link}>
              www.purespacenett.com
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const body = { backgroundColor: '#f4f7f7', fontFamily: 'Manrope, Arial, sans-serif' }
const container = {
  backgroundColor: '#ffffff',
  margin: '24px auto',
  padding: '32px',
  borderRadius: '12px',
  maxWidth: '560px',
}
const heading = { color: '#0d3b3e', fontSize: '22px', margin: '0 0 12px' }
const text = { color: '#1f2d2e', fontSize: '14px', lineHeight: '22px' }
const card = {
  backgroundColor: '#f0f7f6',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '16px 0',
}
const price = { color: '#0d3b3e', fontSize: '26px', fontWeight: 700 as const, margin: '0' }
const note = { color: '#64748b', fontSize: '12px', margin: '8px 0 0' }
const hr = { borderColor: '#e2e8e8', margin: '24px 0 16px' }
const footer = { color: '#64748b', fontSize: '12px' }
const link = { color: '#0f766e' }

export const template = {
  component: ConfirmationEmail,
  subject: 'Votre demande de devis PURE SPACE NETT',
  displayName: 'Confirmation au prospect',
  previewData: {},
} satisfies TemplateEntry
