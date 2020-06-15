import React, { useContext } from 'react';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { app } from 'renderer';
import { Review } from 'models/reviews';
import { ConceptContext, ReviewContext } from '../contexts';
import { PanelConfig } from '../panel-config';
import { ReviewList } from '../reviews';


const Panel: React.FC<{}> = function () {
  const ctx = useContext(ConceptContext);
  const lang = useContext(LangConfigContext);
  const reviewCtx = useContext(ReviewContext);
  const reviews = app.useMany<Review, { query: { completed: boolean, objectType: 'concepts', objectIDs: string[] }}>
  ('reviews', { query: {
    objectType: 'concepts',
    completed: false,
    objectIDs: ctx.ref
      ? Object.keys(lang.available).map(langID => `${ctx.ref}_${langID}`)
      : [] }});

  return (
    <ReviewList
      reviews={reviews.objects}
      selected={reviewCtx.reviewID}
      onSelect={(id) => reviewCtx.selectReviewID(id)} />
  );
};


export default {
  Contents: Panel,
  title: "Pending reviews",
} as PanelConfig;
