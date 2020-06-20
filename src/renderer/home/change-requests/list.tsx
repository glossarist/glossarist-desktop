import moment from 'moment';
import React, { useContext, useEffect, useRef } from 'react';
import { Text, Tree, ITreeNode, IconName, Icon } from '@blueprintjs/core';
import { app } from 'renderer';
import { ChangeRequest, LIFECYCLE_STAGES_IN_REVIEW } from 'models/change-requests';
import { SourceContext, ChangeRequestContext } from '../contexts';
import sharedStyles from '../styles.scss';
import { CommitterPic } from '../widgets';


interface ChangeRequestListProps {
  submitted: boolean
  resolved?: boolean 
  createdBy?: string
}
export const ChangeRequestList: React.FC<ChangeRequestListProps> =
function ({ submitted, resolved, createdBy }) {
  const source = useContext(SourceContext);
  const crCtx = useContext(ChangeRequestContext);

  const crs = app.useMany<ChangeRequest>
  ('changeRequests', { query: { submitted, resolved, creatorEmail: createdBy } }).
  objects;

  const treeRef = useRef<Tree>(null);

  useEffect(() => {
    setTimeout(() => {
      if (treeRef.current && source.active.type === 'collection') {
        const currentNode = treeRef.current.getNodeContentElement(source.active.collectionID);
        currentNode?.scrollIntoViewIfNeeded();
      }
    }, 500);
  }, []);

  function crToNode([_, cr]: [string, ChangeRequest]): ITreeNode {
    let icon: IconName;
    if (cr.meta.registry.stage === 'Draft') {
      icon = 'edit';
    } else if ((LIFECYCLE_STAGES_IN_REVIEW as string[]).indexOf(cr.meta.registry.stage) >= 0) {
      icon = 'take-action';
    } else {
      icon = 'tick-circle';
    }
    return {
      id: cr.id,
      label: cr.id,
      isSelected: crCtx.selected === cr.id,
      className: sharedStyles.treeNodeWithTimestamp,
      icon: <>
        <Icon icon={icon} />
        <CommitterPic email={cr.author.email} />
      </>,
      secondaryLabel:
        <Text ellipsize className={sharedStyles.treeNodeTimestamp}>
          {moment(cr.timeCreated).toLocaleString()}
        </Text>,
      nodeData: { crID: cr.id },
    }
  }

  function handleNodeClick(node: ITreeNode) {
    const data = node.nodeData as { crID: string };
    crCtx.select(data.crID);
  }

  const treeState: ITreeNode[] = [...Object.entries(crs)].
  map(crToNode);

  return (
    <>
      <Tree
        ref={treeRef}
        contents={treeState}
        onNodeClick={handleNodeClick}
      />
    </>
  );
};
