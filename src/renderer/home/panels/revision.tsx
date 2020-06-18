import moment from 'moment';
import React, { useContext, useState } from 'react';
import { Icon, FormGroup, InputGroup, Button, Intent } from '@blueprintjs/core';
import { callIPC } from 'coulomb/ipc/renderer';
import { app } from 'renderer';
import { ConceptContext } from '../contexts';
import { PanelConfig } from '../panel-config';
import { ReviewIcon } from '../reviews';
import { CommitterPic } from '../widgets';
import { Review } from 'models/reviews';


const Panel: React.FC<{}> = function () {
  const ctx = useContext(ConceptContext)

  const entry = ctx.activeLocalized;
  const selectedRevisionID = ctx.revisionID;

  if (!entry || !selectedRevisionID) {
    return null;
  }

  const revision = entry._revisions.tree[selectedRevisionID];

  if (!revision) {
    console.error("Revision missing—probably on-the-fly migration")
    return null;
  }

  const reviewObjectID = `${entry.id}_${entry.language_code}`;

  let authorString: string;
  if (revision.author !== undefined) {
    authorString = `${revision.author.name} <${revision.author.email}>`;
  } else {
    authorString = "(not recorded)"
  }

  return (
    <>
      <FormGroup label="Author" inline>
        <InputGroup
          disabled
          type="text"
          value={authorString}
          leftElement={revision.author !== undefined
            ? <CommitterPic email={revision.author.email} />
            : undefined} />
      </FormGroup>
      <FormGroup label="Time" inline>
        <InputGroup readOnly type="text" defaultValue={moment(revision.timeCreated).toLocaleString()} />
      </FormGroup>
      <FormGroup label="Review" inline>
        <ReviewStatus objectType="concepts" objectID={reviewObjectID} revisionID={selectedRevisionID} />
      </FormGroup>
    </>
  );
};


const PanelTitleSecondary: React.FC<{ isCollapsed?: boolean }> = function ({ isCollapsed }) {
  const ctx = useContext(ConceptContext);
  return <div>ID: {`${ctx.revisionID}`}</div>;
}


export default {
  Contents: Panel,
  title: "Selected revision",
  TitleComponentSecondary: PanelTitleSecondary,
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

  let icon: JSX.Element;
  let reviewStatusText: string;
  let canRequestReview: boolean;
  let intent: Intent | undefined;

  if (review) {
    reviewStatusText = `${review.approved !== undefined ? 'Completed' : 'Pending'}`;
    canRequestReview = false;
    intent = undefined;
    icon = <ReviewIcon review={review} htmlTitle={reviewStatusText} />;
  } else {
    reviewStatusText = "Request"
    canRequestReview = true;
    intent = "primary";
    icon = <Icon htmlTitle={reviewStatusText} icon="confirm" />;
  }

  return <Button
      onClick={requestReview}
      icon={icon}
      intent={intent}
      loading={requestInProgress}
      disabled={!canRequestReview}>
    {reviewStatusText}
  </Button>;
};