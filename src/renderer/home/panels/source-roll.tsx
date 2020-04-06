import React, { useContext } from 'react';

import { LangConfigContext } from 'coulomb/localizer/renderer/context';

import { availableLanguages } from 'app';
import { MultiLanguageConcept, ConceptRef } from 'models/concepts';
import { PanelConfig } from '../panel-config';
import { SourceContext, ConceptContext } from '../contexts';
import { ConceptList } from '../concepts';

import sharedStyles from '../styles.scss';


const SourceRollTitle: React.FC<{}> = function () {
  const src = useContext(SourceContext).active;

  let sourceName: string | null;
  if (src.type === 'catalog-preset') {
    if (src.presetName === 'all') {
      sourceName = "All concepts";
    } else if (src.presetName === 'pendingReview') {
      sourceName = "Pending review";
    } else {
      sourceName = src.presetName;
    }
  } else if (src.type === 'collection') {
    sourceName = "Collection";
  } else {
    sourceName = null;
  }
  return <>{sourceName}</>;
};


const SourceRoll: React.FC<{ lang: keyof typeof availableLanguages }> = function ({ lang }) {
  const source = useContext(SourceContext);
  const concept = useContext(ConceptContext);
  const concepts = source.objects;

  return (
    <ConceptList
      lang={lang}
      itemHeight={24}
      buttonProps={{ small: true }}
      concepts={concepts}
      itemMarker={(c: MultiLanguageConcept<any>) =>
        <span className={sharedStyles.conceptID}>{c.termid}</span>}
      isItemSelected={(ref: ConceptRef) => concept.ref === ref}
      onItemSelect={(ref: ConceptRef) => concept.select(ref)}
    />
  );
};


const PossiblyTranslatedSourceRoll: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);
  return <SourceRoll lang={lang.selected as keyof typeof availableLanguages} />;
};


const AuthoritativeLanguageSourceRoll: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);
  return <SourceRoll lang={lang.default as keyof typeof availableLanguages} />;
};


export const translated = {
  Contents: PossiblyTranslatedSourceRoll,
  className: sharedStyles.sourceRollPanel,
  title: "Source",
  Title: SourceRollTitle,
} as PanelConfig;


export const authoritative = {
  Contents: AuthoritativeLanguageSourceRoll,
  className: sharedStyles.sourceRollPanel,
  title: "Source",
  Title: SourceRollTitle,
} as PanelConfig;