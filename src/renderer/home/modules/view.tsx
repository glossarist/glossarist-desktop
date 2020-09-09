import React, { useContext } from 'react';

import { NonIdealState, Icon } from '@blueprintjs/core';

import { LangConfigContext } from '@riboseinc/coulomb/localizer/renderer/context';

import { PARENT_RELATIONSHIP } from 'models/concepts';
import { EntryDetails } from '../concepts';
import { ModuleConfig } from '../module-config';
import { ConceptContext } from '../contexts';
import * as panels from '../panels';
import sharedStyles from '../styles.scss';


const MainView: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);
  const ctx = useContext(ConceptContext);
  const concept = ctx.revision;
  const mlgtConcept = ctx.active;
  const isLoading = ctx.isLoading;

  const parents = (mlgtConcept?.relations || []).
    filter(r => r.type === PARENT_RELATIONSHIP).
    map(r => r.to);

  let conceptDetails: JSX.Element;

  if (concept === null) {
    conceptDetails = <NonIdealState
      title="Nothing to show"
      description={`Nothing is selected, or item not localized in ${lang.available[lang.selected]}.`} />
  } else if (concept === undefined) {
    conceptDetails = <NonIdealState title="No concept is selected" />
  } else {
    conceptDetails = <EntryDetails isLoading={isLoading} entry={concept} parentConceptIDs={parents} />;
  }
  return (
    <div className={sharedStyles.backdrop}>
      {conceptDetails}
    </div>
  );
};


// const CompareLanguage: ToolbarItem = function () {
//   const concept = useContext(ConceptContext);
//   return <LangSelector
//     untranslatedProps={{ disabled: true }}
//     value={concept.active || undefined}
//   />;
// };


export default {
  hotkey: 'd',
  title: "Card",

  leftSidebar: [
    panels.system,
    panels.sourceRollTranslated,
    panels.languages,
    panels.help,
  ],

  MainView,
  mainToolbar: [],

  rightSidebar: [
    panels.status,
    panels.relationships,
    { className: sharedStyles.flexiblePanelSeparator,
      Contents: () => <span><Icon icon="chevron-down" />{" "}Lineage</span>,
      collapsed: 'never' },
    panels.lineage,
    panels.revision,
  ],
} as ModuleConfig;
