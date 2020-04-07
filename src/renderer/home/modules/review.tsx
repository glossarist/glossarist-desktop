import moment from 'moment';
import React, { useContext, useState, useEffect } from 'react';
import VisualDiff from 'react-visual-diff';

import { InputGroup, NonIdealState, ButtonGroup, Button, Icon, FormGroup, Callout, HTMLSelect } from '@blueprintjs/core';
import { useIPCValue, callIPC } from 'coulomb/ipc/renderer';
import { Concept, Revision, SupportedLanguages, LIFECYCLE_STAGES, LifecycleStage } from 'models/concepts';
import { app } from 'renderer';
import { Review } from 'models/reviews';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import * as panels from '../panels';
import { ModuleConfig } from '../module-config';
import { ReviewContext, ConceptContext, SourceContext } from '../contexts';
import { EntryDetails } from '../concepts';
import sharedStyles from '../styles.scss';
import styles from './review.scss';
import { PanelConfig } from '../panel-config';
import { ReviewList } from '../reviews';


type ConceptRevision = Revision<Concept<any, any>>;

const MainView: React.FC<{}> = function () {
  const source = useContext(SourceContext);
  const ctx = useContext(ConceptContext);
  const lang = useContext(LangConfigContext);
  const reviewCtx = useContext(ReviewContext);
  const review = app.useOne<Review, string>('reviews', reviewCtx.reviewID).object;

  const [reviewed, setReviewed] = useState(false);

  const [lifecycleStage, setLifecycleStage] = useState<LifecycleStage | undefined>(undefined);

  const reviewMaterial = useIPCValue
  <{ reviewID: string | null }, { toReview?: ConceptRevision, revisionID?: string }>
  ('model-reviews-get-review-material', {}, { reviewID: reviewCtx.reviewID }).value;

  const revisionToReview = reviewMaterial.toReview ? reviewMaterial.toReview.object : null;
  const revisionToCompare = ctx.revision;

  //const active = ctx.activeLocalized;

  const availableReviews = app.useMany<Review, { query: { completed: boolean, objectType: 'concepts', objectIDs: string[] }}>
  ('reviews', { query: {
    objectType: 'concepts',
    completed: false,
    objectIDs: ctx.ref
      ? Object.keys(lang.available).map(langID => `${ctx.ref}_${langID}`)
      : [] }}).objects;

  function selectComparableRevision() {
    if (ctx.activeLocalized && ctx.revisionID) {
      const rev = ctx.activeLocalized._revisions.tree[ctx.revisionID];
      if (rev && rev.parents.length > 0) {
        ctx.selectRevision(rev.parents[0]);
      }
    }
  }

  useEffect(() => {
    if (revisionToReview) {
      setLifecycleStage(revisionToReview.lifecycle_stage);
    }
  }, [JSON.stringify(revisionToReview)]);

  const availableReviewIDs = Object.keys(availableReviews);
  useEffect(() => {
    if (availableReviewIDs.length < 1) {
      reviewCtx.selectReviewID(null);
    } else {
      reviewCtx.selectReviewID(availableReviewIDs[0]);
      selectComparableRevision();
    }
  }, [JSON.stringify(availableReviews), ctx.ref]);

  useEffect(() => {
    if (reviewCtx.reviewID !== null) {
      lang.select(reviewCtx.reviewID.split('-')[1].split('_')[1]);
      selectComparableRevision();
    }
  }, [reviewCtx.reviewID]);

  async function applyDecision(approved: boolean) {
    const reviewID = reviewCtx.reviewID;
    if (reviewed || !ctx.active || !reviewID || !review || !revisionToReview || !reviewMaterial.toReview || !reviewMaterial.revisionID) {
      console.error("Unable to apply decision: something is missing")
      return;
    }

    try {
      await callIPC<{ commit: boolean, objectID: string, object: Review }, { success: true }>
      ('model-reviews-update-one', {
        objectID: reviewID,
        object: { ...review, timeCompleted: new Date(), approved },
        commit: true,
      });

      await callIPC<{ data: Concept<any, any>, objID: number, lang: string, parentRevision: string }, { newRevisionID: string }>
      ('model-concepts-create-revision', {
        objID: ctx.active.termid,
        data: { ...revisionToReview, lifecycle_stage: lifecycleStage },
        lang: revisionToReview.language_code,
        parentRevision: reviewMaterial.revisionID,
      });

      setReviewed(true);
    } catch (e) {
      console.error("Error applying review decision or lifecycle stage");
    }
  }
  async function handleAccept() {
    await applyDecision(true);
  }
  async function handleReject() {
    await applyDecision(false);
  }

  if (review === null) {
    return <NonIdealState
      title="No review is selected"
      description={source.active.type !== 'catalog-preset' || source.active.presetName !== 'pendingReview' ? <>
        <Callout intent="primary">
          <a onClick={() => source.select({ type: 'catalog-preset', presetName: 'pendingReview' })}>
            Browse “Pending Review”
          </a>
          <br />
          to only see items requiring review.
        </Callout>
      </> : undefined}
    />;
  } else if (revisionToReview === null) {
    return <NonIdealState
      title="No review material to show"
      description="If you’re still reading, it looks like review material failed to load due to an error. Apologies." />;
  }

  let material: JSX.Element;

  const toReview = <EntryDetails entry={revisionToReview} />;

  if (revisionToCompare) {
    const toCompare = <EntryDetails entry={revisionToCompare} />;
    material = <VisualDiff left={toCompare} right={toReview} />
  } else {
    material = toReview;
  }

  return (
    <div className={sharedStyles.backdrop}>
      <div className={styles.reviewForm}>
        <div className={sharedStyles.moduleViewToolbarInner}>
          <ButtonGroup fill>
            <HTMLSelect
                disabled={reviewed || review.approved !== undefined}
                value={lifecycleStage}
                onChange={(evt: React.FormEvent<HTMLSelectElement>) =>
                  setLifecycleStage(evt.currentTarget.value as LifecycleStage)}>
              {LIFECYCLE_STAGES.map(ls => <option value={ls}>{ls}</option>)}
            </HTMLSelect>
            <Button
              disabled={reviewed || review.approved !== undefined}
              icon="tick-circle" onClick={handleReject}>Reject</Button>
            <Button
              disabled={reviewed || review.approved !== undefined}
              icon="cross" onClick={handleAccept}>Accept</Button>
          </ButtonGroup>
        </div>
        {material}
      </div>
    </div>
  );
};


