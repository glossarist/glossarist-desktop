import React from 'react';
import { NonIdealState } from '@blueprintjs/core';
import * as panels from '../panels';
import { ModuleConfig } from '../module-config';


export default {
  hotkey: 'r',
  title: "Review",

  leftSidebar: [
    panels.languages,
    panels.lineage,
    panels.sourceRollTranslated,
    panels.databases,
  ],

  MainView: () => <NonIdealState title="Concept review is coming soon." />,
  mainToolbar: [],

  rightSidebar: [
    panels.system,
    panels.basics,
    panels.relationships,
  ],
} as ModuleConfig;