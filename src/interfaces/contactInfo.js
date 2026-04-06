/**
 * contactInfo.js
 * Official contact and project channel data for Aconcagua: Stone Sentinel.
 * Single source of truth for contact details used across tooling and scripts.
 *
 * HTML surfaces reference these values directly as href attributes.
 * Any tooling that needs canonical project contacts should import from here.
 */

export const CONTACT_EMAIL = 'aconcaguastonesentinel@gmail.com';
export const INSTAGRAM_URL = 'https://www.instagram.com/aconcaguastonesentinel/';
export const GITHUB_URL = 'https://github.com/ernstgallegos/aconcagua-stone-sentinel';

/** Structured project contact contract */
export const contactInfo = {
  email: CONTACT_EMAIL,
  instagram: INSTAGRAM_URL,
  github: GITHUB_URL,
};

export default contactInfo;