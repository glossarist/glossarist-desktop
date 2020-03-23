import React from 'react';

export interface PanelConfig {
  title: string
  Title?: React.FC<{}>
  actions?: React.FC<{}>[]
  Contents: React.FC<{}>
  objectIndependent?: true
  className?: string
  props?: object
  collapsed?: 'never' | 'by-default'
}