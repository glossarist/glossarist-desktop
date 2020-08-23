import React, { useEffect, useContext } from 'react';
import { NonIdealState, Icon } from '@blueprintjs/core';
import { LangConfigContext } from '@riboseinc/coulomb/localizer/renderer/context';

import { availableLanguages } from 'app';
import * as panels from '../panels';
import { ModuleConfig } from '../module-config';
import { EntryEdit } from '../concepts';
import { ConceptContext, ChangeRequestContext } from '../contexts';
import sharedStyles from '../styles.scss';


const MainView: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);
  const ctx = useContext(ConceptContext);
  const cr = useContext(ChangeRequestContext);
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
  } else if (cr.selected === null) {
    return <NonIdealState
      icon="edit"
      title="Change request, please!"
      description="To make changes, select or create a draft CR." />;
  } else if (auth === undefined) {
    return <NonIdealState
      icon="error"
      title="Missing entry in auth. language"
      description="This is not something that should happen." />;
  } else if (ctx.revision === null || ctx.revisionID === null) {
    return <NonIdealState title="No revision is selected" />;
  }

  return (
    <div className={sharedStyles.backdrop}>
      <EntryEdit
        changeRequestID={cr.selected}
        key={auth.id}
        entry={auth._revisions.tree[auth._revisions.current].object}
        parentRevisionID={ctx.revisionID}
        latestRevisionID={auth._revisions.current}
        isLoading={ctx.isLoading} />
    </div>
  );
};

export default {
  hotkey: 'r',
  title: "Edit",

  leftSidebar: [
    panels.system,
    panels.sourceRollTranslated,
    //panels.languages,
    panels.help,
  ],

  MainView,
  mainToolbar: [],

  rightSidebar: [
    panels.draftChangeRequests,
    { className: sharedStyles.flexiblePanelSeparator,
      Contents: () => <span><Icon icon="chevron-down" />{" "}Lineage</span>,
      collapsed: 'never' },
    panels.lineage,
    panels.revision,
  ],
} as ModuleConfig;