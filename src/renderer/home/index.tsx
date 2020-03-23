import React, { useState, useEffect } from 'react';

import Mousetrap from 'mousetrap';
// Import needed to define Mousetrap.bindGlobal() as a side-effect:
import 'mousetrap/plugins/global-bind/mousetrap-global-bind';

import { H1, Button, ButtonGroup } from '@blueprintjs/core';

import { WindowComponentProps } from 'coulomb/config/renderer';

import {callIPC} from "coulomb/ipc/renderer";

import { ModuleContext } from './contexts';
import { ModuleConfig } from './module-config';
import { Panel } from './panel';
import styles from './styles.scss';
import { Module } from './module';


/* Module configuration */

import { default as review } from './modules/review';
import { default as edit } from './modules/revise';
import { default as browse } from './modules/browse';
import { default as view } from './modules/view';
import { default as map } from './modules/map';
import { default as translate } from './modules/translate';

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
    callIPC("open-predefined-window", {id: "settings"});
  };


  return (
    <div className={styles.homeWindowLayout}>
      <Panel
          isCollapsible
          className={styles.topPanel}
          iconCollapsed="caret-down"
          iconExpanded="caret-up">
          <div className={styles.headerAndSettings}>
            <H1 className={styles.appTitle}>Glossarist</H1>
            <Button
              icon="settings"
              title="Settings"
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
