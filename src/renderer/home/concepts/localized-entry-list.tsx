import { debounce } from 'throttle-debounce';
import React, { useRef, useContext, useState, useEffect } from 'react';
import { IButtonProps, Button } from '@blueprintjs/core';
import { FixedSizeList as List } from 'react-window';

import { ConceptRef, Concept } from 'models/concepts';
import { ConceptContext, ChangeRequestContext } from '../contexts';

import styles from './styles.scss';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { LocalizedEntry } from './item';


interface LocalizedEntryListProps {
  entries: Concept<any, any>[]
  itemMarker?: (c: Concept<any, any>) => JSX.Element
  itemMarkerRight?: (c: Concept<any, any>) => JSX.Element

  buttonProps?: IButtonProps
  paddings?: number
  itemHeight?: number

  className?: string
}
export const LocalizedEntryList: React.FC<LocalizedEntryListProps> =
function ({
    entries,
    className,
    itemMarker,
    itemMarkerRight,
    buttonProps,
    paddings,
    itemHeight,
  }) {

  const CONTAINER_PADDINGS = paddings || 0;
  const ITEM_HEIGHT = itemHeight || 30;
  const lang = useContext(LangConfigContext);

  const listContainer = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState<number>(CONTAINER_PADDINGS);

  const conceptCtx = useContext(ConceptContext);
  const crCtx = useContext(ChangeRequestContext);
  const listEl = useRef<List>(null);

  useEffect(() => {
    const updateListHeight = debounce(100, () => {
      setListHeight(listContainer.current?.parentElement?.offsetHeight || CONTAINER_PADDINGS);

      setImmediate(() => {
        if (conceptCtx.ref) {
          scrollTo(conceptCtx.ref)
        }
      });
    });

    window.addEventListener('resize', updateListHeight);

    updateListHeight();

    return function cleanup() {
      window.removeEventListener('resize', updateListHeight);
    }
  }, [listContainer.current]);

  useEffect(() => {
    if (conceptCtx.ref) {
      scrollTo(conceptCtx.ref);
    }
  }, [conceptCtx.ref]);

  function scrollTo(ref: ConceptRef) {
    if (listEl && listEl.current) {
      listEl.current.scrollToItem(
        entries.findIndex(c => c.id === ref),
        'smart');
    }
  }

  function handleClick(termid: number, langID: string, evt: React.MouseEvent) {
    conceptCtx.select(termid);
    crCtx.selectItem(`${termid}-${langID}`);
    lang.select(langID);

    if (evt.altKey) {
      if (conceptCtx.highlightedRefs.indexOf(termid) < 0) {
        conceptCtx.highlightRef(termid);
      } else {
        conceptCtx.unhighlightRef(termid);
      }
    } else {
      conceptCtx.highlightOne(termid);
    }
  }

  const Row = ({ index, style }: { index: number, style: object }) => {
    const e = entries[index];
    const isHighlighted = conceptCtx.highlightedRefs.indexOf(e.id) >= 0;

    return (
      <Button
          fill minimal
          style={style}
          alignText="left"
          className={`
            ${styles.lazyConceptListItem}
            ${conceptCtx.ref === e.id ? styles.lazyConceptListItemSelected : ''}
          `}
          active={isHighlighted}
          {...buttonProps}
          onClick={(evt: React.MouseEvent) => handleClick(e.id, e.language_code, evt)}>

        {itemMarker
          ? <span className={styles.itemMarker}>{itemMarker(e)}</span>
          : null}

        <LocalizedEntry entry={e} />

        {itemMarkerRight
          ? <span className={styles.itemMarkerRight}>{itemMarkerRight(e)}</span>
          : null}

      </Button>
    );
  };

  return (
    <div ref={listContainer} className={className}>
      <List
          ref={listEl}
          className={styles.lazyConceptList}
          itemCount={entries.length}
          width="100%"
          height={listHeight - CONTAINER_PADDINGS}
          itemSize={ITEM_HEIGHT}>
        {Row}
      </List>
    </div>
  );
};
