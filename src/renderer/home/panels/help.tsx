import React, { useContext, useRef, useEffect, useState } from 'react';
import { DocsContext } from '../contexts';
import { PanelConfig } from '../panel-config';
import sharedStyles from '../styles.scss';
import styles from './help.scss';
import { ButtonGroup, Button } from '@blueprintjs/core';
import { openHelpPage } from 'renderer/help';


const Panel: React.FC<{}> = function () {
  const ctx = useContext(DocsContext);
  const item = ctx.hoveredItem;
  const excerpt = item?.excerpt || '';

  function openBugReportPage() {
    require('electron').shell.openExternal(`https://github.com/glossarist/glossarist-desktop/issues/new?assignees=strogonoff&labels=&template=suspected-malfunction.md&title=%5BREPLACE_WITH_TITLE%5D`);
  }

  let help: JSX.Element;
  if (excerpt.trim() !== '') {
    help = (
      <p>
        {item?.excerpt}
        &emsp;
        {item?.readMoreURL
          ? <strong className={styles.readMore}>
              Press <kbd>F1</kbd> to read more
            </strong>
          : null}
      </p>
    );
  } else {
    help = (
      <>
        <ButtonGroup vertical fill>
          <Button onClick={() => openHelpPage('/docs')}>Open online documentation</Button>
          <Button onClick={openBugReportPage}>Report unexpected behavior</Button>
        </ButtonGroup>
      </>
    );
  }

  return (
    <div className={styles.helpContainer}>
      {help}
    </div>
  );
};


const Title: React.FC<{}> = function () {
  const item = useContext(DocsContext).hoveredItem;

  if (item !== null && item.title && item?.title.trim() !== '') {
    return <span style={{ whiteSpace: 'nowrap' }}>{item.title}</span>;
  } else {
    return <>Help</>;
  }
};


export default {
  Contents: Panel,
  title: "Help",
  className: sharedStyles.helpPanel,
  TitleComponent: Title,
} as PanelConfig;
