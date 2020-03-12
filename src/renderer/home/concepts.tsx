import { debounce } from 'throttle-debounce';
import React, { useState, useRef, useContext, useEffect } from 'react';

import {
  H2, ButtonGroup, Button,
  FormGroup, InputGroup,
  Classes,
  Tooltip,
  Intent,
  IconName,
  IButtonProps,
} from '@blueprintjs/core';

import { FixedSizeList as List } from 'react-window';

import { callIPC } from 'coulomb/ipc/renderer';

import { app } from '../index';

import {
  Concept,
  MultiLanguageConcept,
  ConceptRef,
} from '../../models/concepts';

import { availableLanguages } from '../../app';
import { ConceptContext } from './contexts';
import { AutoSizedTextArea } from './widgets';

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

  isItemSelected: (ref: ConceptRef) => boolean
  onItemSelect: (ref: ConceptRef) => void
}
export const ConceptList: React.FC<ConceptListProps> =
function ({
    lang,
    concepts,
    className,
    itemMarker,
    itemMarkerRight,
    buttonProps,
    onItemSelect,
    paddings,
    itemHeight,
    isItemSelected }) {

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

  const Row = ({ index, style }: { index: number, style: object }) => {
    const c = concepts[index];
    return (
      <Button
          fill minimal
          style={style}
          alignText="left"
          className={styles.lazyConceptListItem}
          active={isItemSelected(c.termid)}
          {...buttonProps}
          onClick={() => onItemSelect(c.termid)}>

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


interface ConceptItemProps {
  concept: MultiLanguageConcept<any>
  lang: keyof typeof availableLanguages
  className?: string 
}
export const ConceptItem: React.FC<ConceptItemProps> =
function ({ lang, concept, className }) {

  const c = concept[lang as keyof typeof availableLanguages] || concept.eng;

  const designation = c.term;
  const isValid = c ? ['retired', 'superseded'].indexOf(c.entry_status) < 0 : undefined;
  const designationValidityClass = isValid === false ? styles.invalidDesignation : '';

  return (
    <span
        className={`
          ${styles.conceptItem} ${className || ''}
          ${designationValidityClass}
        `}>
      {designation}
    </span>
  );
};


interface LazyConceptItemProps {
  conceptRef: ConceptRef
  lang: keyof typeof availableLanguages
  className?: string
}
export const LazyConceptItem: React.FC<LazyConceptItemProps> = function ({ conceptRef, lang, className }) {
  /* Fetches concept data from backend, defers display to ConceptItem.
     NOTE: Should not be used in large lists, too slow.
     For large lists, fetch all concepts in one request and use LazyConceptList.
  */
  const concept = app.useOne<MultiLanguageConcept<any>, ConceptRef>('concepts', conceptRef);

  if (concept.object) {
    return <ConceptItem
      concept={concept.object}
      lang={lang}
      className={className}
    />;
  } else {
    return <span className={`${Classes.SKELETON} ${styles.conceptItem} ${className || ''}`}>
      Loading…
    </span>
  }
};


// Viewing terminological entries

interface EntryDetailsProps {
  isLoading?: boolean
  entry: Concept<any, any>
  className?: string
}
export const EntryDetails: React.FC<EntryDetailsProps> = function ({ isLoading, entry, className }) {
  const loadingClass = isLoading ? Classes.SKELETON : undefined;

  return (
    <div className={`${styles.entryDetails} ${entry.language_code === 'ara' ? Classes.RTL : ''} ${className || ''}`}>
      <H2 className={`${styles.designation} ${loadingClass}`}>{entry?.term}</H2>

      <div className={`${Classes.RUNNING_TEXT} ${styles.basics}`}>
        <p className={`${styles.definition} ${loadingClass}`}>{entry?.definition}</p>

        {[...entry.examples.entries()].map(([idx, item]) =>
          <p className={`${styles.example} ${loadingClass}`} key={`example-${idx}`}>
            <span className={styles.label}>EXAMPLE:</span>
            {item}
          </p>
        )}

        {[...entry.notes.entries()].map(([idx, item]) =>
            <p className={`${styles.note} ${loadingClass}`} key={`note-${idx}`}>
            <span className={styles.label}>NOTE:</span>
              {item}
            </p>
          )}
      </div>
    </div>
  );
};


// Editing terminological entries

interface EntryFormProps {
  entry: Concept<any, any>
  className?: string
  onTermChange?: (newVal: string) => void
  onDefinitionChange?: (newVal: string) => void
  onNoteEdit?: (idx: number, newVal: string) => void
  onNoteDeletion?: (idx: number) => void
  onExampleEdit?: (idx: number, newVal: string) => void
  onExampleDeletion?: (idx: number) => void
}
const EntryForm: React.FC<EntryFormProps> = function (props) {

  function openHelpPage(link: string) {
    require('electron').shell.openExternal(link);
  }

  return (
    <div className={styles.entryForm}>
      <FormGroup
          className={styles.designation}
          label="Designation"
          labelFor="designation"
          labelInfo="(required)">
        <InputGroup large fill
          value={props.entry.term || ''}
          id="designation"
          intent={!props.entry.term ? 'danger' : undefined}
          readOnly={!props.onTermChange}
          onChange={(evt: React.FormEvent<HTMLInputElement>) =>
            props.onTermChange
              ? props.onTermChange((evt.target as HTMLInputElement).value)
              : void 0} />
      </FormGroup>

      <FormGroup
          className={styles.definition}
          label="Definition"
          labelFor="definition"
          intent={!props.entry.definition ? 'danger' : undefined}
          helperText={<>
            <p>
              Use a single phrase specifying the concept and, if possible, reflecting the position of the concept in the concept system.
            </p>
            <p>
              Refer to
              {" "}
              <a onClick={() => openHelpPage("https://www.iso.org/standard/40362.html")}>ISO 10241-1:2011, 6.4</a>
              {" "}
              and
              {" "}
              <a onClick={() => openHelpPage("https://www.iso.org/standard/38109.html")}>ISO 704:2009, 6.3</a> for more details about what constitutes a good definition.
            </p>
          </>}
          labelInfo="(required)">
        <AutoSizedTextArea fill
          value={props.entry.definition || ''}
          id="definition"
          disabled={!props.onDefinitionChange}
          intent={!props.entry.definition ? 'danger' : undefined}
          onChange={(evt: React.FormEvent<HTMLTextAreaElement>) =>
            props.onDefinitionChange
              ? props.onDefinitionChange((evt.target as HTMLTextAreaElement).value)
              : void 0} />
      </FormGroup>

      {[...props.entry.examples.entries()].map(([idx, item]) =>
        <FormGroup
            key={`example-${idx}`}
            label={`EXAMPLE ${idx + 1}`}
            labelFor={`example-${idx}`}
            labelInfo={props.onExampleDeletion
              ? <Button small
                  title="Delete this example"
                  icon="cross"
                  onClick={() => props.onExampleDeletion
                    ? props.onExampleDeletion(idx)
                    : void 0} />
              : undefined}
            intent={item.trim() === '' ? 'danger' : undefined}>
          <AutoSizedTextArea fill
            value={item}
            id={`example-${idx}`}
            growVertically
            disabled={!props.onExampleEdit}
            onChange={(evt: React.FormEvent<HTMLTextAreaElement>) => {
              evt.persist();
              props.onExampleEdit
                ? props.onExampleEdit(idx, (evt.target as HTMLTextAreaElement).value)
                : void 0}} />
        </FormGroup>
      )}

      {[...props.entry.notes.entries()].map(([idx, item]) =>
        <FormGroup
            key={`note-${idx}`}
            labelFor={`note-${idx}`}
            label={`NOTE ${idx + 1}`}
            labelInfo={props.onNoteDeletion
              ? <Button small
                  title="Delete this note"
                  icon="cross"
                  onClick={() => props.onNoteDeletion
                    ? props.onNoteDeletion(idx)
                    : void 0} />
              : undefined}
            intent={item.trim() === '' ? 'danger' : undefined}>
          <AutoSizedTextArea fill
            value={item}
            growVertically
            id={`note-${idx}`}
            readOnly={!props.onNoteEdit}
            onChange={(evt: React.FormEvent<HTMLTextAreaElement>) => {
              evt.persist();
              props.onNoteEdit
                ? props.onNoteEdit(idx, (evt.target as HTMLTextAreaElement).value)
                : void 0}} />
        </FormGroup>
      )}
    </div>
  );
};


interface EntryEditProps {
  concept: MultiLanguageConcept<any>
  entry: Concept<any, any>
  isLoading: boolean
  className?: string
}
export const EntryEdit: React.FC<EntryEditProps> = function (props) {
  const [entry, updateEntry] = useState(props.entry);
  const [sanitized, updateSanitized] = useState<Concept<any, any> | undefined>(undefined);
  const [commitInProgress, setCommitInProgress] = useState(false);

  useEffect(() => {
    updateSanitized(sanitizeEntry(entry));
  }, [JSON.stringify(entry)]);

  const commitChanges = async () => {
    if (sanitized !== undefined) {
      setCommitInProgress(true);

      try {
        await callIPC<{ commit: boolean, objectID: number, object: MultiLanguageConcept<any> }, { success: true }>
        ('model-concepts-update-one', {
          objectID: props.concept.termid,
          object: { ...props.concept, [entry.language_code]: sanitized },
          commit: true,
        });
      } catch (e) {
        setCommitInProgress(false);
      }
    }
  };

  function sanitizeEntry(entry: Concept<any, any>): Concept<any, any> | undefined {
    if ((entry.term || '').trim() === '' || (entry.definition || '').trim() === '') {
      return undefined;
    }
    return {
      ...entry,
      notes: entry.notes.filter(i => i.trim() !== ''),
      examples: entry.examples.filter(i => i.trim() !== ''),
    };
  }

  function handleTermChange(val: string) {
    updateEntry(e => ( e ? { ...e, term: val } : e));
  }
  function handleDefChange(val: string) {
    updateEntry(e => ( e ? { ...e, definition: val } : e));
  }
  function handleItemAddition(field: 'notes' | 'examples') {
    return () => {
      updateEntry(e => ( e ? { ...e, [field]: [...e[field], ''] } : e));
    };
  }
  function handleItemDeletion(field: 'notes' | 'examples') {
    return (idx: number) => {
      updateEntry(e => {
        if (e) {
          var items = [ ...e[field] ];
          items.splice(idx, 1);
          return { ...e, [field]: items };
        }
        return e;
      });
    };
  }
  function handleItemEdit(field: 'notes' | 'examples') {
    return (idx: number, val: string) => {
      updateEntry(e => {
        if (e) {
          var items = [ ...e[field] ];
          items[idx] = val;
          return { ...e, [field]: items };
        }
        return e;
      });
    };
  }

  const conceptForm = (
    <EntryForm
      entry={entry}
      onTermChange={handleTermChange}
      onDefinitionChange={handleDefChange}
      onExampleDeletion={handleItemDeletion('examples')}
      onExampleEdit={handleItemEdit('examples')}
      onNoteDeletion={handleItemDeletion('notes')}
      onNoteEdit={handleItemEdit('notes')}
    />
  );

  const hasUncommittedChanges = sanitized && entry && props.entry &&
    JSON.stringify([props.entry.term, props.entry.definition, props.entry.notes, props.entry.examples]) !==
    JSON.stringify([sanitized?.term, sanitized?.definition, sanitized?.notes, sanitized?.examples]);

  const isValid = ['retired', 'superseded'].indexOf(props.entry.entry_status) < 0;

  let saveIntent: Intent | undefined;
  let saveIconSecondary: IconName | undefined;

  if (!isValid) {
    saveIntent = "warning";
    saveIconSecondary = "warning-sign";
  } else {
    saveIntent = "success";
    saveIconSecondary = undefined;
  }

  return (
    <div className={`${styles.conceptEntryForm} ${props.className || ''}`}>

      <div className={styles.entryFormToolbar}>
        <ButtonGroup>
          <Button icon="add" onClick={handleItemAddition('examples')}>EXAMPLE</Button>
          <Button icon="add" onClick={handleItemAddition('notes')}>NOTE</Button>
        </ButtonGroup>

        <ButtonGroup>
          <Button
              onClick={() => updateEntry(props.entry)}
              disabled={
                props.isLoading ||
                !entry ||
                !hasUncommittedChanges}>
            Revert
          </Button>
          <Tooltip
              openOnTargetFocus={false}
              interactionKind="hover"
              intent={saveIntent}
              disabled={!hasUncommittedChanges && isValid}
              content={`Committing new version will make your changes visible to others. ${!isValid ? "NOTE: You are editing a non-valid entry." : ''}`}>
            <Button
                onClick={commitInProgress ? undefined : commitChanges}
                active={commitInProgress}
                icon="git-commit"
                rightIcon={saveIconSecondary}
                intent={saveIntent}
                disabled={
                  sanitized === undefined ||
                  props.isLoading ||
                  !entry ||
                  !hasUncommittedChanges}>
                Commit&nbsp;version
            </Button>
          </Tooltip>
        </ButtonGroup>
      </div>

      {conceptForm}
    </div>
  );
};