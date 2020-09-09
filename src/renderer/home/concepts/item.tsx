import React from 'react';

import { availableLanguages } from '../../../app';
import { MultiLanguageConcept, ConceptRef, Concept, SupportedLanguages, PARENT_RELATIONSHIP } from 'models/concepts';
import { app } from 'renderer/index';

import styles from '../styles.scss';
import { RepresentingDesignation } from './designation';


interface LazyParentConceptListProps {
  parentConceptIDs: ConceptRef[]
  lang: keyof SupportedLanguages
  className?: string
}
export const LazyParentConceptList: React.FC<LazyParentConceptListProps> =
function ({ parentConceptIDs, lang, className }) {
  return (
    <>
      {(parentConceptIDs && parentConceptIDs.length > 0)
        ? <span className={`${styles.parents} ${className}`}
                title="Parent concept (domain, broader concept)">
            {parentConceptIDs.map(id =>
              <LazyConceptItem conceptRef={id} lang={lang} />
            )}
          </span>
        : null}
    </>
  );
};


interface ConceptItemProps {
  concept: MultiLanguageConcept<any>
  lang: keyof typeof availableLanguages
  className?: string
}
export const ConceptItem: React.FC<ConceptItemProps> =
function ({ lang, concept, className }) {

  const c = concept[lang as keyof typeof availableLanguages] || concept.eng;

  const isValid = c ? ['retired', 'superseded'].indexOf(c.entry_status) < 0 : undefined;
  const designationValidityClass = isValid === false ? styles.invalidDesignation : '';

  const parents = (concept.relations || []).
    filter(r => r.type === PARENT_RELATIONSHIP).
    map(r => r.to);

  return (
    <span
        className={`
          ${styles.conceptItem} ${className || ''}
          ${designationValidityClass}
        `}>
      {c
        ? <RepresentingDesignation entry={c} parentConceptIDs={parents} />
        : <i>missing designation</i>}
    </span>
  );
};


interface LocalizedEntryProps {
  entry: Concept<any, any>
  className?: string
}
export const LocalizedEntry: React.FC<LocalizedEntryProps> =
function ({ entry, className }) {

  return (
    <span
        className={`
          ${styles.conceptItem} ${className || ''}
        `}>
      <RepresentingDesignation entry={entry} />
    </span>
  );
};


interface LazyConceptItemProps {
  conceptRef: ConceptRef
  lang: keyof typeof availableLanguages
  className?: string
}
export const LazyConceptItem: React.FC<LazyConceptItemProps> =
function ({ conceptRef, lang, className }) {
  /* Fetches concept data from backend, defers display to ConceptItem.
     NOTE: Should not be used in large lists, too slow.
     For large lists, fetch all concepts in one request and use LazyConceptList.
  */
  const concept = app.useOne<MultiLanguageConcept<any>, ConceptRef>('concepts', conceptRef);

  if (concept.object) {
    return <ConceptItem
      concept={concept.object}
      lang={lang}
      className={className}
    />;
  } else {
    return <span className={`${styles.conceptItem} ${className || ''}`}>
      {conceptRef}
    </span>
  }
};
