import React, { useState, useEffect, useContext } from 'react';

import Mousetrap from 'mousetrap';
// Import needed to define Mousetrap.bindGlobal() as a side-effect:
import 'mousetrap/plugins/global-bind/mousetrap-global-bind';

import { H1, Button, ButtonGroup, NonIdealState } from '@blueprintjs/core';

import { WindowComponentProps } from 'coulomb/config/renderer';
import { useIPCValue } from 'coulomb/ipc/renderer';

import { callIPC } from 'coulomb/ipc/renderer';
import { Panel } from 'coulomb-panel/panel';
import { SingleDBStatusContext } from 'coulomb/db/renderer/single-db-status-context-provider';
import { DBSyncScreen } from 'coulomb/db/isogit-yaml/renderer/status';

import { useHelp } from 'renderer/help';

import { ModuleContext, DocsContext, HoveredItem } from './contexts';
import { ModuleConfig } from './module-config';
import styles from './styles.scss';
import { Module } from './module';


/* Module configuration */

import { default as review } from './modules/review';
import { default as edit } from './modules/revise';
import { default as browse } from './modules/browse';
import { default as view } from './modules/view';
import { default as map } from './modules/map';
import { default as translate } from './modules/translate';
import { default as create } from './modules/create';

const MODULE_CONFIG: { [id: string]: ModuleConfig } = {
  review,
  edit,
  browse,
  view,
  map,
  translate,
  create,
};

const MODULES: (keyof typeof MODULE_CONFIG)[] = [
  'browse',
  'view',
  'edit',
  'review',
  'translate',
  'map',
];

const MODULE_GROUPS: (keyof typeof MODULE_CONFIG)[][] = [
  ['browse', 'view', 'map'],
  ['create', 'edit', 'translate'],
  ['review'],
];


/* Main window */

const Window: React.FC<WindowComponentProps> = function () {
  const [activeModuleID, activateModule] = useState(MODULES[0]);
  const [moduleOptions, setModuleOptions] = useState<any>({});

  const db = useContext(SingleDBStatusContext);

  const [hoveredItem, setHoveredItem] = useState<HoveredItem | null>(null);

  useEffect(() => {
    for (const moduleID of MODULES) {
      Mousetrap.bind(MODULE_CONFIG[moduleID].hotkey, () => activateModule(moduleID))
    }
    return function cleanup() {
      for (const hotkey of MODULES.map(moduleID => MODULE_CONFIG[moduleID].hotkey)) {
        Mousetrap.unbind(hotkey);
      }
    };
  }, []);

  useEffect(() => {
    setModuleOptions({});
  }, [activeModuleID]);

  const [syncScreenRequested, requestSyncScreen] = useState(false);

  useEffect(() => {
    const showInitializationScreen = (
      db?.status === undefined ||
      db.status.needsPassword ||
      db.status.isPushing ||
      db.status.isPulling ||
      db.status.isOnline !== true ||
      db.status.lastSynchronized === null);

    if (showInitializationScreen) {
      requestSyncScreen(true);
    }

  }, [JSON.stringify(db)]);

  const module = MODULE_CONFIG[activeModuleID];

  if (db === null) {
    return <NonIdealState title="Preparing DB synchronization…" />;
  } else if (syncScreenRequested) {
    return <DBSyncScreen onDismiss={() => requestSyncScreen(false)} dbName="default" db={db} />;
  }

  return (
    <div className={styles.homeWindowLayout}>
    <DocsContext.Provider value={{ hoveredItem, setHoveredItem }}>

      <TopPanel activeModuleID={activeModuleID} activateModule={activateModule} />

      <ModuleContext.Provider value={{ opts: moduleOptions, setOpts: setModuleOptions }}>
        <Module
          leftSidebar={module.leftSidebar}
          rightSidebar={module.rightSidebar}
          MainView={module.MainView}
          mainToolbar={module.mainToolbar} />
      </ModuleContext.Provider>
    </DocsContext.Provider>

    </div>
  );
};


const TopPanel: React.FC<{
  activeModuleID: keyof typeof MODULE_CONFIG
  activateModule: (mod: keyof typeof MODULE_CONFIG) => void
}> =
function ({ activeModuleID, activateModule }) {

  const dataRepoPath = useIPCValue<{}, { localClonePath?: string }>
  ('db-default-describe', {}, {}).value.localClonePath;

  const register = useIPCValue<{ objectID: 'register' }, { object: { name: string, description: string } | null }>
  ('db-default-read', { object: null }, { objectID: 'register' }).value.object;

  const branding = useIPCValue<{ objectID: 'branding' }, { object: { name: string, symbol?: string } | null }>
  ('db-default-read', { object: null }, { objectID: 'branding' }).value.object;

  const topPanelRef = useHelp('panels/top-panel');
  const syncButtonRef = useHelp('widgets/sync-button');
  const settingsButtonRef = useHelp('widgets/settings-button');

  const openSettingsWindow = () => {
    callIPC('open-predefined-window', { id: 'settings' });
  };

  const requestSync = async () => {
    await callIPC('db-default-git-request-push');
    await callIPC('db-default-git-trigger-sync');
  };

  return (
    <Panel
        isCollapsible

        className={styles.topPanel}
        titleBarClassName={styles.panelTitleBar}
        contentsClassName={styles.panelContents}
        ref={topPanelRef as (item: HTMLDivElement) => void}

        iconCollapsed="caret-down"
        iconExpanded="caret-up">

        <img
          className={styles.appSymbol}
          src={branding?.symbol !== undefined && dataRepoPath
            ? `file://${dataRepoPath}/${branding.symbol}`
            : `file://${__static}/glossarist-symbol.svg`} />

        <div className={styles.headerAndSettings}>
          <H1
              className={styles.appTitle}
              title={`${register?.name}\n${register?.description}`}>
            {branding?.name || register?.name || "Glossarist"}</H1>
          <Button
            icon="refresh"
            elementRef={syncButtonRef}
            title="Synchronize (push and fetch changes)"
            onClick={requestSync}
            intent="success"
            large
            outlined
            className={styles.settingsButton}
          />
          <Button
            icon="settings"
            elementRef={settingsButtonRef}
            title="Open settings"
            onClick={openSettingsWindow}
            className={styles.settingsButton}
            minimal
          />
        </div>

        {MODULE_GROUPS.map(group =>
          <ButtonGroup large className={styles.moduleSelector}>
            {group.map(moduleID =>
              <ModuleButton
                isSelected={moduleID === activeModuleID}
                moduleID={moduleID}
                key={moduleID}
                onSelect={() => activateModule(moduleID)}
              />
            )}
          </ButtonGroup>
        )}
      </Panel>
  );
};


const ModuleButton: React.FC<{
  isSelected: boolean
  moduleID: keyof typeof MODULE_CONFIG
  onSelect: () => void
}> =
function ({ isSelected, moduleID, onSelect }) {
  const ref = useHelp(`modules/${moduleID}`);

  return (
    <Button
        elementRef={ref}
        disabled={MODULE_CONFIG[moduleID].disabled === true}
        active={isSelected}
        onClick={onSelect}>
      {MODULE_CONFIG[moduleID].title}
    </Button>
  );
};


export default Window;
