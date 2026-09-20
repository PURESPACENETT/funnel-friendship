import * as React from 'react'
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

export interface ProspectContactedOwnerProps {
  /** Companies that just moved to "Contacté". */
  companies?: { name: string; email: string; city?: string | null }[]
  /** "automatique" for the daily run, "manuel" when sent from the app. */
  origin?: string
  /** Extra line for the daily run, e.g. new companies found. */
  summary?: string
}

export function ProspectContactedOwner({
  companies = [{ name: 'Cabinet Duval', email: 'contact@cabinet-duval.fr', city: 'Paris' }],
  origin = 'automatique',
  summary = '',
}: ProspectContactedOwnerProps) {
  const count = companies.length

  return (
    <Html lang="fr">
      <Head />
      <Preview>
        {count} prospect{count > 1 ? 's' : ''} passé{count > 1 ? 's' : ''} en Contacté
      </Preview>
      <Body
        style={{
          backgroundColor: '#f5f7f7',
          fontFamily: 'Helvetica, Arial, sans-serif',
          margin: 0,
          padding: '24px 0',
        }}
      >
        <Container
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            maxWidth: '560px',
            padding: '32px',
          }}
        >
          <Heading style={{ color: '#1d2b2b', fontSize: '20px', margin: '0 0 8px' }}>
            {count} prospect{count > 1 ? 's' : ''} en « Contacté »
          </Heading>
          <Text style={{ color: '#6b7a7a', fontSize: '13px', margin: '0 0 20px' }}>
            Envoi {origin} — Prospection PURE SPACE NETT
          </Text>

          {summary ? (
            <Text style={{ color: '#1d2b2b', fontSize: '14px', margin: '0 0 16px' }}>
              {summary}
            </Text>
          ) : null}

          <Section
            style={{
              backgroundColor: '#f5f7f7',
              borderRadius: '8px',
              padding: '16px',
            }}
          >
            {companies.map((company) => (
              <Text
                key={`${company.name}-${company.email}`}
                style={{ color: '#1d2b2b', fontSize: '14px', lineHeight: '22px', margin: '0 0 8px' }}
              >
                <strong>{company.name}</strong>
                {company.city ? ` — ${company.city}` : ''}
                <br />
                {company.email}
              </Text>
            ))}
          </Section>

          <Hr style={{ borderColor: '#e2e8e8', margin: '24px 0 16px' }} />
          <Text style={{ color: '#6b7a7a', fontSize: '12px', lineHeight: '18px', margin: 0 }}>
            Retrouvez ces fiches dans l&apos;onglet Prospection de votre espace privé.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: ProspectContactedOwner,
  subject: (data) => {
    const count = Array.isArray(data['companies']) ? data['companies'].length : 1
    return `${count} prospect${count > 1 ? 's' : ''} passé${count > 1 ? 's' : ''} en Contacté`
  },
  displayName: 'Prospection — alerte passage en Contacté',
  previewData: {
    origin: 'automatique',
    summary: '18 entreprises trouvées, 6 messages préparés, 3 emails envoyés.',
    companies: [
      { name: 'Cabinet Duval', email: 'contact@cabinet-duval.fr', city: 'Paris' },
      { name: 'Syndic Lefèvre', email: 'info@syndic-lefevre.fr', city: 'Montreuil' },
    ],
  },
}
