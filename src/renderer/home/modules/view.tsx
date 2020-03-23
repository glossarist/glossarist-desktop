import React, { useContext } from 'react';

import { NonIdealState } from '@blueprintjs/core';

import { LangSelector } from 'coulomb/localizer/renderer/widgets';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';

import { EntryDetails } from '../concepts';
import { ToolbarItem, ModuleConfig } from '../module-config';
import { ConceptContext } from '../contexts';
import * as panels from '../panels';
import sharedStyles from '../styles.scss';


const MainView: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);
  const ctx = useContext(ConceptContext);
  const concept = ctx.activeLocalized;
  const isLoading = ctx.isLoading;

  let conceptDetails: JSX.Element;

  if (concept === null) {
    conceptDetails = <NonIdealState title={`Not yet translated into ${lang.available[lang.selected]}.`} />
  } else if (concept === undefined) {
    conceptDetails = <NonIdealState title="No concept is selected" />
  } else {
    conceptDetails = <EntryDetails isLoading={isLoading} entry={concept} />;
  }
  return (
    <div className={sharedStyles.backdrop}>
      {conceptDetails}
    </div>
  );
};


const CompareLanguage: ToolbarItem = function () {
  const concept = useContext(ConceptContext);
  return <LangSelector
    untranslatedProps={{ disabled: true }}
    value={concept.active || undefined}
  />;
};


export default {
  hotkey: 'v',
  title: "View",

  leftSidebar: [
    panels.system,
    panels.sourceRollTranslated,
    panels.databases,
  ],

  MainView,
  mainToolbar: [CompareLanguage],

  rightSidebar: [
    panels.status,
    panels.relationships,
    panels.lineage,
  ],
} as ModuleConfig;