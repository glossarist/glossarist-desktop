import { AuthoritativeSource } from 'models/concepts';


export type AuthoritativeSourceDraft = { [K in keyof AuthoritativeSource]: string };


export function initializeAuthSourceDraft(authSource?: AuthoritativeSource) {
  return {
    ref: '',
    clause: '',
    link: 'https://example.com/',
  };
}


export function convertDraftToAuthSource(authSourceDraft: AuthoritativeSourceDraft): [AuthoritativeSource, string[]] {
  /* Always returns an authoritative source, since all fields are optional,
     but can also return a list of errors. */

  var errors: string[] = [];

  const ref = authSourceDraft.ref?.trim() || undefined;
  const clause = authSourceDraft.clause?.trim() || undefined;

  let link: URL | undefined;

  try {
    link = authSourceDraft.link ? new URL(authSourceDraft.link) : undefined;
  } catch (e) {
    errors.push("You seem to have specified an incorrect URL as authoritative source link.");
  }

  return [{ ref, clause, link }, errors];
}
