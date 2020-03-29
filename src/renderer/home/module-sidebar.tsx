import React from 'react';
import { PanelConfig } from './panel-config';
import { Panel } from './panel';
import styles from './styles.scss';


const SPanel: React.FC<{ cfg: PanelConfig }> = function ({ cfg }) {
  return (
    <Panel
        className={`${cfg.className || ''}`}
        isCollapsible={cfg.collapsed !== 'never' ? true : undefined}
        TitleComponent={cfg.TitleComponent}
        TitleComponentSecondary={cfg.TitleComponentSecondary}
        title={cfg.title}>
      <cfg.Contents {...cfg.props || {}} />
    </Panel>
  );
};


interface SidebarProps {
  position: 'left' | 'right'
  panelSet: PanelConfig[]
}
export const Sidebar: React.FC<SidebarProps> = function({ position, panelSet }) {
  const [firstPanel, ...restOfPanels] = panelSet;

  let lastPanel: PanelConfig | null;
  if (panelSet.length > 1) {
    lastPanel = restOfPanels.splice(restOfPanels.length - 1, 1)[0];
  } else {
    lastPanel = null;
  }

  return (
    <Panel
        isCollapsible={true}
        iconExpanded={position === 'left' ? 'caret-left' : 'caret-right'}
        iconCollapsed={position === 'left' ? 'caret-right' : 'caret-left'}
        className={`
          ${styles.moduleSidebar}
          ${position === 'left' ? styles.moduleSidebarLeft : styles.moduleSidebarRight}`}>

      <div className={styles.fixedPanel}>
        <SPanel cfg={firstPanel} />
      </div>

      <div className={styles.restOfPanels}>
        {[...restOfPanels.entries()].map(([idx, cfg]) =>
          <SPanel key={idx} cfg={cfg} />
        )}
      </div>

      {lastPanel
        ? <div className={styles.fixedPanel}>
            <SPanel cfg={lastPanel} />
          </div>
        : null}

    </Panel>
  );
};
