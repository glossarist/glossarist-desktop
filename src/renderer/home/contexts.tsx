import React, { useContext } from 'react';

import { MultiLanguageConcept, ConceptRef, Concept, ConceptRelation, IncomingConceptRelation } from '../../models/concepts';
import { ObjectSource } from '../../app';
import { useIPCValue } from 'coulomb/ipc/renderer';


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
  select: (source: ObjectSource) => void
}
export const SourceContext = React.createContext<ObjectSourceContextSpec>({
  active: { type: 'catalog-preset', presetName: 'all' },
  isLoading: false,
  objects: [],
  refs: [],
  select: () => {},
});


export type MaybeActiveConcept = MultiLanguageConcept<any> | null;
export type MaybeActiveLocalizedConcept = Concept<any, any> | null | undefined;
// `null` means not yet localized into `lang.selected`, `undefined` means probably still loading.

export interface ConceptContextSpec {
  active: MaybeActiveConcept
  activeLocalized: MaybeActiveLocalizedConcept
  isLoading: boolean
  ref: ConceptRef | null
  select: (ref: ConceptRef | null) => void
}
export const ConceptContext = React.createContext<ConceptContextSpec>({
  active: null,
  activeLocalized: null,
  isLoading: false,
  ref: null,
  select: () => {},
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