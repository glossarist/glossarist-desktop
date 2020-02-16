import React, { useRef, useContext, useEffect } from 'react';

import { MultiLanguageConcept } from '../../models/concepts';

import { availableLanguages } from '../../app';
import { ConceptContext } from './contexts';
import styles from './styles.scss';
import { Classes } from '@blueprintjs/core';


interface ConceptItemProps {
  concept: MultiLanguageConcept<any>
  lang: keyof typeof availableLanguages
  className?: string 
}
export const ConceptItem: React.FC<ConceptItemProps> =
function ({ lang, concept, className }) {
  const conceptCtx = useContext(ConceptContext);
  const el = useRef<HTMLDivElement>(null);

  const active = conceptCtx.ref === concept.termid;

  useEffect(() => {
    if (active && el && el.current) {
      el.current.scrollIntoViewIfNeeded();
    }
  }, [active]);

  const c = concept[lang as keyof typeof availableLanguages] || concept.eng;

  const designation = c.term;
  const isValid = c ? ['retired', 'superseded'].indexOf(c.entry_status) < 0 : undefined;
  const designationValidityClass = isValid === false ? styles.invalidDesignation : '';

  return (
    <div
        className={`
          ${lang === 'ara' ? Classes.RTL : ''}
          ${styles.conceptItem} ${className || ''}
          ${designationValidityClass}
        `}
        ref={el}>
      {designation}
    </div>
  );
};
