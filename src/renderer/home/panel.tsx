import React, { useState } from 'react';
import { IconName } from '@blueprintjs/icons';
import styles from './panel.scss';
import { Icon } from '@blueprintjs/core';


export const PanelContext =
  React.createContext<{ state: any, setState: (opts: any) => void }>
  ({ state: {}, setState: () => {} });


interface PanelProps {
  title?: string
  TitleComponent?: React.FC<{ isCollapsed?: boolean }>
  TitleComponentSecondary?: React.FC<{ isCollapsed?: boolean }>

  isCollapsible?: true
  isCollapsedByDefault?: true

  className?: string
  collapsedClassName?: string
  titleBarClassName?: string
  titleClassName?: string
  titleSecondaryClassName?: string
  contentsClassName?: string

  iconCollapsed?: IconName
  iconExpanded?: IconName
}
export const Panel: React.FC<PanelProps> = function ({
    className, collapsedClassName,
    titleBarClassName, titleClassName, titleSecondaryClassName,
    contentsClassName,

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
            ? `${styles.panelCollapsed} ${collapsedClassName}`
            : ''}`}>

      <PanelContext.Provider value={{
          state: panelState,
          setState: setPanelState,
        }}>

        {title || TitleComponent || isCollapsible
          ? <div
                className={`${styles.panelTitleBar} ${titleBarClassName}`}
                onClick={(isCollapsible === true && isCollapsed === false)
                  ? onCollapse
                  : onExpand}>

              <Icon
                className={styles.panelTriggerIcon}
                icon={isCollapsible ? toggleIcon : 'blank'}
              />

              {title || TitleComponent
                ? <>
                    <span className={`${styles.title} ${titleClassName}`}>
                      {TitleComponent
                        ? <TitleComponent isCollapsed={isCollapsed} />
                        : title}
                    </span>
                    <span className={`${styles.titleSecondary} ${titleSecondaryClassName}`}>
                      {TitleComponentSecondary
                        ? <TitleComponentSecondary isCollapsed={isCollapsed} />
                        : null}
                    </span>
                  </>
                : null}
            </div>
          : null}

        {isCollapsible && isCollapsed
          ? null
          : <div className={`${styles.panelContents} ${contentsClassName}`}>
              {children}
            </div>}

      </PanelContext.Provider>
    </div>
  );
};
