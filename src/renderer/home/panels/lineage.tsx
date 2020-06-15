import moment from 'moment';
import React, { useContext } from 'react';
import { Text, ITreeNode, Tree, Icon } from '@blueprintjs/core';
import { Revision, Concept } from 'models/concepts';
import { app } from 'renderer';
import { ConceptContext } from '../contexts';
import { PanelConfig } from '../panel-config';
import styles from './lineage.scss';
import { ReviewIcon } from '../reviews';
import { Review } from 'models/reviews';


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

  const reviewObjectID = `${entry.id}_${entry.language_code}`;

  var revisionNodes: ITreeNode[] = [];
  var rev: string | null = entry._revisions.current;

  while (rev !== null) {
    const revData: Revision<Concept<any, any>> | undefined =
      entry._revisions.tree[rev];

    if (revData === undefined) {
      console.error("Missing revData", entry._revisions);
      break;
    }

    revisionNodes.push({
      id: rev,
      label: rev,
      className: styles.revisionNode,
      isSelected: ctx.revisionID === rev,
      icon:
        <ReviewionReviewStatusIcon
          objectType="concepts"
          objectID={reviewObjectID}
          revisionID={rev} />,
      secondaryLabel:
        <Text ellipsize className={styles.revisionNodeTimestamp}>
          {moment(revData.timeCreated).toLocaleString()}
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
} as PanelConfig;


const ReviewionReviewStatusIcon: React.FC<{ objectType: string, objectID: string, revisionID: string }> =
function ({ objectType, objectID, revisionID }) {
  const reviewID = `${objectType}-${objectID}-${revisionID}`
  const review = app.useOne<Review, string>('reviews', reviewID).object;

  if (review) {
    return <ReviewIcon review={review} />;
  } else {
    return <Icon
      htmlTitle="Review had not been requested yet"
      icon="circle"
    />;
  }
};