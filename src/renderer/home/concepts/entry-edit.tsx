import React, { useState, useEffect } from 'react';

import {
  ButtonGroup, Button,
  Tooltip,
  Intent,
  IconName,
} from '@blueprintjs/core';

import { callIPC } from '@riboseinc/coulomb/ipc/renderer';

import {
  Concept,
  Designation,
  NORMATIVE_STATUS_CHOICES,
} from 'models/concepts';

import { Revision } from 'models/revisions';
import { app } from 'renderer';

import { EntryForm } from './entry-form';
import styles from './styles.scss';
import sharedStyles from '../styles.scss';
import { ChangeRequest } from 'models/change-requests';


interface EntryEditProps {
  changeRequestID: string
  entry: Concept<any, any>
  isLoading: boolean
  parentRevisionID: string | null
  latestRevisionID: string | null
  onUpdateCR?: (created?: boolean) => void
  className?: string
}
export const EntryEdit: React.FC<EntryEditProps> = function (props) {
  const cr = app.useOne<ChangeRequest, string>('changeRequests', props.changeRequestID).object;

  const revisionInCR: null | Revision<Concept<any, any>> = (cr?.revisions.concepts || {})[`${props.entry.id}-${props.entry.language_code}`] || null;

  const creating = revisionInCR === null;

  const _revision = (
    revisionInCR?.object ||
    props.entry);

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
  }, [revisionInCR, props.parentRevisionID]);

  const revertChanges = async () => {
    await callIPC<{ changeRequestID: string, objectType: string, objectID: string }, { success: true }>
    ('model-changeRequests-delete-revision', {
      changeRequestID: props.changeRequestID,
      objectType: 'concepts',
      objectID: `${entry.id}-${entry.language_code}`,
    });
  };

  const commitChanges = async () => {
    if (sanitized !== undefined) {
      setCommitInProgress(true);

      try {
        await callIPC
        <{ changeRequestID: string, objectType: string, objectID: string,
           data: Concept<any, any>, parentRevisionID: string | null }, { newRevisionID: string }>
        ('model-changeRequests-save-revision', {
          changeRequestID: props.changeRequestID,
          data: sanitized,
          objectType: 'concepts',
          objectID: `${entry.id}-${entry.language_code}`,
          parentRevisionID: props.parentRevisionID,
        });
        setCommitInProgress(false);
        setImmediate(() => props.onUpdateCR ? props.onUpdateCR() : void 0);
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
          if (NORMATIVE_STATUS_CHOICES.indexOf(i1.normative_status || 'admitted') >
              NORMATIVE_STATUS_CHOICES.indexOf(i2.normative_status || 'admitted')) {
             return 1;
           } else if (NORMATIVE_STATUS_CHOICES.indexOf(i1.normative_status || 'admitted') <
                      NORMATIVE_STATUS_CHOICES.indexOf(i2.normative_status || 'admitted')) {
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
  function handleDomainChange(val: string) {
    updateEntry(e => ( e ? { ...e, domain: val } : e));
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

  const canEdit =
    cr?.timeSubmitted === undefined &&
    props.latestRevisionID === props.parentRevisionID ||
    (props.parentRevisionID === null && props.latestRevisionID === null) ||
    (props.parentRevisionID === null || revisionInCR === null || revisionInCR.parents[0] === props.parentRevisionID);

  const conceptForm = (
    <EntryForm
      entry={entry}
      onDefinitionChange={canEdit ? handleDefChange : undefined}
      onUsageInfoChange={canEdit ? handleUsageInfoChange : undefined}
      onDesignationDeletion={canEdit ? handleItemDeletion('terms') : undefined}
      onDesignationEdit={canEdit ? handleDesignationChange : undefined}
      onExampleDeletion={canEdit ? handleItemDeletion('examples') : undefined}
      onExampleEdit={canEdit ? handleItemEdit('examples') : undefined}
      onNoteDeletion={canEdit ? handleItemDeletion('notes') : undefined}
      onNoteEdit={canEdit ? handleItemEdit('notes') : undefined}
      onDomainChange={canEdit ? handleDomainChange : undefined}
    />
  );

  const hasUncommittedChanges = sanitized && entry && _revision &&
    JSON.stringify([_revision.usageInfo, _revision.terms, _revision.definition, _revision.notes, _revision.examples]) !==
    JSON.stringify([sanitized.usageInfo, sanitized.terms, sanitized.definition, sanitized.notes, sanitized.examples]);

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
          <Button icon="add" disabled={!canEdit} onClick={handleDesignationAddition} title="Add another designation/synonym">Designation</Button>
          <Button icon="add" disabled={!canEdit} onClick={handleItemAddition('examples')} title="Add an EXAMPLE">EX.</Button>
          <Button icon="add" disabled={!canEdit} onClick={handleItemAddition('notes')} title="Add a NOTE">NOTE</Button>
        </ButtonGroup>

        <ButtonGroup>
          <Button
              onClick={revertChanges}
              intent="warning"
              title="Deletes changes to this entry from draft change request"
              icon="cross"
              disabled={creating}>
            Remove from CR
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
                title="Add or update changes to this item in selected change request"
                icon="confirm"
                rightIcon={saveIconSecondary}
                intent={saveIntent}
                disabled={
                  sanitized === undefined ||
                  props.isLoading ||
                  !entry ||
                  !hasUncommittedChanges}>
                {creating ? "Add to CR" : "Update CR"}
            </Button>
          </Tooltip>
        </ButtonGroup>
      </div>

      {conceptForm}
    </div>
  );
};
