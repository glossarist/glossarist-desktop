import * as crypto from 'crypto';
import { MultiLanguageConcept, SupportedLanguages, Concept, Designation } from 'models/concepts';
import { WithRevisions, Revision } from 'models/revisions';
import { availableLanguages } from '../app';


export function migrateConcept(obj: MultiLanguageConcept<any>): [MultiLanguageConcept<any>, boolean] {
  var migrated: MultiLanguageConcept<any> = { ...obj };
  var didMigrate = false;

  for (const langID in availableLanguages) {
    const localized = obj[langID as keyof SupportedLanguages];
    if (localized === undefined) {
      // Entry for this language is not present on this concept.
      continue;
    }

    const withMultipleTerms = migrateTerms(localized);
    if (withMultipleTerms !== null) {
      didMigrate = true;
    }

    const withDomain = migrateDomain(withMultipleTerms || localized);
    if (withDomain !== null) {
      didMigrate = true;
    }

    const withRevisions = initializeRevisionsForLanguageEntry(withDomain || withMultipleTerms || localized);
    if (withRevisions !== null) {
      didMigrate = true;
    }

    // @ts-ignore
    migrated[langID as keyof SupportedLanguages] = withRevisions || withDomain || withMultipleTerms || localized;
  }

  return [migrated, didMigrate];
}


function initializeRevisionsForLanguageEntry
<L extends keyof SupportedLanguages>(e: WithRevisions<Concept<number, L>>):
WithRevisions<Concept<number, L>> | null {
  /* Prepares revision history scaffolding for given entry,
  if its revision history is missing. */

  if (e.hasOwnProperty('_revisions') && e._revisions.current !== undefined) {
    // Entry already has revisions.
    return null;

  } else {
    // Entry doesn’t have revisions yet.

    const objectID = crypto.randomBytes(3).toString('hex');
    // 6 hexadecimal characters

    const defaultRevision: Revision<Concept<number, L>> = {
      object: e,
      parents: [],
      timeCreated: e.date_accepted || new Date(),
      author: {
        name: "Glossarist bot",
        email: "glossarist@ribose.com",
      }
    };

    return {
      ...e,
      _revisions: {
        current: objectID,
        tree: {
          [objectID]: defaultRevision,
        },
      },
    };
  }
}


function migrateDomain(e: WithRevisions<Concept<number, any>>):
WithRevisions<Concept<number, any>> | null {
  const domainRegex = /\<([^)]+)\>/;
  var domain = undefined;
  for (const [idx, { designation }] of e.terms.entries()) {
    const matches = domainRegex.exec(designation);
    if (matches !== null && matches[0].indexOf('<') === -1) {
      domain = matches[1];
      e.terms[idx].designation = designation.replace(matches[0], '').trim();
    }
  }

  if (domain !== undefined && e.domain === undefined) {
    return { ...e, domain }
  } else {
    return null;
  }
}


type LegacyFields = {
  term: string
  classification?: 'preferred'
  synonyms?: string
}

function migrateTerms(e: WithRevisions<Concept<number, any>>):
WithRevisions<Concept<number, any>> | null {
  /* Migrates current concept revision history for given language,
  if it’s translated to it and revision history is missing. */

  type LegacyType = Exclude<WithRevisions<Concept<number, any>>, "terms"> & LegacyFields;

  if (e.terms !== undefined && e.hasOwnProperty('synonyms') === false) {
    // Assume term and synonyms were migrated…
    return null;
  }

  var legacy = e as LegacyType;

  var terms: Designation[] = [];

  if (legacy.terms === undefined) {
    var designation: Designation = {
      designation: legacy.term,
      type: 'expression',
    };

    if (legacy.classification) {
      designation.normative_status = legacy.classification;
    }

    terms = [designation];

    delete legacy.term;
    delete legacy.classification;

  } else {
    terms = [ ...legacy.terms ];
  }

  if (legacy.synonyms !== undefined) {
    const legacySynonyms = (legacy.synonyms || '').split(',').map(s => s.trim());
    const synonyms = legacySynonyms.filter(s => s !== '').map((s): Designation => ({
      designation: s,
      type: 'expression',
    }));

    for (const syn of synonyms) {
      terms.push(syn);
    }

    delete legacy.synonyms;
  }

  const migrated: WithRevisions<Concept<number, any>> = { ...legacy, terms };
  return migrated;
}
