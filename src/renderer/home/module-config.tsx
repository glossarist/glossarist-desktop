import React from 'react';
import { PanelConfig } from './panel-config';


export type ToolbarItem = React.FC<{}>;


export interface ModuleConfig {
  hotkey: string
  title: string
  leftSidebar: PanelConfig[]
  rightSidebar: PanelConfig[]
  MainView: React.FC<any>
  mainToolbar: ToolbarItem[]
  disabled?: true
}