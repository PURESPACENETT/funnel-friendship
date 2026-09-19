import type { ComponentType } from 'react'
import { template as newRequestOwner } from './new-request-owner'
import { template as prospectOutreach } from './prospect-outreach'
import { template as requestConfirmation } from './request-confirmation'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'new-request-owner': newRequestOwner,
  'request-confirmation': requestConfirmation,
  'prospect-outreach': prospectOutreach,
}
