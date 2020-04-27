import React from 'react';

import { Classes } from '@blueprintjs/core';

import { availableLanguages } from '../../../app';
import { MultiLanguageConcept, ConceptRef } from 'models/concepts';
import { app } from 'renderer/index';

import styles from './styles.scss';
import { RepresentingDesignation } from './designation';


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

  return (
    <span
        className={`
          ${styles.conceptItem} ${className || ''}
          ${designationValidityClass}
        `}>
      {c ? <RepresentingDesignation entry={c} /> : <i>missing designation</i>}
    </span>
  );
};


interface LazyConceptItemProps {
  conceptRef: ConceptRef
  lang: keyof typeof availableLanguages
  className?: string
}
export const LazyConceptItem: React.FC<LazyConceptItemProps> = function ({ conceptRef, lang, className }) {
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
    return <span className={`${Classes.SKELETON} ${styles.conceptItem} ${className || ''}`}>
      Loading…
    </span>
  }
};