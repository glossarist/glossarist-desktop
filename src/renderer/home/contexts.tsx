import React, { useContext } from 'react';

import { MultiLanguageConcept, ConceptRef, Concept, ConceptRelation, IncomingConceptRelation, WithRevisions } from '../../models/concepts';
import { ObjectSource } from '../../app';
import { useIPCValue } from 'coulomb/ipc/renderer';


export const ReviewContext =
  React.createContext<{ reviewID: string | null, selectReviewID: (id: string | null) => void }>
  ({ reviewID: null, selectReviewID: () => {}})


export const ModuleContext =
  React.createContext<{ opts: any, setOpts: (opts: any) => void }>
  ({ opts: {}, setOpts: () => {} });


export interface TextSearchContextSpec {
  query: string
  setQuery: (newQuery: string) => void
}
export const TextSearchContext = React.createContext<TextSearchContextSpec>({
  query: '',
  setQuery: () => {}
});


export interface ObjectSourceContextSpec {
  active: ObjectSource
  isLoading: boolean
  refs: ConceptRef[]
  objects: MultiLanguageConcept<any>[]
  index: { [ref: number]: MultiLanguageConcept<any> }
  select: (source: ObjectSource) => void
}
export const SourceContext = React.createContext<ObjectSourceContextSpec>({
  active: { type: 'catalog-preset', presetName: 'all' },
  isLoading: false,
  objects: [],
  index: {},
  refs: [],
  select: () => {},
});


export type MaybeActiveConcept = MultiLanguageConcept<any> | null;
export type MaybeActiveLocalizedConcept = WithRevisions<Concept<any, any>> | null | undefined;
// `null` means not yet localized into `lang.selected`, `undefined` means probably still loading.

export interface ConceptContextSpec {
  isLoading: boolean

  active: MaybeActiveConcept
  activeLocalized: MaybeActiveLocalizedConcept

  ref: ConceptRef | null
  select: (ref: ConceptRef | null) => void

  highlightedRefs: ConceptRef[]
  highlightRef: (ref: ConceptRef) => void
  unhighlightRef: (ref: ConceptRef) => void
  highlightOne: (ref: ConceptRef) => void

  revisionID: null | string
  revision: Concept<any, any> | null
  selectRevision: (revID: string) => void
}
export const ConceptContext = React.createContext<ConceptContextSpec>({
  isLoading: false,

  active: null,
  activeLocalized: null,

  ref: null,
  select: () => {},

  highlightedRefs: [],
  highlightRef: () => {},
  unhighlightRef: () => {},
  highlightOne: () => {},

  revisionID: null,
  revision: null,
  selectRevision: () => {},
})


interface ConceptRelationshipsContextSpec {
  linksTo: ConceptRelation[]
  linkedFrom: IncomingConceptRelation[]
}
export const ConceptRelationshipsContext = React.createContext<ConceptRelationshipsContextSpec>({
  linksTo: [],
  linkedFrom: [],
});

export const ConceptRelationshipsContextProvider: React.FC<{}> = function ({ children }) {
  const ctx = useContext(ConceptContext);

  const linksTo = ctx.active?.relations || [];
  const _linkedFrom = useIPCValue
    <{ objID: ConceptRef | null }, { relations: IncomingConceptRelation[] }>
    ('model-concepts-find-incoming-relations', { relations: [] }, { objID: ctx.ref });
  const linkedFrom = _linkedFrom.isUpdating ? [] : _linkedFrom.value.relations;

  return (
    <ConceptRelationshipsContext.Provider value={{ linksTo, linkedFrom }}>
      {children}
    </ConceptRelationshipsContext.Provider>
  );
};