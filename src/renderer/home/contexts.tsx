import React, { useContext } from 'react';

import {
  MultiLanguageConcept, ConceptRef, Concept, ConceptRelation,
  IncomingConceptRelation, ConceptCollection,
} from '../../models/concepts';

import { WithRevisions } from 'models/revisions';
import { ObjectSource } from '../../app';
import { useIPCValue } from 'coulomb/ipc/renderer';
import { Query } from 'main/concept-manager';


export const ReviewContext =
  React.createContext<{ reviewID: string | null, selectReviewID: (id: string | null) => void }>
  ({ reviewID: null, selectReviewID: () => {}});


interface ChangeRequestContextSpec {
  selected: string | null
  select: (id: string | null) => void
  selectedItem: string | null
  selectItem: (id: string | null) => void
}
export const ChangeRequestContext =
  React.createContext<ChangeRequestContextSpec>
  ({ selected: null, select: () => {}, selectedItem: null, selectItem: () => {} });


export const ModuleContext =
  React.createContext<{ opts: any, setOpts: (opts: any) => void }>
  ({ opts: {}, setOpts: () => {} });


export interface ObjectQueryContextSpec {
  query: Query
  setQuery: (newQuery: Query) => void
}
export const ObjectQueryContext = React.createContext<ObjectQueryContextSpec>({
  query: {},
  setQuery: () => {}
});


export interface ObjectSourceContextSpec {
  isLoading: boolean

  active: ObjectSource
  select: (source: ObjectSource) => void
  collections: Exclude<ConceptCollection, 'items'>[]

  refs: ConceptRef[]
  index: { [ref: number]: MultiLanguageConcept<any> }
  objects: MultiLanguageConcept<any>[]
}
export const SourceContext = React.createContext<ObjectSourceContextSpec>({
  isLoading: false,

  active: { type: 'catalog-preset', presetName: 'all' },
  select: () => {},
  collections: [],

  refs: [],
  index: {},
  objects: [],
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
});


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