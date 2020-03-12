import React, { useMemo, useRef, useContext, useEffect, useState, FormEvent } from 'react';

import { ConceptCollection, ConceptRef, MultiLanguageConcept, ConceptRelation } from '../../models/concepts';

import {
  Classes,
  Switch, Button,
  FormGroup, InputGroup,
  Text,
  Tree, ITreeNode,
  IInputGroupProps,
  Tag, Icon,
} from '@blueprintjs/core';

import { app, conf as rendererConf } from '../index';
import { conf as appConf, availableLanguages } from '../../app';
import { DatabaseList } from 'coulomb/db/renderer/status';

import { LangConfigContext } from 'coulomb/localizer/renderer/context';

import {
  ConceptContextSpec,
  ConceptContext,
  SourceContext,
  ConceptRelationshipsContext,
  ConceptRelationshipsContextProvider,
} from './contexts';
import { ConceptList, LazyConceptItem } from './concepts';

import styles from './styles.scss';
import { AutoSizedTextArea } from './widgets';
import { callIPC } from 'coulomb/ipc/renderer';


const DEFAULT_RELATIONSHIP_TYPE = 'related';


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


export const DatabasePanel: React.FC<{}> = function() {
  return useMemo(() => (
    <DatabaseList
      databases={appConf.databases}
      databaseStatusComponents={rendererConf.databaseStatusComponents} />
  ), Object.keys(appConf.databases));
};


export const PossiblyTranslatedSourceRoll: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);
  return <SourceRoll lang={lang.selected as keyof typeof availableLanguages} />;
};

export const AuthoritativeLanguageSourceRoll: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);
  return <SourceRoll lang={lang.default as keyof typeof availableLanguages} />;
};

const SourceRoll: React.FC<{ lang: keyof typeof availableLanguages }> = function ({ lang }) {
  const source = useContext(SourceContext);
  const concept = useContext(ConceptContext);
  const concepts = source.objects;

  return (
    <ConceptList
      lang={lang}
      itemHeight={24}
      buttonProps={{ small: true }}
      className={styles.conceptList}
      concepts={concepts}
      itemMarker={(c: MultiLanguageConcept<any>) =>
        <span className={styles.conceptID}>{c.termid}</span>}
      isItemSelected={(ref: ConceptRef) => concept.ref === ref}
      onItemSelect={(ref: ConceptRef) => concept.select(ref)}
    />
  );
};


export const RelationshipsPanel: React.FC<{}> = function () {
  const concept = useContext(ConceptContext);

  const [newLinkTarget, setNewLinkTarget] = useState<string>('');
  const [newLinkType, setNewLinkType] = useState<string>(DEFAULT_RELATIONSHIP_TYPE);
  const [addingLink, toggleAddingLink] = useState(false);
  const [commitInProgress, setCommitInProgress] = useState(false);

  function handleNewLinkChange(evt: FormEvent<HTMLInputElement>) {
    setNewLinkTarget((evt.target as HTMLInputElement).value.trim());
  }

  async function addNewLink() {
    let newLinkRef: number;
    try {
      newLinkRef = parseInt(newLinkTarget, 10);
    } catch (e) {
      return;
    }

    const existingRelations = concept.active?.relations || [];

    const alreadyExists =
      existingRelations.
      find(r => r.to === newLinkRef && r.type === newLinkType) !== undefined;

    if (newLinkRef !== concept.ref && alreadyExists === false && concept.ref && concept.active) {
      setCommitInProgress(true);

      const relations: ConceptRelation[] = [
        ...existingRelations,
        { to: newLinkRef, type: newLinkType },
      ];

      await callIPC
        <{ commit: boolean, objectID: number, object: MultiLanguageConcept<any> }, { success: true }>
        ('model-concepts-update-one', {
          objectID: concept.ref,
          object: { ...concept.active, relations },
          commit: true,
        });

      setNewLinkTarget('');
      setNewLinkType(DEFAULT_RELATIONSHIP_TYPE);
      setCommitInProgress(false);
      toggleAddingLink(false);
    }
  }

  async function handleRemoveOutgoingLink(type: string, to: ConceptRef) {
    toggleAddingLink(false);

    if (concept.ref && concept.active) {
      const existingRelations = concept.active.relations || [];

      const relations: ConceptRelation[] =
        existingRelations.filter(r => r.to !== to || r.type !== type);

      await callIPC
      <{ commit: boolean, objectID: number, object: MultiLanguageConcept<any> }, { success: true }>
      ('model-concepts-update-one', {
        objectID: concept.ref,
        object: { ...concept.active, relations },
        commit: true,
      });
    }
  }

  return (
    <>
      {addingLink
        ? <InputGroup small
            type="text"
            readOnly={commitInProgress}
            rightElement={
              <>
                <Button
                  small minimal intent="primary"
                  icon="tick-circle"
                  loading={commitInProgress}
                  disabled={newLinkTarget.trim() === ''}
                  onClick={addNewLink}
                  title="Commit new outgoing link" />
                <Button
                  small minimal
                  icon="cross"
                  onClick={() => toggleAddingLink(false)}
                  title="Cancel" />
              </>
            }
            onChange={handleNewLinkChange}
            value={newLinkTarget}
            placeholder="ID of concept to link"
          />
        : <Button
            small minimal fill
            icon="add"
            alignText="left"
            disabled={!concept.active}
            onClick={() => toggleAddingLink(true)}>Add link…</Button>}

      <ConceptRelationshipsContextProvider>
        <ConceptRelations
          onRemoveOutgoingLink={handleRemoveOutgoingLink}
          onConceptSelect={(ref: ConceptRef) => concept.select(ref)}/>
      </ConceptRelationshipsContextProvider>
    </>
  );
};


