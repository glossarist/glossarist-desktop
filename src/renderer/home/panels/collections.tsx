import React, { useContext, useRef, useEffect } from 'react';
import { Tree, ITreeNode, Tag, Button } from '@blueprintjs/core';
import { ConceptCollection } from 'models/concepts';
import { app } from 'renderer';
import { SourceContext } from '../contexts';
import { PanelConfig } from '../panel-config';


const Panel: React.FC<{}> = function () {
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
    <Tree
      ref={treeRef}
      contents={treeState}
      onNodeClick={handleNodeClick}
    />
  );
};


const AddCollection: React.FC<{}> = function () {
  return <Button icon="add" title="Add collection" disabled={true} />;
};


export default {
  Contents: Panel,
  title: "Collections",
  actions: [AddCollection],
} as PanelConfig;