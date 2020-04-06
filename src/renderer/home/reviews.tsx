import React, { useContext } from 'react';
import { Icon, IconName, ITreeNode, Tree } from '@blueprintjs/core';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { Review } from 'models/reviews';
import styles from './styles.scss';


export const ReviewIcon: React.FC<{ review: Review }> = function ({ review }) {
  let icon: IconName;
  if (review.approved === undefined) {
    icon = 'issue';
  } else if (review.approved === true) {
    icon = 'tick-circle';
  } else {
    icon = 'cross';
  }
  return <Icon
    htmlTitle={`Review ${review.approved !== undefined ? 'had been completed' : 'is pending'}`}
    intent={review.approved === false ? 'danger' : undefined}
    icon={icon}
  />;
}


export const ReviewList: React.FC<{ reviews: Record<string, Review>, selected: string | null, onSelect?: (id: string) => void }> =
function ({ reviews, selected, onSelect }) {
  const lang = useContext(LangConfigContext);

  function getLanguageLabel(reviewID: string) {
    return lang.available[reviewID.split('-')[1].split('_')[1]];
  }

  const reviewNodes: ITreeNode[] = Object.values(reviews).map(r => ({
    id: r.id,
    icon: <ReviewIcon review={r} />,

    label: getLanguageLabel(r.id),

    secondaryLabel: r.id.split('-')[2],
    // Revision hash

    className: styles.reviewNode,
    nodeData: { reviewID: r.id },
    isSelected: selected === r.id,
  }));

  function handleNodeClick(node: ITreeNode) {
    // TODO: Replace with revision selection logic
    const nodeData = node?.nodeData as { reviewID: string } | undefined;
    const revID = nodeData?.reviewID;
    if (revID) {
      onSelect ? onSelect(revID) : void 0;
    }
  }

  return <Tree contents={reviewNodes} onNodeClick={onSelect ? handleNodeClick : undefined} />;
}