const completedReviews: PanelConfig = {
  title: "Review history",
  Contents: () => {
    const ctx = useContext(ConceptContext);
    const lang = useContext(LangConfigContext);
  const reviewCtx = useContext(ReviewContext);
    const reviews = app.useMany<Review, { query: { completed: boolean, objectType: 'concepts', objectIDs: string[] }}>
    ('reviews', { query: {
      objectType: 'concepts',
      completed: true,
      objectIDs: ctx.ref
        ? Object.keys(lang.available).map(langID => `${ctx.ref}_${langID}`)
        : [] }});

    return (
      <ReviewList
        reviews={reviews.objects}
        selected={reviewCtx.reviewID}
        onSelect={(id) => reviewCtx.selectReviewID(id)} />
    );
  },
}


const reviewDetails: PanelConfig = {
  title: "Review details",
  Contents: () => {
    const ctx = useContext(ConceptContext);
    const reviewCtx = useContext(ReviewContext);
    const review = app.useOne<Review, string>('reviews', reviewCtx.reviewID).object;
    const reviewMaterial = useIPCValue
    <{ reviewID: string | null }, { toReview?: ConceptRevision, revisionID?: string }>
    ('model-reviews-get-review-material', {}, { reviewID: reviewCtx.reviewID }).value;
    const lang = useContext(LangConfigContext);

    if (!reviewMaterial.revisionID || !reviewMaterial.toReview || !review) {
      return null;
    }

    return (
      <>
        <FormGroup label="Review of">
          <InputGroup readOnly defaultValue={`#${ctx.ref} rev. ${reviewMaterial.revisionID}`} />
        </FormGroup>

        <FormGroup label="Requested">
          <InputGroup readOnly defaultValue={moment(review.timeRequested).toLocaleString()} />
        </FormGroup>

        {ctx.revisionID !== reviewMaterial.revisionID
          ? <FormGroup label="Comparing with">
              <InputGroup readOnly defaultValue={`rev. ${ctx.revisionID} (${lang.available[lang.selected]})`} />
            </FormGroup>
          : null}

        {review.timeCompleted
          ? <FormGroup inline label="Completed">
              <InputGroup readOnly defaultValue={moment(review.timeCompleted).toLocaleString()} />
            </FormGroup>
          : null}

        {review.approved !== undefined
          ? <FormGroup inline label="Decision">
              <InputGroup readOnly defaultValue={review.approved ? 'APPROVE' : 'REJECT'} />
            </FormGroup>
          : null}
      </>
    );
  },
};


export default {
  hotkey: 'r',
  title: "Review",

  leftSidebar: [
    panels.system,
    panels.sourceRollAuthoritative,
    panels.reviews,
    completedReviews,
    panels.databases,
  ],

  MainView: MainView,
  mainToolbar: [],

  rightSidebar: [
    reviewDetails,
    { className: styles.reviewTargetsPanelSeparator,
      Contents: () => <span><Icon icon="chevron-down" />{" "}Comparison target</span>,
      collapsed: 'never' },
    { ...panels.languages, collapsed: 'by-default' },
    panels.lineage,
  ],
} as ModuleConfig;