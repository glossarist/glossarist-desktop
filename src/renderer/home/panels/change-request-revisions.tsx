import React, { useContext } from 'react';

import { useIPCValue } from 'coulomb/ipc/renderer';

import { Revision } from 'models/revisions';
import { Concept } from 'models/concepts';
import { PanelConfig } from '../panel-config';
import { ChangeRequestContext } from '../contexts';
import { refToString } from '../concepts';
import { LocalizedEntryList } from '../concepts/localized-entry-list';

import sharedStyles from '../styles.scss';


const ChangeRequestRevisions: React.FC<{}> = function () {
  const crID = useContext(ChangeRequestContext).selected;

  const suggestedRevisions = useIPCValue
  <{ changeRequestID: string | null }, { [objectType: string]: { [objectID: string]: Revision<Concept<any, any>> } }>
  ('model-changeRequests-list-revisions', { concepts: {} }, { changeRequestID: crID });

  console.debug(crID, suggestedRevisions.value.concepts)

  return (
    <LocalizedEntryList
      itemHeight={24}
      buttonProps={{ small: true }}
      entries={Object.values((suggestedRevisions.value.concepts || {})).map(r => r.object)}
      itemMarker={(e: Concept<any, any>) =>
        <span className={sharedStyles.conceptID}>{e.language_code}/{refToString(e.id)}</span>}
    />
  );
};


export default {
  Contents: ChangeRequestRevisions,
  className: sharedStyles.sourceRollPanel,
  title: "Proposed revisions",
} as PanelConfig;
