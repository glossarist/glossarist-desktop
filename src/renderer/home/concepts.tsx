import React, { useRef, useContext, useEffect } from 'react';

import { LangConfigContext } from 'coulomb/localizer/renderer/context';

import { MultiLanguageConcept } from '../../models/concepts';

import { availableLanguages } from '../../app';
import { ConceptContext } from './contexts';
import styles from './styles.scss';
import { Classes } from '@blueprintjs/core';


interface ConceptItemProps {
  concept: MultiLanguageConcept<any>
  className?: string 
}
export const ConceptItem: React.FC<ConceptItemProps> =
function ({ concept, className }) {
  const lang = useContext(LangConfigContext);
  const conceptCtx = useContext(ConceptContext);
  const el = useRef<HTMLDivElement>(null);

  const active = conceptCtx.ref === concept.termid;

  useEffect(() => {
    if (active && el && el.current) { el.current.scrollIntoViewIfNeeded(); }
  }, [active]);

  const c = concept[lang.selected as keyof typeof availableLanguages] || concept.eng;

  const designation = c.term;
  const isValid = c ? ['retired', 'superseded'].indexOf(c.entry_status) < 0 : undefined;
  const designationValidityClass = isValid === false ? styles.invalidDesignation : '';

  return (
    <div
        className={`
          ${lang.selected === 'ara' ? Classes.RTL : ''}
          ${styles.conceptItem} ${className || ''}
          ${designationValidityClass}
        `}
        ref={el}>
      {designation}
    </div>
  );
};
