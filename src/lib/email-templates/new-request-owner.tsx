import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface OwnerAlertProps {
  clientType?: string
  name?: string
  email?: string
  phone?: string
  city?: string
  postalCode?: string
  surface?: number
  frequency?: string
  estimateMin?: string
  estimateMax?: string
  scoreLabel?: string
  requestId?: string
}

function OwnerAlertEmail({
  clientType = 'Entreprise',
  name = 'Jean Dupont',
  email = 'jean@exemple.fr',
  phone = '06 12 34 56 78',
  city = 'Lyon',
  postalCode = '69001',
  surface = 250,
  frequency = 'Hebdomadaire',
  estimateMin = '450 €',
  estimateMax = '520 €',
  scoreLabel = 'Haute',
  requestId = '',
}: OwnerAlertProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>Nouvelle demande de devis — {name} ({clientType})</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Nouvelle demande de devis</Heading>
          <Text style={lead}>
            {name} · {clientType} · Priorité {scoreLabel}
          </Text>
          <Section style={card}>
            <Text style={row}><strong>Contact :</strong> {email} — {phone}</Text>
            <Text style={row}><strong>Lieu :</strong> {city} {postalCode}</Text>
            <Text style={row}><strong>Surface :</strong> {surface} m² · {frequency}</Text>
            <Text style={row}>
              <strong>Estimation :</strong> {estimateMin} – {estimateMax}
            </Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            Retrouvez cette demande dans votre espace PURE SPACE NETT (Demandes
            {requestId ? ` · réf. ${requestId.slice(0, 8)}` : ''}).
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
const heading = { color: '#0d3b3e', fontSize: '22px', margin: '0 0 8px' }
const lead = { color: '#0f766e', fontSize: '14px', fontWeight: 600 as const, margin: '0 0 16px' }
const card = {
  backgroundColor: '#f0f7f6',
  borderRadius: '8px',
  padding: '16px 20px',
}
const row = { color: '#1f2d2e', fontSize: '14px', lineHeight: '22px', margin: '4px 0' }
const hr = { borderColor: '#e2e8e8', margin: '24px 0 16px' }
const footer = { color: '#64748b', fontSize: '12px' }

export const template = {
  component: OwnerAlertEmail,
  subject: (d: Record<string, any>) =>
    `Nouvelle demande de devis — ${d.name ?? 'Prospect'} (${d.clientType ?? ''})`,
  displayName: 'Alerte nouvelle demande (vous)',
  previewData: {},
} satisfies TemplateEntry
