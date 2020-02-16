import React from 'react';

import { MultiLanguageConcept, ConceptRef, Concept } from '../../models/concepts';
import { ObjectSource } from '../../app';


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
