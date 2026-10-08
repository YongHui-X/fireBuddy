import { describe, expect, it } from 'vitest';
import { LEGAL_CONTACT_EMAIL, LEGAL_DOCUMENTS, LEGAL_VERSION, isLegalDocumentId, needsLegalNotice } from '@firebuddy/shared';

describe('needsLegalNotice', () => {
  it('waits for the welcome on a new install', () => {
    expect(needsLegalNotice({ welcomedAt: null, acceptedVersion: null })).toBe(false);
  });

  it('asks a phone welcomed before the terms existed, or on an older version', () => {
    expect(needsLegalNotice({ welcomedAt: '2026-10-01T00:00:00Z', acceptedVersion: null })).toBe(true);
    expect(needsLegalNotice({ welcomedAt: '2026-10-01T00:00:00Z', acceptedVersion: '2026-01-01' })).toBe(true);
  });

  it('stays quiet once the current version is accepted', () => {
    expect(needsLegalNotice({ welcomedAt: '2026-10-01T00:00:00Z', acceptedVersion: LEGAL_VERSION })).toBe(false);
  });
});

describe('legal documents', () => {
  it('only accepts known document ids', () => {
    expect(isLegalDocumentId('terms')).toBe(true);
    expect(isLegalDocumentId('privacy')).toBe(true);
    expect(isLegalDocumentId('cookies')).toBe(false);
  });

  it('names the contact inbox and the not-advice disclaimer', () => {
    const privacy = LEGAL_DOCUMENTS.privacy.sections.map((section) => section.body).join(' ');
    const terms = LEGAL_DOCUMENTS.terms.sections.map((section) => section.body).join(' ');
    expect(privacy).toContain(LEGAL_CONTACT_EMAIL);
    expect(privacy).toMatch(/Personal Data Protection Commission/);
    expect(terms).toMatch(/not financial, investment, tax, insurance or legal advice/);
    expect(terms).toMatch(/laws of Singapore/);
  });
});
