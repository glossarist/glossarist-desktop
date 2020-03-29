import React, { useEffect, useState } from 'react';
import { IconName } from '@blueprintjs/icons';
import styles from './styles.scss';
import { Icon } from '@blueprintjs/core';


export const PanelContext =
  React.createContext<{ state: any, setState: (opts: any) => void }>
  ({ state: {}, setState: () => {} });


interface PanelProps {
  title?: string
  TitleComponent?: React.FC<{ isCollapsed?: boolean }>
  TitleComponentSecondary?: React.FC<{ isCollapsed?: boolean }>
  className?: string
  iconCollapsed?: IconName
  iconExpanded?: IconName
  isCollapsible?: true
  isCollapsedByDefault?: true
}
export const Panel: React.FC<PanelProps> = function ({
    className,
    title, TitleComponent, TitleComponentSecondary,
    iconCollapsed, iconExpanded,
    isCollapsible, isCollapsedByDefault,
    children }) {
  const [isCollapsed, setCollapsedState] =
    useState<boolean>(isCollapsedByDefault || false);

  const [panelState, setPanelState] = useState<object>({});

  function onCollapse() {
    setCollapsedState(true);
  }
  function onExpand() {
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
      <PanelContext.Provider value={{ state: panelState, setState: setPanelState }}>

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
              <span className={styles.title}>
                {TitleComponent
                  ? <TitleComponent isCollapsed={isCollapsed} />
                  : title}
              </span>
              <span className={styles.titleSecondary}>
                {TitleComponentSecondary
                  ? <TitleComponentSecondary isCollapsed={isCollapsed} />
                  : null}
              </span>
            </div>
          : null}

        {isCollapsible && isCollapsed
          ? null
          : <div className={styles.panelContents}>
              {children}
            </div>}

      </PanelContext.Provider>
    </div>
  );
};
