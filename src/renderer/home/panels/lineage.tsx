import React, { useContext } from 'react';
import { ITreeNode, Tag, Tree } from '@blueprintjs/core';
import { ConceptContext } from '../contexts';
import { PanelConfig } from '../panel-config';


const Panel: React.FC<{}> = function () {
  // TODO: Rewrite as list of revisions, overlaid on top of a tree diagram
  // tracing revisions back to their parents and ultimately original revisions
  // (which may or may not be linked to external authoritative sources).

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
    // TODO: Replace with revision selection logic
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


export default {
  Contents: Panel,
  title: "Revisions",
} as PanelConfig;