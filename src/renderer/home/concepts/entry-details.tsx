import React from 'react';
import { Classes, H2 } from '@blueprintjs/core';
import { Concept, Designation } from 'models/concepts';
import styles from './styles.scss';
import { FullDesignation } from './designation';


interface EntryDetailsProps {
  isLoading?: boolean
  entry: Concept<any, any>
  className?: string
}
export const EntryDetails: React.FC<EntryDetailsProps> = function ({ isLoading, entry, className }) {
  const loadingClass = isLoading ? Classes.SKELETON : undefined;

  const primaryDesignation = entry.terms[0];

  let synonyms: Designation[];
  if (entry.terms.length > 1) {
    synonyms = entry.terms.slice(1, entry.terms.length);
  } else {
    synonyms = [];
  }

  return (
    <div className={`${styles.entryDetails} ${entry.language_code === 'ara' ? Classes.RTL : ''} ${className || ''}`}>
      {entry.domain ? <span className={styles.legacyDomain}>&lt;{entry.domain}&gt;</span> : null}

      <H2 className={`${styles.primaryDesignation} ${loadingClass}`}>
        <FullDesignation d={primaryDesignation} />
      </H2>

      {synonyms.length > 0
        ? <div className={styles.synonyms}>
            {[...synonyms.entries()].map(([idx, s]) => <FullDesignation key={idx} d={s} />)}
          </div>
        : null}

      <div className={`${Classes.RUNNING_TEXT}`}>
        <p className={`${styles.definition} ${loadingClass}`}>
          {entry.usageInfo ? <span className={styles.usageInfo}>&lt;{entry.usageInfo}&gt;</span> : null}
          {entry?.definition}
        </p>

        {[...entry.examples.entries()].map(([idx, item]) =>
          <p className={`${styles.example} ${loadingClass}`} key={`example-${idx}`}>
            <span className={styles.label}>EXAMPLE:</span>
            {item}
          </p>
        )}

        {[...entry.notes.entries()].map(([idx, item]) =>
            <p className={`${styles.note} ${loadingClass}`} key={`note-${idx}`}>
            <span className={styles.label}>NOTE:</span>
              {item}
            </p>
          )}
      </div>
    </div>
  );
};
