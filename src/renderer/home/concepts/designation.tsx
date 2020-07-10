import React from 'react';

import {
  Designation,
  Expression,
  Concept,
} from 'models/concepts';

import styles from './styles.scss';
import MathJax from 'react-mathjax2';
import { useHelp } from 'renderer/help';


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

  const normativeStatusClass = styles[`normativeStatus-${d.normative_status || 'undefined'}`];

  return <span className={`${styles.designation} ${normativeStatusClass}`}>
    <MathJax.Text text={d.designation} />

    <span className={styles.designationMarkers}>
      {d.type === 'expression' && d.partOfSpeech
        ? <span dir="ltr" className={styles.grammar}>{partOfSpeechLabel(d)}</span>
        : null}
      {d.type === 'expression' && d.isAbbreviation
        ? <span dir="ltr" className={styles.grammar} title="Acronym or abbreviation">abbr.</span>
        : null}
      {d.type === 'expression' && d.geographicalArea
        ? <span dir="ltr" className={styles.usage} title="Geographical area of usage">{d.geographicalArea}</span>
        : null}
      {d.normative_status !== 'admitted' && (d.normative_status?.trim() || '') !== ''
        ? <strong dir="ltr" className={`${styles.normativeStatus} ${styles.label} ${normativeStatusClass}`} title="Normative status">{d.normative_status}</strong>
        : null}
    </span>
  </span>
};


export function getRepresentingDesignation(entry: Concept<any, any>): string {
  const repDesignation = entry.terms[0].designation;

  return `${repDesignation}${entry.domain ? ' <' + entry.domain + '>' : ''}`;
};


export const RepresentingDesignation: React.FC<{ entry: Concept<any, any> }> = function ({ entry }) {
  const representingTerm: Designation =
    entry.terms.filter(d => d.normative_status === 'preferred')[0] ||
    entry.terms.filter(d => d.normative_status === 'admitted')[0] ||
    entry.terms[0];

  const repDesignation = representingTerm?.designation;
  const ref = useHelp('widgets/representing-designation');

  return <div ref={ref as (el: HTMLDivElement) => void}>
    <MathJax.Text text={repDesignation} />
    {" "}
    {entry.domain ? ' <' + entry.domain + '>' : ''}
  </div>;
};
