import React from 'react';

export interface PanelConfig {
  title?: string
  TitleComponent?: React.FC<{ isCollapsed?: boolean }>
  TitleComponentSecondary?: React.FC<{ isCollapsed?: boolean }>
  actions?: React.FC<{}>[]
  Contents: React.FC<{}>
  objectIndependent?: true
  className?: string
  props?: object
  collapsed?: 'never' | 'by-default'
  helpResourceID?: string
}