import React, { useContext } from 'react';
import { SourceContext } from '../contexts';
import { ITreeNode, Tree } from '@blueprintjs/core';
import { PanelConfig } from '../panel-config';


type NodeData = { presetName: string };

const Panel: React.FC<{}> = function () {
  const source = useContext(SourceContext);
  const src = source.active;

  const treeState: ITreeNode[] = [{
    id: 'all',
    label: 'All concepts',
    isSelected: src.type === 'catalog-preset' && src.presetName === 'all',
    nodeData: { presetName: 'all' },
  }, {
    id: 'pendingReview',
    label: 'Pending review',
    isSelected: src.type === 'catalog-preset' && src.presetName === 'pendingReview',
    nodeData: { presetName: 'pendingReview' },
  }];

  function handleNodeClick(node: ITreeNode) {
    const data = node.nodeData as NodeData;
    const presetName: string = data.presetName;
    source.select({ type: 'catalog-preset', presetName });
  }

  return (
    <Tree contents={treeState} onNodeClick={handleNodeClick} />
  );
};


export default {
  Contents: Panel,
  title: "Catalog",
} as PanelConfig;