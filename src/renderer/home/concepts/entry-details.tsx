import React from 'react';
import MathJax from 'react-mathjax2';
import { Classes, H2 } from '@blueprintjs/core';
import { Concept, Designation } from 'models/concepts';
import { isRTL } from 'app';
import { useHelp } from 'renderer/help';
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

  const rtl = isRTL(entry.language_code);

  let synonyms: Designation[];
  if (entry.terms.length > 1) {
    synonyms = entry.terms.slice(1, entry.terms.length);
  } else {
    synonyms = [];
  }

  function openAuthSource(link: string) {
    require('electron').shell.openExternal(link);
  }

  const primaryDesignationHelpRef = useHelp('widgets/representing-designation');

  return (
    <div
        dir={rtl ? 'rtl' : 'ltr'}
        className={`${styles.entryDetails} ${rtl ? Classes.RTL : ''} ${className || ''}`}>
      {entry.domain ? <span className={styles.legacyDomain}>&lt;{entry.domain}&gt;</span> : null}

      <H2
          className={`${styles.primaryDesignation} ${loadingClass}`}
          elementRef={(el) => primaryDesignationHelpRef(el as HTMLElement)}>
        <FullDesignation d={primaryDesignation} />
      </H2>

      {synonyms.length > 0
        ? <div className={styles.synonyms}>
            {[...synonyms.entries()].map(([idx, s]) => <FullDesignation key={idx} d={s} />)}
          </div>
        : null}

      <div className={`${Classes.RUNNING_TEXT}`}>
        <div className={`${styles.definition} ${loadingClass}`}>
          {entry.usageInfo ? <span className={styles.usageInfo}>&lt;{entry.usageInfo}&gt;</span> : null}
          <MathJax.Text text={entry.definition} />
        </div>

        {[...entry.examples.entries()].map(([idx, item]) =>
          <div className={`${styles.example} ${loadingClass}`} key={`example-${idx}`}>
            <div dir="ltr" className={styles.label}>EXAMPLE:</div>
            <MathJax.Text text={item} />
          </div>
        )}

        {[...entry.notes.entries()].map(([idx, item]) =>
            <div className={`${styles.note} ${loadingClass}`} key={`note-${idx}`}>
              <div dir="ltr" className={styles.label}>Note {idx + 1} to entry:</div>
              <MathJax.Text text={item} />
            </div>
          )}
      </div>

      <footer>
        <dl dir="ltr" className={styles.label}>
          <dt>Entry status</dt>
          <dd>{entry.entry_status || 'unknown'}</dd>
          <dt>Authoritative source</dt>
          <dd>
            {`${entry.authoritative_source.link || ''}`.trim() !== ''
              ? <a onClick={() => openAuthSource(`${entry.authoritative_source.link}`)}>
                  {entry.authoritative_source.ref || entry.authoritative_source.link} {entry.authoritative_source.clause}
                </a>
              : <>{entry.authoritative_source.ref} {entry.authoritative_source.clause}</>}
          </dd>
        </dl>
      </footer>
    </div>
  );
};
