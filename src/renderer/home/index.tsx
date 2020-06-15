import React, { useState, useEffect, useContext } from 'react';

import Mousetrap from 'mousetrap';
// Import needed to define Mousetrap.bindGlobal() as a side-effect:
import 'mousetrap/plugins/global-bind/mousetrap-global-bind';

import { H1, Button, ButtonGroup, NonIdealState } from '@blueprintjs/core';

import { WindowComponentProps } from 'coulomb/config/renderer';
import { useIPCValue } from 'coulomb/ipc/renderer';

import { callIPC } from 'coulomb/ipc/renderer';
import { Panel } from 'coulomb-panel/panel';

import { ModuleContext } from './contexts';
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
import { SingleDBStatusContext } from 'coulomb/db/renderer/single-db-status-context-provider';
import { DBSyncScreen } from 'coulomb/db/isogit-yaml/renderer/status';

const MODULE_CONFIG: { [id: string]: ModuleConfig } = {
  review,
  edit,
  browse,
  view,
  map,
  translate,
};

const MODULES: (keyof typeof MODULE_CONFIG)[] = [
  'browse',
  'view',
  'edit',
  'review',
  'translate',
  'map',
]


/* Main window */

const Window: React.FC<WindowComponentProps> = function () {
  const [activeModuleID, activateModule] = useState(MODULES[0]);
  const [moduleOptions, setModuleOptions] = useState<any>({});

  const db = useContext(SingleDBStatusContext);

  const branding = useIPCValue<{ objectID: string }, { object: { name: string, symbol?: string } | null }>
  ('db-default-read', { object: null }, { objectID: 'branding' }).value.object;

  const dataRepoPath = useIPCValue<{}, { localClonePath?: string }>
  ('db-default-describe', {}, { objectID: 'branding' }).value.localClonePath;

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

  const module = MODULE_CONFIG[activeModuleID];

  const openSettingsWindow = () => {
    callIPC('open-predefined-window', { id: 'settings' });
  };

  const [syncScreenRequested, requestSyncScreen] = useState(false);

  useEffect(() => {
    const showInitializationScreen = (
      db?.status === undefined ||
      db.status.needsPassword ||
      db.status.isPushing ||
      db.status.isPulling ||
      (db.status.lastSynchronized === null && db.status.hasLocalChanges === false));

    if (showInitializationScreen) {
      requestSyncScreen(true);
    }

  }, [JSON.stringify(db)]);

  if (db === null) {
    return <NonIdealState title="Preparing DB synchronization…" />;
  } else if (syncScreenRequested) {
    return <DBSyncScreen onDismiss={() => requestSyncScreen(false)} dbName="default" db={db} />;
  }

  return (
    <div className={styles.homeWindowLayout}>
      <Panel
          isCollapsible

          className={styles.topPanel}
          titleBarClassName={styles.panelTitleBar}
          contentsClassName={styles.panelContents}

          iconCollapsed="caret-down"
          iconExpanded="caret-up">

          <img
            className={styles.appSymbol}
            src={branding?.symbol !== undefined && dataRepoPath 
              ? `file://${dataRepoPath}/${branding.symbol}`
              : `file://${__static}/glossarist-symbol.svg`} />

          <div className={styles.headerAndSettings}>
            <H1 className={styles.appTitle}>{branding?.name || "Glossarist"}</H1>
            <Button
              icon="settings"
              title="Open settings"
              onClick={openSettingsWindow}
              className={styles.settingsButton}
              minimal={true}
            />
          </div>

        <ButtonGroup large className={styles.moduleSelector}>
          {MODULES.map(moduleID =>
            <Button
                disabled={MODULE_CONFIG[moduleID].disabled === true}
                active={moduleID === activeModuleID}
                key={moduleID}
                onClick={() => activateModule(moduleID)}>
              {MODULE_CONFIG[moduleID].title}
            </Button>
          )}
        </ButtonGroup>
      </Panel>

      <ModuleContext.Provider value={{ opts: moduleOptions, setOpts: setModuleOptions }}>
        <Module
          leftSidebar={module.leftSidebar}
          rightSidebar={module.rightSidebar}
          MainView={module.MainView}
          mainToolbar={module.mainToolbar} />
      </ModuleContext.Provider>
    </div>
  );
};

export default Window;
