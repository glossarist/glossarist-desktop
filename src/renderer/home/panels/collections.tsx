import * as crypto from 'crypto';
import React, { useContext, useRef, useEffect, useState } from 'react';
import { Tree, ITreeNode, Tag, Button, InputGroup } from '@blueprintjs/core';
import { ConceptCollection } from 'models/concepts';
import { app } from 'renderer';
import { SourceContext } from '../contexts';
import { PanelConfig } from '../panel-config';
import { PanelContext } from 'coulomb-panel/panel';
import { callIPC } from 'coulomb/ipc/renderer';


interface PanelState {
  addingItem?: boolean
}


const Panel: React.FC<{}> = function () {
  const source = useContext(SourceContext);
  const collections = app.useMany<ConceptCollection, {}>('collections', {});

  // Adding new items

  const panel = useContext(PanelContext);
  const panelState: PanelState = panel.state;
  const addingItem = panelState.addingItem || false;
  const [newItemLabel, setNewItemLabel] = useState<string>('');
  const [commitInProgress, setCommitInProgress] = useState(false);
  const newItemLabelInputRef = useRef<HTMLInputElement | null>(null);
  const alreadyExists = Object.values(collections.objects).
        find(c => c.label === newItemLabel.trim()) !== undefined;

  useEffect(() => {
    newItemLabelInputRef.current?.focus();
  }, [addingItem]);

  function toggleAddingLink(state: boolean) {
    panel.setState({ addingItem: state });
  }

  function handleNewLinkChange(evt: React.FormEvent<HTMLInputElement>) {
    setNewItemLabel((evt.target as HTMLInputElement).value);
  }

  async function addNewItem() {
    const label = (newItemLabel || '').trim();

    if (label !== '' && alreadyExists === false) {
      setCommitInProgress(true);

      const newCollectionID = crypto.randomBytes(3).toString('hex');

      await callIPC
        <{ commit: boolean, object: ConceptCollection }, { success: true }>
        ('model-collections-create-one', {
          object: { id: newCollectionID, label, items: [] },
          commit: true,
        });

      setNewItemLabel('');
      setCommitInProgress(false);
      toggleAddingLink(false);
    }
  }


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
      secondaryLabel: hasItems ? <Tag>{itemCount}</Tag> : undefined,
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
                  disabled={newItemLabel.trim() === ''}
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