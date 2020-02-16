import React, { useMemo, useRef, useContext, useEffect } from 'react';

import { ConceptCollection } from '../../models/concepts';

import {
  H3, Classes,
  Switch, Button,
  FormGroup, InputGroup, TextArea,
  Text,
  Tree, ITreeNode,
  IInputGroupProps,
  Tag, Icon,
} from '@blueprintjs/core';

import { app, conf as rendererConf } from '../index';
import { conf as appConf } from '../../app';
import { DatabaseList } from 'coulomb/db/renderer/status';

import { LangConfigContext } from 'coulomb/localizer/renderer/context';

import { ConceptContextSpec, ConceptContext, SourceContext } from './contexts';
import { ConceptItem } from './concepts';

import styles from './styles.scss';
import { useIPCValue } from 'coulomb/ipc/renderer';


export const SystemPanel: React.FC<{}> = function () {
  const concept = useContext(ConceptContext);
  return (
    <div className={styles.systemPanel}>
      <FormGroup label="ID" inline={true}>
        <InputGroup readOnly={true} value={`${concept?.ref}` || '—'} />
      </FormGroup>
    </div>
  );
};


export const Changelog: React.FC<{}> = function () {
  const concept = useContext(ConceptContext);

  const hasUncommittedChanges = useIPCValue<{ objectID: number }, { modified: boolean }>
  ('model-concepts-get-modified-status', { modified: false }, { objectID: concept.ref || -1 });

  return <ObjectStorageStatus
    hasUncommittedChanges={hasUncommittedChanges.value.modified} />
}


export const DatabasePanel: React.FC<{}> = function() {
  return useMemo(() => (
    <DatabaseList
      databases={appConf.databases}
      databaseStatusComponents={rendererConf.databaseStatusComponents} />
  ), Object.keys(appConf.databases));
};


export const SourceRoll: React.FC<{}> = function () {
  const source = useContext(SourceContext);
  const concept = useContext(ConceptContext);
  const concepts = source.objects;

  const panelRef = useRef<HTMLDivElement>(null);

  function handleNodeClick(node: ITreeNode) {
    const nodeData = node.nodeData as { conceptRef: number };
    const ref = nodeData.conceptRef;
    if (ref) {
      concept.select(ref);
    }
  }

  let treeState: ITreeNode[];
  if (source.isLoading) {
    treeState = [1, 2, 3, 4].map(id => ({
      id: id,
      label: <span className={Classes.SKELETON}>Loading…</span>,
    }));
  } else {
    treeState = concepts.map(c => ({
      id: c.termid,
      label: <ConceptItem concept={c} />,
      nodeData: { conceptRef: c.termid },
      isSelected: concept.ref === c.termid,
    }));
  }

  return (
    <div ref={panelRef} className={styles.sourceRollPanel}>
      <H3>{source.active.type}</H3>
      <Tree contents={treeState} onNodeClick={handleNodeClick} />
    </div>
  );
};


export const CatalogPanel: React.FC<{}> = function () {
  const source = useContext(SourceContext);
  const src = source.active;

  const treeState: ITreeNode[] = [{
    id: 'all',
    label: 'All concepts',
    isSelected: src.type === 'catalog-preset' && src.presetName === 'all',
    nodeData: { presetName: 'all' },
  }];

  function handleNodeClick(nodeData: ITreeNode) {
    const data = nodeData.nodeData as { presetName: 'all' };
    const presetName: string = data.presetName;
    source.select({ type: 'catalog-preset', presetName });
  }

  return (
    <Tree contents={treeState} onNodeClick={handleNodeClick} />
  );
};


export const CollectionsPanel: React.FC<{}> = function () {
  const source = useContext(SourceContext);
  const collections = app.useMany<ConceptCollection, {}>('collections', {});

  const treeRef = useRef<Tree>(null);

  useEffect(() => {
    setTimeout(() => {
      if (treeRef.current && source.active.type === 'collection') {
        const currentNode = treeRef.current.getNodeContentElement(source.active.collectionID);
        currentNode?.scrollIntoViewIfNeeded();
      }
    }, 300);
  }, []);

  function handleNodeClick(nodeData: ITreeNode) {
    const data = nodeData.nodeData as { collectionID: string };
    const collectionID: string = data.collectionID;
    const collectionToSelect: ConceptCollection | undefined = collections.objects[collectionID];
    const canSelect = collectionToSelect?.items.length > 0;
    if (canSelect) {
      source.select({ type: 'collection', collectionID });
    }
  }

  function collectionToNode([_, collection]: [number | string, ConceptCollection]): ITreeNode {
    const children = Object.values(collections.objects).
    filter(c => c.parentID !== undefined).
    filter(c => c.parentID === collection.id);

    const hasChildren = children.length > 0;
    const hasItems = collection.items.length > 0;
    const isSelected = source.active.type === 'collection' ? (hasItems && (source.active.collectionID === collection.id)) : false;

    return {
      id: collection.id,
      hasCaret: hasChildren,
      isExpanded: hasChildren,
      label: collection.label,
      childNodes: [...children.entries()].map(collectionToNode),
      isSelected: isSelected,
      nodeData: { collectionID: collection.id },
    };
  }

  const treeState: ITreeNode[] = [...Object.entries(collections.objects)].
  filter(([_, collection]) => collection.parentID === undefined).
  map(collectionToNode);

  return (
    <Tree ref={treeRef} contents={treeState} onNodeClick={handleNodeClick} className={styles.collectionsPanelList} />
  );
};


