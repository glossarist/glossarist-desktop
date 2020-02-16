import React, { useRef, useContext, useEffect } from 'react';

import { LangConfigContext } from 'coulomb/localizer/renderer/context';

import { MultiLanguageConcept } from '../../models/concepts';

import { availableLanguages } from '../../app';
import { ConceptContext } from './contexts';
import styles from './styles.scss';


interface ConceptItemProps {
  concept: MultiLanguageConcept<any>
  className?: string 
}
export const ConceptItem: React.FC<ConceptItemProps> =
function ({ concept, className }) {
  const lang = useContext(LangConfigContext);
  const conceptCtx = useContext(ConceptContext);

  const active = conceptCtx.ref === concept.termid;

  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (active && el && el.current) { el.current.scrollIntoViewIfNeeded(); }
  }, [active]);

  const localizedConcept = concept[lang.selected as keyof typeof availableLanguages] || concept.eng;
  const designation = localizedConcept.term;

  return (
    <span
        className={`${styles.conceptItem} ${className || ''}`}
        style={{ opacity: concept === null ? '0' : '1' }}
        ref={el}>
      {designation}
    </span>
  );
};
