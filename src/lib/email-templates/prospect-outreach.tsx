import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

import type { TemplateEntry } from './registry'

export interface ProspectOutreachProps {
  subject?: string
  body?: string
  companyName?: string
}

export function ProspectOutreach({ subject, body }: ProspectOutreachProps) {
  const paragraphs = (body ?? '').split(/\n{2,}/).filter(Boolean)

  return (
    <Html lang="fr">
      <Head />
      <Preview>{subject ?? 'Entretien de vos locaux — PURE SPACE NETT'}</Preview>
      <Body style={{ backgroundColor: '#f5f7f7', fontFamily: 'Helvetica, Arial, sans-serif', margin: 0, padding: '24px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: '12px', maxWidth: '560px', padding: '32px' }}>
          <Section>
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, index) => (
                <Text
                  key={index}
                  style={{ color: '#1d2b2b', fontSize: '15px', lineHeight: '24px', margin: '0 0 16px', whiteSpace: 'pre-line' }}
                >
                  {paragraph}
                </Text>
              ))
            ) : (
              <Text style={{ color: '#1d2b2b', fontSize: '15px', lineHeight: '24px' }}>
                Bonjour, nous assurons l&apos;entretien de locaux professionnels en Île-de-France.
              </Text>
            )}
          </Section>
          <Hr style={{ borderColor: '#e2e8e8', margin: '24px 0 16px' }} />
          <Text style={{ color: '#6b7a7a', fontSize: '12px', lineHeight: '18px', margin: 0 }}>
            PURE SPACE NETT — nettoyage professionnel en Île-de-France —{' '}
            <Link href="https://www.purespacenett.com" style={{ color: '#0f6b63' }}>
              www.purespacenett.com
            </Link>
            <br />
            Message professionnel adressé à votre établissement. Répondez à cet email pour ne plus être contacté.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: ProspectOutreach,
  subject: (data) => (data['subject'] as string) || 'Entretien de vos locaux — PURE SPACE NETT',
  displayName: 'Prospection — premier contact',
  previewData: {
    subject: 'Entretien de vos bureaux à Pantin',
    companyName: 'Cabinet Duval',
    body:
      "Bonjour,\n\nJe suis Amine, de PURE SPACE NETT, entreprise de nettoyage basée au Pré-Saint-Gervais.\n\nNous assurons l'entretien régulier de bureaux et de locaux professionnels à Pantin et dans tout le 93 : passages en soirée, équipes fixes, contrôle qualité.\n\nSeriez-vous disponible pour un échange de dix minutes cette semaine ?\n\nAmine — PURE SPACE NETT\nwww.purespacenett.com",
  },
}
