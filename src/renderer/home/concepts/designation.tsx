import React from 'react';

import {
  Designation,
  Expression,
  Concept,
} from 'models/concepts';

import styles from './styles.scss';


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

  return <span className={styles.designation}>
    {d.designation}

    <span className={styles.designationMarkers}>
      {d.type === 'expression' && d.geographicalArea
        ? <strong title="Geographical area of usage">{d.geographicalArea}</strong>
        : null}
      {d.type === 'expression' && d.partOfSpeech
        ? <span className={styles.partOfSpeech}>{partOfSpeechLabel(d)}</span>
        : null}
      {d.type === 'expression' && d.isAbbreviation
        ? <span title="Acronym or abbreviation">abbr.</span>
        : null}
      {d.normativeStatus !== 'admitted'
        ? <strong title="Normative status">{d.normativeStatus}</strong>
        : null}
    </span>
  </span>
};


export function getRepresentingDesignation(entry: Concept<any, any>): string {
  const repDesignation = entry.terms[0].designation;

  return `${repDesignation}${entry.domain ? ' <' + entry.domain + '>' : ''}`;
};
