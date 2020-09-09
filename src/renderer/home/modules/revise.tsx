import React, { useEffect, useContext } from 'react';
import { NonIdealState, Icon } from '@blueprintjs/core';
import { LangConfigContext } from '@riboseinc/coulomb/localizer/renderer/context';

import { availableLanguages } from 'app';
import { app } from 'renderer';
import * as panels from '../panels';
import { ModuleConfig } from '../module-config';
import { EntryEdit } from '../concepts';
import { ConceptContext, ChangeRequestContext } from '../contexts';
import sharedStyles from '../styles.scss';
import { ChangeRequest } from 'models/change-requests';


const MainView: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);
  const ctx = useContext(ConceptContext);
  const active = ctx.active;
  const crCtx = useContext(ChangeRequestContext);
  const cr = app.useOne<ChangeRequest, string>('changeRequests', crCtx.selected || null).object;

  // Force switch to authoritative language
  useEffect(() => {
    if (lang.selected !== lang.default) {
      lang.select(lang.default);
    }
  }, [lang.selected]);

  useEffect(() => {
    if (cr !== null && cr?.meta.registry.stage !== 'Draft') {
      crCtx.select(null);
    }
  }, [cr]);

  const auth = active ? active[lang.default as keyof typeof availableLanguages] : undefined;

  if (active === null) {
    return <NonIdealState title="No concept is selected" />;
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
        changeRequestID={crCtx.selected || undefined}
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
