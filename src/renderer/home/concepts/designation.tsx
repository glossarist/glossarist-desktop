import React from 'react';

import {
  Designation,
  Expression,
  Concept,
} from 'models/concepts';

import styles from './styles.scss';
import MathJax from 'react-mathjax2';


export const FullDesignation: React.FC<{ d: Designation }> = function ({ d }) {
  function partOfSpeechLabel(d: Expression): JSX.Element | null {
    if (d.partOfSpeech === 'noun') {
      return <><span>{d.gender}</span> <span>{d.grammaticalNumber}</span> noun</>
    } else if (d.partOfSpeech === 'adjective' && d.isParticiple) {
      return <>adj. participle</>
    } else if (d.partOfSpeech === 'adverb' && d.isParticiple) {
      return <>adv. participle</>
    } else {
      return <>{d.partOfSpeech}</>
    }
  }

  const normativeStatusClass = styles[`normativeStatus-${d.normativeStatus || 'undefined'}`];

  return <span className={`${styles.designation} ${normativeStatusClass}`}>
    <MathJax.Text text={d.designation} />

    <span className={styles.designationMarkers}>
      {d.type === 'expression' && d.partOfSpeech
        ? <span className={styles.grammar}>{partOfSpeechLabel(d)}</span>
        : null}
      {d.type === 'expression' && d.isAbbreviation
        ? <span className={styles.grammar} title="Acronym or abbreviation">abbr.</span>
        : null}
      {d.type === 'expression' && d.geographicalArea
        ? <span className={styles.usage} title="Geographical area of usage">{d.geographicalArea}</span>
        : null}
      {d.normativeStatus !== 'admitted' && d.normativeStatus !== undefined
        ? <strong className={`${styles.normativeStatus} ${normativeStatusClass}`} title="Normative status">{d.normativeStatus}</strong>
        : null}
    </span>
  </span>
};


export function getRepresentingDesignation(entry: Concept<any, any>): string {
  const repDesignation = entry.terms[0].designation;

  return `${repDesignation}${entry.domain ? ' <' + entry.domain + '>' : ''}`;
};


export const RepresentingDesignation: React.FC<{ entry: Concept<any, any> }> = function ({ entry }) {
  const repDesignation = entry.terms[0].designation;

  return <>
    <MathJax.Text text={repDesignation} />
    {" "}
    {entry.domain ? ' <' + entry.domain + '>' : ''}
  </>;
};
