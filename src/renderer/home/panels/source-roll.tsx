import React, { useContext } from 'react';

import { LangConfigContext } from '@riboseinc/coulomb/localizer/renderer/context';

import { availableLanguages } from 'app';
import { MultiLanguageConcept } from 'models/concepts';
import { PanelConfig } from '../panel-config';
import { SourceContext } from '../contexts';
import { ConceptList, refToString } from '../concepts';

import sharedStyles from '../styles.scss';


const SourceRollTitle: React.FC<{}> = function () {
  const src = useContext(SourceContext).active;

  let sourceName: string | null;
  if (src.type === 'catalog-preset') {
    if (src.presetName === 'all') {
      sourceName = "All concepts";
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
  const concepts = source.objects;

  return (
    <ConceptList
      lang={lang}
      itemHeight={24}
      buttonProps={{ small: true }}
      concepts={concepts}
      itemMarker={(c: MultiLanguageConcept<any>) =>
        <span className={sharedStyles.conceptID}>{refToString(c.termid)}</span>}
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