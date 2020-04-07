import React, { useState, useEffect } from 'react';

import {
  ButtonGroup, Button,
  Tooltip,
  Intent,
  IconName,
} from '@blueprintjs/core';

import { callIPC } from 'coulomb/ipc/renderer';

import {
  Concept,
  MultiLanguageConcept,
  Designation,
  NORMATIVE_STATUS_CHOICES,
  WithRevisions,
} from 'models/concepts';

import { EntryForm } from './entry-form';
import styles from './styles.scss';
import sharedStyles from '../styles.scss';


interface EntryEditProps {
  concept: MultiLanguageConcept<any>
  entry: WithRevisions<Concept<any, any>>
  isLoading: boolean
  parentRevisionID: string
  onCreateRevision?: (newRevisionID: string) => void
  className?: string
}
export const EntryEdit: React.FC<EntryEditProps> = function (props) {
  const _revision =
    props.entry._revisions.tree[props.parentRevisionID]?.object
    // NOTE: this falls back to “naked” entry data,
    // which may happen when entry was updated but parentRevisionID
    // still points to a revision from another entry (e.g., during language switch).
    // Proper parentRevisionID would load quickly after that with an effect
    // on one of the parent components, so this would be a fleeting state:
    || props.entry;

  if (!_revision) {
    throw new Error("Failed to load revision");
  }

  const [entry, updateEntry] = useState<Concept<any, any>>(_revision);
  const [sanitized, updateSanitized] = useState<Concept<any, any> | undefined>(undefined);
  const [commitInProgress, setCommitInProgress] = useState(false);

  useEffect(() => {
    updateSanitized(sanitizeEntry(entry));
  }, [JSON.stringify(entry)]);

  useEffect(() => {
    updateEntry(_revision);
  }, [props.parentRevisionID]);

  const commitChanges = async () => {
    if (sanitized !== undefined) {
      setCommitInProgress(true);

      try {
        const { newRevisionID } = await callIPC<{ data: Concept<any, any>, objID: number, lang: string, parentRevision: string }, { newRevisionID: string }>
        ('model-concepts-create-revision', {
          objID: props.concept.termid,
          data: sanitized,
          lang: entry.language_code,
          parentRevision: props.parentRevisionID,
        });
        setCommitInProgress(false);
        setImmediate(() => props.onCreateRevision ? props.onCreateRevision(newRevisionID) : void 0);
      } catch (e) {
        setCommitInProgress(false);
      }
    }
  };

  function sanitizeEntry(entry: Concept<any, any>): Concept<any, any> | undefined {
    const hasEmptyDesignations = entry.terms.filter(t => t.designation.trim() === '').length > 0;
    if (hasEmptyDesignations || (entry.definition || '').trim() === '') {
      return undefined;
    }
    return {
      ...entry,
      notes: entry.notes.filter(i => i.trim() !== ''),
      examples: entry.examples.filter(i => i.trim() !== ''),
    };
  }

  function handleDesignationAddition() {
    updateEntry((e): Concept<number, any> => {
      if (e) {
        const newTerm: Designation = { type: 'expression', designation: '', partOfSpeech: undefined };
        return { ...e, terms: [...e.terms, newTerm] }
      }
      return e;
    });
  }
  function handleDesignationChange(idx: number, val: Designation) {
    updateEntry(e => {
      if (e) {
        var items = [ ...e.terms ];
        items[idx] = val;

        return { ...e, terms: items.sort((i1, i2) => {
          if (NORMATIVE_STATUS_CHOICES.indexOf(i1.normativeStatus || 'admitted') >
              NORMATIVE_STATUS_CHOICES.indexOf(i2.normativeStatus || 'admitted')) {
             return 1;
           } else if (NORMATIVE_STATUS_CHOICES.indexOf(i1.normativeStatus || 'admitted') <
                      NORMATIVE_STATUS_CHOICES.indexOf(i2.normativeStatus || 'admitted')) {
             return -1;
           } else {
             return 0;
           }
        })};
      }
      return e;
    });
  }
  function handleDefChange(val: string) {
    updateEntry(e => ( e ? { ...e, definition: val } : e));
  }
  function handleUsageInfoChange(val: string) {
    updateEntry(e => ( e ? { ...e, usageInfo: val } : e));
  }
  function handleItemAddition(field: 'notes' | 'examples') {
    return () => {
      updateEntry(e => ( e ? { ...e, [field]: [...e[field], ''] } : e));
    };
  }
  function handleItemDeletion(field: 'notes' | 'examples' | 'terms') {
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
      onDefinitionChange={handleDefChange}
      onUsageInfoChange={handleUsageInfoChange}
      onDesignationDeletion={handleItemDeletion('terms')}
      onDesignationEdit={handleDesignationChange}
      onExampleDeletion={handleItemDeletion('examples')}
      onExampleEdit={handleItemEdit('examples')}
      onNoteDeletion={handleItemDeletion('notes')}
      onNoteEdit={handleItemEdit('notes')}
    />
  );

  const hasUncommittedChanges = sanitized && entry && _revision &&
    JSON.stringify([_revision.usageInfo, _revision.terms, _revision.definition, _revision.notes, _revision.examples]) !==
    JSON.stringify([sanitized.usageInfo, sanitized?.terms, sanitized?.definition, sanitized?.notes, sanitized?.examples]);

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

      <div className={sharedStyles.moduleViewToolbarInner}>
        <ButtonGroup>
          <Button icon="add" onClick={handleDesignationAddition} title="Add another designation/synonym">Designation</Button>
          <Button icon="add" onClick={handleItemAddition('examples')} title="Add an EXAMPLE">EX.</Button>
          <Button icon="add" onClick={handleItemAddition('notes')} title="Add a NOTE">NOTE</Button>
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