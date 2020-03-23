import React, { useEffect, useState } from 'react';
import { IconName } from '@blueprintjs/icons';
import styles from './styles.scss';
import { Icon } from '@blueprintjs/core';


interface PanelProps {
  title?: string
  TitleComponent?: React.FC<{}>
  className?: string
  iconCollapsed?: IconName
  iconExpanded?: IconName
  isCollapsible?: true
  isCollapsedByDefault?: true
  onToggle?: (state: boolean) => void
}
export const Panel: React.FC<PanelProps> = function ({
    className,
    title, TitleComponent,
    iconCollapsed, iconExpanded,
    isCollapsible, isCollapsedByDefault,
    onToggle,
    children }) {
  const [isCollapsed, setCollapsedState] =
    useState<boolean>(isCollapsedByDefault || false);

  useEffect(() => {
    onToggle ? onToggle(isCollapsed) : void 0;
  }, [isCollapsed]);

  function onCollapse() {
    onToggle ? onToggle(true) : void 0;
    setCollapsedState(true);
  }
  function onExpand() {
    onToggle ? onToggle(false) : void 0;
    setCollapsedState(false);
  }

  const toggleIcon: IconName = isCollapsed
    ? (iconCollapsed || 'caret-right')
    : (iconExpanded || 'caret-down');

  return (
    <div className={`
        ${className || ''}
        ${styles.panel}
        ${isCollapsible === true ? styles.panelCollapsible : ''}
        ${isCollapsible === true && isCollapsed === true
            ? styles.panelCollapsed
            : ''}`}>

      {title || TitleComponent || isCollapsible
        ? <div
              className={styles.panelTitleBar}
              onClick={(isCollapsible === true && isCollapsed === false)
                ? onCollapse
                : onExpand}>
            <Icon
              className={styles.panelTriggerIcon}
              icon={isCollapsible ? toggleIcon : 'blank'}
            />
            {TitleComponent ? <TitleComponent /> : title}
          </div>
        : null}

      {isCollapsible && isCollapsed
        ? null
        : <div className={styles.panelContents}>
            {children}
          </div>}

    </div>
  );
};
