import moment from 'moment';
import React, { useContext } from 'react';
import { Text, ITreeNode, Tree, NonIdealState } from '@blueprintjs/core';
import { Concept } from 'models/concepts';
import { Revision } from 'models/revisions';
import { ConceptContext } from '../contexts';
import { PanelConfig } from '../panel-config';
import sharedStyles from '../styles.scss';
import styles from './lineage.scss';


type RevisionNodeData = {
  id: string
  parents: string[]
}


const Panel: React.FC<{}> = function () {
  const ctx = useContext(ConceptContext)
  const entry = ctx.activeLocalized;

  if (!entry) {
    return null;
  }

  var revisionNodes: ITreeNode[] = [];
  var rev: string | null = entry._revisions?.current;

  if (!entry._revisions || !rev) {
    return <NonIdealState description="This item is not under revision management." />;
  }

  while (rev !== null) {
    const revData: Revision<Concept<any, any>> | undefined =
      entry._revisions?.tree[rev] || undefined;

    if (revData === undefined) {
      console.error("Missing revData", entry._revisions);
      break;
    }

    revisionNodes.push({
      id: rev,
      label: rev,
      className: styles.revisionNode,
      isSelected: ctx.revisionID === rev,
      secondaryLabel:
        <Text ellipsize className={sharedStyles.treeNodeTimestamp}>
          {moment(revData.timeCreated).format('D/M/YY')}
        </Text>,
      nodeData: {
        id: rev,
        parents: revData.parents,
      },
    });

    rev = revData.parents[0] || null;
  }

  function handleNodeClick(node: ITreeNode) {
    // TODO: Replace with revision selection logic
    const nodeData = node?.nodeData as RevisionNodeData | undefined;
    const revID = nodeData?.id;
    if (revID) {
      ctx.selectRevision(revID);
    }
  }

  return (
    <Tree contents={revisionNodes} onNodeClick={handleNodeClick} />
  );
};


export default {
  Contents: Panel,
  title: "Revisions",
  helpResourceID: 'revisions',
} as PanelConfig;