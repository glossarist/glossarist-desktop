import React, { useEffect, useContext } from 'react';
import { NonIdealState } from '@blueprintjs/core';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { availableLanguages } from 'app';
import * as panels from '../panels';
import { ModuleConfig } from '../module-config';
import { EntryEdit } from '../concepts';
import { ConceptContext } from '../contexts';
import sharedStyles from '../styles.scss';


const MainView: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);
  const ctx = useContext(ConceptContext);
  const active = ctx.active;

  // Force switch to authoritative language
  useEffect(() => {
    if (lang.selected !== lang.default) {
      lang.select(lang.default);
    }
  }, [lang.selected]);

  const auth = active ? active[lang.default as keyof typeof availableLanguages] : undefined;

  if (active === null) {
    return <NonIdealState title="No concept is selected" />;
  } else if (auth === undefined) {
    return <NonIdealState icon="error" title="Concept is missing authoritative language entry" />;
  }

  return (
    <div className={sharedStyles.backdrop}>
      <EntryEdit
        concept={active}
        key={auth.id}
        entry={auth}
        isLoading={ctx.isLoading} />
    </div>
  );
};

export default {
  hotkey: 'e',
  title: "Edit",

  leftSidebar: [
    panels.system,
    panels.sourceRollTranslated,
    //panels.languages,
    panels.lineage,
    panels.databases,
  ],

  MainView,
  mainToolbar: [],

  rightSidebar: [
    panels.basics,
    panels.relationships,
  ],
} as ModuleConfig;