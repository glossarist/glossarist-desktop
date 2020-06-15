import moment from 'moment';
import React, { useContext, useState } from 'react';
import { Text, ITreeNode, Tree, Icon } from '@blueprintjs/core';
import { callIPC } from 'coulomb/ipc/renderer';
import { app } from 'renderer';
import { Revision, Concept } from 'models/concepts';
import { Review } from 'models/reviews';
import { ConceptContext } from '../contexts';
import { PanelConfig } from '../panel-config';
import { ReviewIcon } from '../reviews';
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
  var rev: string | null = entry._revisions.current;

  const reviewObjectID = `${entry.id}_${entry.language_code}`;

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
        <ReviewStatus
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


const ReviewStatus: React.FC<{ objectType: string, objectID: string, revisionID: string }> =
function ({ objectType, objectID, revisionID }) {
  const reviewID = `${objectType}-${objectID}-${revisionID}`
  const review = app.useOne<Review, string>('reviews', reviewID).object;
  const [requestInProgress, setRequestInProgress] = useState(false);

  const requestReview = async () => {
    if (requestInProgress) { return; }
    setRequestInProgress(true);

    try {
      await callIPC<{ commit: boolean, objectID: string, object: Review }, { success: true }>
      ('model-reviews-create-one', {
        objectID: reviewID,
        object: {
          id: reviewID,
          timeRequested: new Date(),
          objectType,
          objectID,
          revisionID,
        },
        commit: true,
      });
      setRequestInProgress(false);
    } catch (e) {
      setRequestInProgress(false);
    }
  };

  if (review) {
    return <ReviewIcon review={review} />;
  } else {
    return <Icon
      htmlTitle="Review had not been requested yet"
      color={requestInProgress ? "#cccccc" : undefined}
      onClick={requestReview}
      icon="confirm"
    />;
  }
};