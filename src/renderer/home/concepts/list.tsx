import { debounce } from 'throttle-debounce';
import React, { useRef, useContext, useState, useEffect } from 'react';
import { IButtonProps, Button } from '@blueprintjs/core';
import { FixedSizeList as List } from 'react-window';

import { availableLanguages } from '../../../app';
import { MultiLanguageConcept, ConceptRef } from 'models/concepts';
import { ConceptContext } from '../contexts';
import { ConceptItem } from './item';

import styles from './styles.scss';


interface ConceptListProps {
  concepts: MultiLanguageConcept<any>[]
  itemMarker?: (c: MultiLanguageConcept<any>) => JSX.Element
  itemMarkerRight?: (c: MultiLanguageConcept<any>) => JSX.Element

  buttonProps?: IButtonProps
  paddings?: number
  itemHeight?: number

  lang: keyof typeof availableLanguages
  className?: string
}
export const ConceptList: React.FC<ConceptListProps> =
function ({
    lang,
    concepts,
    className,
    itemMarker,
    itemMarkerRight,
    buttonProps,
    paddings,
    itemHeight
  }) {

  const CONTAINER_PADDINGS = paddings || 0;
  const ITEM_HEIGHT = itemHeight || 30;
  const isRTL = lang === 'ara';

  const listContainer = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState<number>(CONTAINER_PADDINGS);

  const conceptCtx = useContext(ConceptContext);
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
        concepts.findIndex(c => c.termid === ref),
        'smart');
    }
  }

  function handleClick(termid: number, evt: React.MouseEvent) {
    conceptCtx.select(termid);

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
    const c = concepts[index];
    const isHighlighted = conceptCtx.highlightedRefs.indexOf(c.termid) >= 0;
    return (
      <Button
          fill minimal
          style={style}
          alignText="left"
          className={`
            ${styles.lazyConceptListItem}
            ${conceptCtx.ref === c.termid ? styles.lazyConceptListItemSelected : ''}
          `}
          active={isHighlighted}
          {...buttonProps}
          onClick={(evt: React.MouseEvent) => handleClick(c.termid, evt)}>

        {itemMarker
          ? <span className={styles.itemMarker}>{itemMarker(c)}</span>
          : null}

        <ConceptItem
          lang={lang as keyof typeof availableLanguages}
          concept={c} />

        {itemMarkerRight
          ? <span className={styles.itemMarkerRight}>{itemMarkerRight(c)}</span>
          : null}

      </Button>
    );
  };

  return (
    <div ref={listContainer} className={className}>
      <List
          ref={listEl}
          className={styles.lazyConceptList}
          direction={isRTL ? "rtl" : undefined}
          itemCount={concepts.length}
          width="100%"
          height={listHeight - CONTAINER_PADDINGS}
          itemSize={ITEM_HEIGHT}>
        {Row}
      </List>
    </div>
  );
};
