import { remote } from 'electron';
import React, { useContext } from 'react';
import {
  Button,
} from '@blueprintjs/core';
import { useIPCValue } from '@riboseinc/coulomb/ipc/renderer';
import { PanelContext } from 'coulomb-panel/panel';

import { UserRoleContext } from '../contexts';
import { PanelConfig } from '../panel-config';
import { ChangeRequestList } from '../change-requests/list';


type ChangeRequestLifecyclePhase = 'drafts' | 'submitted' | 'resolved';

type CRFilter = { lcPhase: ChangeRequestLifecyclePhase, onlyMine: boolean };

interface ChangeRequestsPanelContext {
  filter: { lcPhase: ChangeRequestLifecyclePhase, onlyMine: boolean }
}
const ChangeRequestsPanel: React.FC<{}> = function () {
  const settings: ChangeRequestsPanelContext = useContext(PanelContext).state;
  const committerEmail = useIPCValue<{}, { email: string }>
  ('db-default-get-current-committer-info', { email: '' }).value.email;
  const userIsManager = useContext(UserRoleContext).isManager === true;

  const filter = settings.filter || getDefaultCRFilter(userIsManager);
  const phase = filter?.lcPhase || 'drafts';
  const onlyMine = filter?.onlyMine !== false;

  return <ChangeRequestList
    submitted={phase !== 'drafts'}
    resolved={phase === 'resolved'}
    createdBy={onlyMine ? committerEmail : undefined} />;
};


const ChangeRequestFilter: React.FC<{}> = function () {
  const panelCtx = useContext(PanelContext);
  const userIsManager = useContext(UserRoleContext).isManager === true;

  function invokeFilterNenu() {
    const m = new remote.Menu();
    const filter = panelCtx.state.filter || getDefaultCRFilter(userIsManager);

    function selectLCPhase(phase: ChangeRequestLifecyclePhase) {
      panelCtx.setState((state: ChangeRequestsPanelContext) =>
        ({ ...state, filter: { ...(state.filter || {}), lcPhase: phase }}));
    }

    m.append(new remote.MenuItem({
      label: "Drafts",
      type: 'radio',
      checked: (filter.lcPhase || 'drafts') === 'drafts',
      click: () => selectLCPhase('drafts'),
    }));
    m.append(new remote.MenuItem({
      label: "Submitted",
      type: 'radio',
      checked: filter.lcPhase === 'submitted',
      click: () => selectLCPhase('submitted'),
    }));
    m.append(new remote.MenuItem({
      label: "Resolved",
      type: 'radio',
      checked: filter.lcPhase === 'resolved',
      click: () => selectLCPhase('resolved'),
    }));

    m.append(new remote.MenuItem({
      type: 'separator',
    }));

    m.append(new remote.MenuItem({
      label: "My only",
      type: 'checkbox',
      checked: filter.onlyMine !== false,
      click: () =>
        panelCtx.setState((state: ChangeRequestsPanelContext) =>
          ({ ...state, filter: { ...state.filter, onlyMine: filter.onlyMine !== false ? false : true } })),
    }));
    m.popup({ window: remote.getCurrentWindow() });
  }

  return <Button
    minimal
    icon="filter"
    onClick={(evt: React.MouseEvent) => { evt.stopPropagation(); invokeFilterNenu(); }}
    title="Filter change requests" />
}


export default {
  Contents: ChangeRequestsPanel,
  title: "Change requests",
  TitleComponentSecondary: ChangeRequestFilter,
} as PanelConfig;



function getDefaultCRFilter(userIsManager: boolean): CRFilter {
  if (userIsManager) {
    return { lcPhase: 'submitted', onlyMine: false };
  } else {
    return { lcPhase: 'drafts', onlyMine: true };
  }
}
