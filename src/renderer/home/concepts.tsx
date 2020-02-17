import React, { useState, useRef, useContext, useEffect } from 'react';

import {
  H2, ButtonGroup, Button,
  Callout,
  FormGroup, InputGroup, TextArea,
  Classes,
} from '@blueprintjs/core';

import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { callIPC } from 'coulomb/ipc/renderer';

import {
  Concept,
  MultiLanguageConcept,
} from '../../models/concepts';

import { availableLanguages } from '../../app';
import { ConceptContext } from './contexts';
import styles from './styles.scss';


interface ConceptItemProps {
  concept: MultiLanguageConcept<any>
  lang: keyof typeof availableLanguages
  className?: string 
}
export const ConceptItem: React.FC<ConceptItemProps> =
function ({ lang, concept, className }) {
  const conceptCtx = useContext(ConceptContext);
  const el = useRef<HTMLDivElement>(null);

  const active = conceptCtx.ref === concept.termid;

  useEffect(() => {
    if (active && el && el.current) {
      el.current.scrollIntoViewIfNeeded();
    }
  }, [active]);

  const c = concept[lang as keyof typeof availableLanguages] || concept.eng;

  const designation = c.term;
  const isValid = c ? ['retired', 'superseded'].indexOf(c.entry_status) < 0 : undefined;
  const designationValidityClass = isValid === false ? styles.invalidDesignation : '';

  return (
    <div
        className={`
          ${lang === 'ara' ? Classes.RTL : ''}
          ${styles.conceptItem} ${className || ''}
          ${designationValidityClass}
        `}
        ref={el}>
      {designation}
    </div>
  );
};


// Viewing terminological entries

export const EntryDetails: React.FC<{ isLoading: boolean, entry: Concept<any, any> }> = function ({ isLoading, entry }) {
  const loadingClass = isLoading ? Classes.SKELETON : undefined;

  return (
    <div className={entry.language_code === 'ara' ? Classes.RTL : undefined}>
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

interface EntryEditProps {
  concept: MultiLanguageConcept<any>
  entry: Concept<any, any>
  isLoading: boolean
}
export const EntryEdit: React.FC<EntryEditProps> = function (props) {
  const [entry, updateEntry] = useState(props.entry);
  const [sanitized, updateSanitized] = useState<Concept<any, any> | undefined>(undefined);
  const [commitInProgress, setCommitInProgress] = useState(false);
  const langCtx = useContext(LangConfigContext);

  useEffect(() => {
    // This will unset flag set in commitChanges.
    setCommitInProgress(false);
  }, [JSON.stringify(props.concept)])

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

  useEffect(() => {
    updateSanitized(sanitizeEntry(entry));
  }, [JSON.stringify(entry)]);

  const commitChanges = async () => {
    if (sanitized !== undefined) {
      setCommitInProgress(true);

      await callIPC<{ commit: boolean, objectID: number, object: MultiLanguageConcept<any> }, { success: true }>
      ('model-concepts-update-one', {
        objectID: props.concept.termid,
        object: { ...props.concept, [entry.language_code]: sanitized },
        commit: true,
      });
    }
  };

  function handleTermChange(evt: React.FormEvent<HTMLInputElement>) {
    const val = (evt.target as HTMLInputElement).value;
    updateEntry(e => ( e ? { ...e, term: val } : e));
  }
  function handleDefChange(evt: React.FormEvent<HTMLTextAreaElement>) {
    const val = (evt.target as HTMLTextAreaElement).value;
    updateEntry(e => ( e ? { ...e, definition: val } : e));
  }
  function handleItemAddition(field: 'notes' | 'examples') {
    return () => {
      updateEntry(e => ( e ? { ...e, [field]: [...e[field], ''] } : e));
    };
  }
  function handleItemDeletion(field: 'notes' | 'examples', idx: number) {
    return () => {
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
  function handleItemEdit(field: 'notes' | 'examples', idx: number) {
    return (evt: React.FormEvent<HTMLTextAreaElement>) => {
      evt.persist();
      updateEntry(e => {
        if (e) {
          var items = [ ...e[field] ];
          items[idx] = (evt.target as HTMLTextAreaElement).value;
          return { ...e, [field]: items };
        }
        return e;
      });
    };
  }

  const conceptForm = (
    <div className={entry.language_code === 'ara' ? Classes.RTL : undefined}>
      <FormGroup label="Designation" labelInfo="(required)" intent={!entry.term ? 'danger' : undefined}>
        <InputGroup large fill value={entry.term} onChange={handleTermChange} />
      </FormGroup>

      <FormGroup label="Definition" labelInfo="(required)" intent={!entry.definition ? 'danger' : undefined}>
        <TextArea fill value={entry.definition} growVertically onChange={handleDefChange} />
      </FormGroup>

      {[...entry.examples.entries()].map(([idx, item]) =>
        <FormGroup
            key={`example-${idx}`}
            label={`EXAMPLE ${idx + 1}`}
            labelInfo={<Button minimal
              title="Delete this example"
              icon="cross" intent="danger"
              onClick={handleItemDeletion('examples', idx)} />}
            intent={item.trim() === '' ? 'danger' : undefined}>
          <TextArea fill value={item} growVertically onChange={handleItemEdit('examples', idx)} />
        </FormGroup>
      )}

      {[...entry.notes.entries()].map(([idx, item]) =>
        <FormGroup
            key={`note-${idx}`}
            label={`NOTE ${idx + 1}`}
            labelInfo={<Button minimal
              title="Delete this note"
              icon="cross" intent="danger"
              onClick={handleItemDeletion('notes', idx)} />}
            intent={item.trim() === '' ? 'danger' : undefined}>
          <TextArea fill value={item} growVertically onChange={handleItemEdit('notes', idx)} />
        </FormGroup>
      )}
    </div>
  );

  const hasUncommittedChanges = entry && props.entry &&
    JSON.stringify(props.entry) !== JSON.stringify(sanitized);

  const isValid = ['retired', 'superseded'].indexOf(props.entry.entry_status) < 0;

  return (
    <div className={styles.conceptEntryForm}>
      {!isValid
        ? <Callout
              className={styles.editingNonValidEntry}
              icon="asterisk"
              intent="warning"
              title="Editing non-valid entry">
            The designation or definition of this concept in {langCtx.available[entry.language_code]} has status <strong>{props.entry.entry_status}</strong>.
          </Callout>
        : null}

      {conceptForm}

      <ButtonGroup large>
        <Button onClick={handleItemAddition('examples')}>Append EXAMPLE</Button>
        <Button onClick={handleItemAddition('notes')}>Append NOTE</Button>
        <Button
            onClick={commitInProgress ? undefined : commitChanges}
            active={commitInProgress}
            intent={(sanitized !== undefined && hasUncommittedChanges) ? "success" : undefined}
            disabled={
              sanitized === undefined ||
              props.isLoading ||
              !entry ||
              !hasUncommittedChanges}>
          Save version
        </Button>
      </ButtonGroup>
    </div>
  );
};