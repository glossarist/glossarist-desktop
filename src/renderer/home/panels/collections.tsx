import * as crypto from 'crypto';
import React, { useContext, useRef, useEffect, useState } from 'react';
import { Tree, ITreeNode, Tag, Button, InputGroup } from '@blueprintjs/core';
import { ConceptCollection } from 'models/concepts';
import { app } from 'renderer';
import { SourceContext } from '../contexts';
import { PanelConfig } from '../panel-config';
import { PanelContext } from 'coulomb-panel/panel';
import { callIPC, useIPCValue } from 'coulomb/ipc/renderer';
import { remote } from 'electron';
import { CommitterPic } from '../widgets';


interface PanelState {
  addingItem?: boolean
}


const Panel: React.FC<{}> = function () {
  const source = useContext(SourceContext);
  const collections = app.useMany<ConceptCollection, {}>('collections', {});
  const committerEmail = useIPCValue<{}, { email: string }>('db-default-get-current-committer-info', { email: '' }).value.email;


  // Adding new items

  const panel = useContext(PanelContext);
  const panelState: PanelState = panel.state;
  const addingItem = panelState.addingItem || false;
  const [newItemLabel, setNewItemLabel] = useState<string>('');
  const [commitInProgress, setCommitInProgress] = useState(false);
  const newItemLabelInputRef = useRef<HTMLInputElement | null>(null);
  const alreadyExists = Object.values(collections.objects).
        find(c => c.label === newItemLabel.trim()) !== undefined;

  function toggleAddingLink(state: boolean) {
    panel.setState({ addingItem: state });
  }

  function handleNewLinkChange(evt: React.FormEvent<HTMLInputElement>) {
    setNewItemLabel((evt.target as HTMLInputElement).value);
  }

  async function addNewItem() {
    const label = (newItemLabel || '').trim();

    if (label !== '' && alreadyExists === false && committerEmail !== '') {
      setCommitInProgress(true);

      const newCollectionID = crypto.randomBytes(3).toString('hex');

      await callIPC
        <{ commit: boolean, object: ConceptCollection }, { success: true }>
        ('model-collections-create-one', {
          object: { id: newCollectionID, label, creatorEmail: committerEmail, items: [] },
          commit: true,
        });

      setNewItemLabel('');
      setCommitInProgress(false);
      toggleAddingLink(false);
    }
  }


  // Renaming items

  const [renamedItemID, setRenamedItemID] = useState<string | null>(null);
  const [renamedItemLabel, setRenamedItemLabel] = useState<string>('');

  useEffect(() => {
    if (renamedItemID === null) {
      setRenamedItemLabel('');
    }
  }, [renamedItemID]);

  async function renameItem() {
    const label = (renamedItemLabel || '').trim();

    if (label !== '' && alreadyExists === false && renamedItemID !== null) {
      setCommitInProgress(true);

      await callIPC
        <{ objectID: string, commit: boolean, object: ConceptCollection }, { success: true }>
        ('model-collections-update-one', {
          objectID: renamedItemID,
          object: { id: renamedItemID, label, creatorEmail: committerEmail, items: [] },
          commit: true,
        });

      setRenamedItemLabel('');
      setCommitInProgress(false);
      setRenamedItemID(null);
    }
  }


  // Common to creating and renaming items

  useEffect(() => {
    if (addingItem || renamedItemID !== null) {
      newItemLabelInputRef.current?.focus();
    }
  }, [addingItem, renamedItemID]);


  // Showing existing items

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

  function invokeCollectionMenu(collection: ConceptCollection) {
    const m = new remote.Menu();
    m.append(new remote.MenuItem({
      label: 'Rename',
      enabled:
        addingItem === false &&
        committerEmail !== '' &&
        committerEmail === (collection.creatorEmail || ''),
      click: async () => {
        setRenamedItemLabel(collection.label);
        setRenamedItemID(collection.id);
      }
    }));
    m.popup({ window: remote.getCurrentWindow() });
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
      label: renamedItemID !== collection.id
        ? <div onContextMenu={() => invokeCollectionMenu(collection)}>
            {collection.creatorEmail
              ? <CommitterPic email={collection.creatorEmail} style={{ verticalAlign: 'middle' }} />
              : null}
            {collection.label}
          </div>
        : <InputGroup small
            type="text"
            inputRef={(ref) => { newItemLabelInputRef.current = ref }}
            onBlur={() => renamedItemLabel.trim() === collection.label ? setRenamedItemID(null) : void 0}
            readOnly={commitInProgress || addingItem}
            rightElement={
              <>
                <Button
                  small minimal intent="primary"
                  icon="tick-circle"
                  loading={commitInProgress}
                  disabled={commitInProgress || renamedItemLabel.trim() === ''}
                  onClick={renameItem}
                  title="Commit new label" />
              </>
            }
            onChange={(evt: React.FormEvent<HTMLInputElement>) => setRenamedItemLabel(evt.currentTarget.value)}
            value={renamedItemLabel}
            placeholder="New collection label" />,
      childNodes: [...children.entries()].map(collectionToNode),
      secondaryLabel: <>
        {hasItems
          ? <Tag>{itemCount}</Tag>
          : null}
      </>,
      isSelected: isSelected,
      nodeData: { collectionID: collection.id },
    };
  }

  const treeState: ITreeNode[] = [...Object.entries(collections.objects)].
  filter(([_, collection]) => collection.parentID === undefined).
  map(collectionToNode);

  return (
    <>
      {addingItem
        ? <InputGroup small
            type="text"
            inputRef={(ref) => { newItemLabelInputRef.current = ref }}
            readOnly={commitInProgress}
            rightElement={
              <>
                <Button
                  small minimal intent="primary"
                  icon="tick-circle"
                  loading={commitInProgress}
                  disabled={newItemLabel.trim() === '' || committerEmail === ''}
                  onClick={addNewItem}
                  title="Commit new collection" />
              </>
            }
            onChange={handleNewLinkChange}
            value={newItemLabel}
            placeholder="New collection label"
          />
        : null}
      <Tree
        ref={treeRef}
        contents={treeState}
        onNodeClick={handleNodeClick}
      />
    </>
  );
};


const AddCollection: React.FC<{ isCollapsed?: boolean }> = function ({ isCollapsed }) {
  const panel = useContext(PanelContext);
  const panelState: PanelState = panel.state;
  const addingItem = panelState.addingItem || false;

  useEffect(() => {
    toggleAddingItem(false);
  }, [isCollapsed]);

  function toggleAddingItem(state: boolean) {
    panel.setState({ addingItem: state });
  }

  return <Button icon="add" title="Add collection" small minimal
    onClick={(evt: React.MouseEvent<HTMLElement>) => {
      evt.stopPropagation();
      toggleAddingItem(!addingItem);
    }} />;
};


export default {
  Contents: Panel,
  title: "Collections",
  actions: [AddCollection],
  TitleComponentSecondary: AddCollection,
} as PanelConfig;