export const BasicsPanel: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);
  const concept = useContext(ConceptContext);
  const localized = concept.activeLocalized;
  const field = panelFieldProps(concept);
  const rtlClass = lang.selected === 'ara' ? Classes.RTL : '';

  const isValid = localized ? ['retired', 'superseded'].indexOf(localized.entry_status) < 0 : undefined;
  const designationValidityClass = isValid === false ? styles.invalidDesignation : '';
  const loadingClass = concept.isLoading ? Classes.SKELETON : undefined;
  const preferredDesignationMarker = localized?.classification === 'preferred'
    ? <span className={loadingClass}>preferred</span>
    : undefined;

  return (
    <div className={`${styles.basicsPanel} ${rtlClass}`}>
      {localized !== null && localized !== undefined
        ? <>
            <FormGroup
                key="designation"
                label="Designation"
                labelInfo={preferredDesignationMarker}
                className={styles.designation}>
              <InputGroup
                large={true}
                value={localized.term}
                className={`${rtlClass} ${designationValidityClass} ${loadingClass}`}
                {...field} />
            </FormGroup>

            <FormGroup
                className={rtlClass}
                key="definition">
              <TextArea
                growVertically={true}
                className={`${styles.definition} ${rtlClass} ${loadingClass}`}
                value={localized.definition}
                {...field} />
            </FormGroup>

            {[...localized.notes.entries()].map(([idx, note]) =>
              <FormGroup
                  key={`note-${idx}`}
                  inline
                  label="NOTE">
                <Text
                  className={`${styles.note} ${loadingClass}`}>{note}</Text>
              </FormGroup>
            )}

            {[...localized.examples.entries()].map(([idx, example]) =>
              <FormGroup
                  key={`note-${idx}`}
                  inline
                  label="EXAMPLE">
                <Text
                  className={`${loadingClass} ${styles.example}`}>{example}</Text>
              </FormGroup>
            )}
          </>

        : null}
    </div>
  );
};


export const StatusPanel: React.FC<{}> = function () {
  const concept = useContext(ConceptContext);
  const localized = concept.activeLocalized;

  return (
    <div className={styles.statusPanel}>
      {localized !== null && localized !== undefined
        ? <>
            <FormGroup
                label="Entry status"
                inline
                className={styles.entryStatus}>
              <InputGroup
                value={localized.entry_status}
                {...panelFieldProps(concept)} />
            </FormGroup>
          </>
        : null}
    </div>
  );
};


export const CurrentReviewPanel: React.FC<{}> = function () {
  const concept = useContext(ConceptContext);
  const localized = concept.activeLocalized;

  if (!localized) {
    return null;
  }

  const completed = localized?.review_date === undefined || localized?.review_decision !== undefined;

  return (
    <div className={styles.currentReviewPanel}>
      <FormGroup
          inline>
        <Switch
          label={completed ? "Completed" : "Pending"}
          disabled
          checked={completed} />
      </FormGroup>
    </div>
  );
};


export const LineagePanel: React.FC<{}> = function () {
  const concept = useContext(ConceptContext).activeLocalized;
  const authURL = concept?.authoritative_source.link;

  if (!concept) {
    return null;
  }

  function openAuthSource() {
    if (authURL) {
      require('electron').shell.openExternal(authURL.toString());
    }
  }

  function handleNodeClick(node: ITreeNode) {
    const nodeData = node.nodeData as { isAuthSource?: boolean };
    const isAuthSource = nodeData.isAuthSource;
    if (isAuthSource) {
      openAuthSource();
    }
  }

  var treeState: ITreeNode[] = [];

  if (concept.lineage_source) {
    treeState.push({
      id: 'preceding-use',
      label: concept.lineage_source,
      secondaryLabel: <Tag
          minimal
          title={`Lineage source similarity: ${concept.lineage_source_similarity || 'unknown'}`}
          rightIcon={<>=&nbsp;<strong>{concept.lineage_source_similarity || '?'}</strong></>}>
        Lineage
      </Tag>,
    });
  }

  treeState.push({
    id: 'auth-source',
    label: concept.authoritative_source.ref,
    secondaryLabel: <>
      <Tag intent={authURL ? "primary" : undefined} title="Authoritative source">Auth. source</Tag>
    </>,
    nodeData: { isAuthSource: true },
  });

  return (
    <Tree contents={treeState} onNodeClick={handleNodeClick} />
  );
};


export const PanelPlaceholder: React.FC<{}> = function () {
  return (
    <div className={styles.panelPlaceholder}>
      Coming soon.
    </div>
  );
};


function panelFieldProps(concept: ConceptContextSpec) {
  /* Props shared across BP3 input groups, textareas in panel fields. */

  return {
    fill: true,
    intent: concept.activeLocalized === undefined ? 'danger' : undefined as IInputGroupProps["intent"],
    disabled: concept.isLoading,
    readOnly: true,
  };
}


interface ObjectStorageStatusProps {
  haveSaved?: boolean,
  canSave?: boolean,
  hasUncommittedChanges: boolean,
  onCommit?: () => Promise<void>,
}
export const ObjectStorageStatus: React.FC<ObjectStorageStatusProps> =
function ({ canSave, haveSaved, hasUncommittedChanges, onCommit }) {
  /* Shows an icon showing save is in progress, or commit button if applicable. */

  let changeStatus: JSX.Element;

  if (haveSaved === false) {
    changeStatus = <Icon icon="asterisk" intent="danger" />

  } else if (hasUncommittedChanges === true) {
    changeStatus = <Button
        intent="success"
        onClick={onCommit}
        disabled={onCommit === undefined || canSave === false}
        icon="git-commit">
      {onCommit ? "Commit version" : "Changes pending commit"}
    </Button>;

  } else {
    changeStatus = <Button icon="tick-circle" disabled>Viewing latest version</Button>;
  }

  return changeStatus;
};
