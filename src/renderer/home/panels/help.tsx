import React, { useContext } from 'react';
import { DocsContext } from '../contexts';
import { PanelConfig } from '../panel-config';
import sharedStyles from '../styles.scss';
import styles from './help.scss';


const Panel: React.FC<{}> = function () {
  const ctx = useContext(DocsContext);
  const item = ctx.hoveredItem;

  return (
    <div className={styles.helpContainer}>
      <p>
        {item?.excerpt}
        &emsp;
        {item?.readMoreURL
          ? <span className={styles.readMore}><kbd>F1</kbd> to read more</span>
          : null}
      </p>
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
