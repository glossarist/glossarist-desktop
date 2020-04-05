import { MultiLanguageConcept, SupportedLanguages, WithRevisions, Concept, Designation } from 'models/concepts';
import { availableLanguages } from '../app';


/* Migrating legacy domains */

export function migrateConcept(obj: MultiLanguageConcept<any>): MultiLanguageConcept<any> {
  var migrated: MultiLanguageConcept<any> = { ...obj };

  for (const langID in availableLanguages) {
    const localized = obj[langID as keyof SupportedLanguages];
    if (localized === undefined) {
      // Entry for this language is not present on this concept.
      continue;
    }
    const withRevisions = initializeRevisionsForLanguageEntry(localized);
    const withMultipleTerms = migrateTerms(withRevisions);
    const withDomain = migrateDomain(withMultipleTerms);

    migrated[langID as keyof SupportedLanguages] = withDomain;
  }

  return migrated;
}


function initializeRevisionsForLanguageEntry
<L extends keyof SupportedLanguages>(e: WithRevisions<Concept<number, L>>):
WithRevisions<Concept<number, L>> {
  /* Prepares revision history scaffolding for given entry,
  if its revision history is missing. */

  if (e.hasOwnProperty('_revisions')) {
    // Entry already has revisions.
    return e as WithRevisions<Concept<number, L>>;

  } else {
    // Entry doesn’t have revisions yet.
    return {
      ...e,
      _revisions: {
        current: undefined,
        tree: {},
      },
    };
  }
}


function migrateDomain(e: WithRevisions<Concept<number, any>>):
WithRevisions<Concept<number, any>> {
  /* Migrates current concept revision history for given language,
  if it’s translated to it and revision history is missing. */

  if (e.domain !== undefined) {
    return e;
  }

  const domainRegex = /\<([^)]+)\>/;
  var domain = undefined;
  for (const [idx, { designation }] of e.terms.entries()) {
    const matches = domainRegex.exec(designation)
    if (matches !== null && matches.indexOf('<') === -1) {
      domain = matches[1];
      e.terms[idx].designation = designation.replace(matches[0], '').trim();
    }
  }

  return { ...e, domain };
}


type LegacyFields = {
  term: string
  classification?: 'preferred'
  synonyms?: string
}

function migrateTerms(e: WithRevisions<Concept<number, any>>):
WithRevisions<Concept<number, any>> {
  /* Migrates current concept revision history for given language,
  if it’s translated to it and revision history is missing. */

  if (e.terms !== undefined) {
    return e;
  }

  var legacy = e as Exclude<WithRevisions<Concept<number, any>>, "terms"> & LegacyFields;

  const designation: Designation = {
    designation: legacy.term,
    type: 'expression',
    normativeStatus: legacy.classification,
  }

  const synonyms = (legacy.synonyms || '').split(',').map(s => s.trim());

  delete legacy.term;
  delete legacy.classification;
  delete legacy.synonyms;

  const terms = [designation, ...synonyms.filter(s => s !== '').map((s): Designation => ({
    designation: s,
    type: 'expression',
  }))];

  const migrated: WithRevisions<Concept<number, any>> = { ...legacy, terms };
  return migrated;
}


// type MaybeLegacy<CurrentModel, NewProperties extends keyof Partial<CurrentModel>> = {
//   [P in Exclude<keyof CurrentModel, NewProperties>]: CurrentModel[P]
// } & {
//   [N in NewProperties]?: CurrentModel[N]
// };