interface ConceptRelationsProps {
  onRemoveOutgoingLink: (relationType: string, relationTarget: ConceptRef) => void
  onConceptSelect: (ref: ConceptRef) => void
}
const ConceptRelations: React.FC<ConceptRelationsProps> =
function ({ onRemoveOutgoingLink, onConceptSelect }) {
  const ctx = useContext(ConceptRelationshipsContext);
  const lang = useContext(LangConfigContext);

  const nodesLinksTo: ITreeNode[] = ctx.linksTo.map(r => ({
    id: r.to,
    hasCaret: false,
    label: <LazyConceptItem
      lang={lang.selected as keyof typeof availableLanguages}
      conceptRef={r.to} />,
    icon: <span className={styles.conceptID}>{r.to}</span>,
    secondaryLabel:
      <Button small minimal
        onClick={(evt: React.FormEvent) => {
          evt.preventDefault();
          evt.stopPropagation();
          onRemoveOutgoingLink(r.type, r.to);
        }}
        icon="cross" />,
    nodeData: {
      type: r.type,
      to: r.to,
      ref: r.to,
    },
  }));

  const nodesLinkedFrom: ITreeNode[] = ctx.linkedFrom.map(r => ({
    id: r.from,
    hasCaret: false,
    icon: <span className={styles.conceptID}>{r.from}</span>,
    label: <LazyConceptItem
      lang={lang.selected as keyof typeof availableLanguages}
      conceptRef={r.from} />,
    secondaryLabel:
      <Button disabled small minimal icon="cross" />,
    nodeData: {
      ref: r.from,
    },
  }));

  var nodes: ITreeNode[] = []
  if (nodesLinksTo.length > 0) {
    nodes.push({
      id: 'outgoing',
      label: "Links to",
      hasCaret: true,
      isExpanded: true,
      childNodes: nodesLinksTo,
    });
  }
  if (nodesLinkedFrom.length > 0) {
    nodes.push({
      id: 'incoming',
      label: "Linked from",
      hasCaret: true,
      isExpanded: true,
      childNodes: nodesLinkedFrom,
    });
  }

  function handleNodeClick(nodeData: ITreeNode) {
    const data = nodeData.nodeData as { ref: ConceptRef };
    onConceptSelect(data.ref);
  }

  return (
    <Tree contents={nodes} onNodeClick={handleNodeClick} />
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
    }, 500);
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

    const itemCount = hasChildren ? 0 : collection.items.length;
    const hasItems = !hasChildren ? itemCount > 0 : false;
    const isSelected = source.active.type === 'collection'
      ? (hasItems && (source.active.collectionID === collection.id))
      : false;

    return {
      id: collection.id,
      hasCaret: hasChildren,
      isExpanded: hasChildren,
      label: collection.label,
      childNodes: [...children.entries()].map(collectionToNode),
      secondaryLabel: hasItems ? <Tag minimal>{itemCount}</Tag> : undefined,
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
              <AutoSizedTextArea
                growVertically={true}
                className={`${styles.definition} ${rtlClass} ${loadingClass}`}
                value={localized.definition || ''}
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
                label={<>Entry&nbsp;status</>}
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
    disabled: authURL === undefined,
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
