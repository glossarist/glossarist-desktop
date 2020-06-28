import update from 'immutability-helper';
import React, { useState, useContext, useMemo, useEffect } from 'react';
import MathJax from 'react-mathjax2';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { ObjectSource, availableLanguages } from 'app';
import { MultiLanguageConcept, ConceptRef, ConceptCollection } from 'models/concepts';
import { app } from 'renderer';
import {
  ConceptContext, SourceContext,
  ObjectQueryContext, ChangeRequestContext, DocsContext,
} from './contexts';
import { ModuleConfig } from './module-config';
import { Sidebar } from './module-sidebar';
import { Query as ConceptQuery } from 'main/concept-manager'
import styles from './styles.scss';
import { openHelpPage } from 'renderer/help';


type ModuleProps = Omit<Omit<ModuleConfig, 'title'>, 'hotkey'>;
export const Module: React.FC<ModuleProps> = function ({ leftSidebar, rightSidebar, MainView, mainToolbar }) {
  const lang = useContext(LangConfigContext);

  const [selectedConceptRef, selectConceptRef] = useState<ConceptRef | null>(null);
  const [selectedCRID, selectCRID] = useState<string | null>(null);

  const docs = useContext(DocsContext);

  // NOTE: CR item here is specific to single-registry concepts, with languages as subkeys.
  // TODO: Once MLGT is migrated to subregistries, CR item must specify registry (subregistry?), item type, and item ID.
  const [selectedCRItem, selectCRItem] = useState<string | null>(null);
  const [highlightedConceptRefs, updateHighlightedConceptRefs] = useState<ConceptRef[]>([]);
  const [selectedRevisionID, selectRevisionID] = useState(null as null | string);

  const DEFAULT_SOURCE = { type: 'catalog-preset', presetName: 'all' } as const;
  const [query, setQuery] = useState<ConceptQuery>({ inSource: DEFAULT_SOURCE });

  const _concepts = app.useMany
  <MultiLanguageConcept<any>, { query: ConceptQuery }>
  ('concepts', { query });
  const concepts = {
    ids: app.useIDs<number, { query: { inSource: ObjectSource }}>
      ('concepts', { query: { inSource: query.inSource || DEFAULT_SOURCE } }).ids,
    objects: Object.values(_concepts.objects).sort((a, b) => a.termid - b.termid),
  };

  const _collections = app.useMany<ConceptCollection, {}>
  ('collections', {});
  const collections = {
    objects: Object.values(_collections.objects).
      sort((a, b) => a.label.localeCompare(b.label)).
      map(c => update(c, { $unset: ['items' ]})),
  };

  useEffect(() => {
    if (localizedConcept !== undefined && localizedConcept !== null) {
      if (selectedRevisionID === null) {
        selectRevisionID(localizedConcept._revisions.current || null);
      } else if (localizedConcept._revisions.tree[selectedRevisionID] === undefined) {
        selectRevisionID(localizedConcept._revisions.current || null);
      }
      //selectReviewID(null);
    }
  }, [lang.selected, selectedConceptRef]);

  useEffect(() => {
    if (localizedConcept !== undefined && localizedConcept !== null) {
      if (selectedRevisionID === null) {
        selectRevisionID(localizedConcept._revisions.current);
      }
    }
  }, [selectedRevisionID]);

  useEffect(() => {
    function handleReadMore(e: KeyboardEvent) {
      e.preventDefault();
      if (docs.hoveredItem?.readMoreURL) {
        openHelpPage(docs.hoveredItem?.readMoreURL);
      } else {
        console.error("Nothing to open");
      }
      return false;
    }
    Mousetrap.bind('f1', handleReadMore);
  }, [docs.hoveredItem]);


  // Hotkey navigation up/down concept roll
  const currentIndex = useMemo(() => (
    concepts.objects.findIndex((c) => c.termid === selectedConceptRef)
  ), [JSON.stringify(concepts.ids), JSON.stringify(query), selectedConceptRef]);

  useEffect(() => {
    function selectNext() {
      const ref = getNextRef(currentIndex);
      if (ref) { selectConceptRef(ref); updateHighlightedConceptRefs([ ref ]); }
    }
    function selectPrevious() {
      const ref = getPreviousRef(currentIndex);
      if (ref) { selectConceptRef(ref); updateHighlightedConceptRefs([ ref ]); }
    }
    function getNextRef(idx?: number): ConceptRef | undefined {
      if (idx !== undefined && concepts.objects[idx + 1]) {
        return concepts.objects[idx + 1].termid;
      }
      return undefined;
    }
    function getPreviousRef(idx?: number): ConceptRef | undefined  {
      if (idx !== undefined && idx >= 1 && concepts.objects[idx - 1]) {
        return concepts.objects[idx - 1].termid;
      }
      return undefined;
    }

    Mousetrap.bind('j', selectNext);
    Mousetrap.bind('k', selectPrevious);

    return function cleanup() {
      Mousetrap.unbind('j');
      Mousetrap.unbind('k');
    };
  }, [currentIndex]);

  const concept = selectedConceptRef
    ? (_concepts.objects[selectedConceptRef] || null)
    : null; 
  const localizedConcept = concept
    ? (concept[lang.selected as keyof typeof availableLanguages] || null)
    : undefined;
  const revision = localizedConcept && selectedRevisionID
    ? (localizedConcept._revisions.tree[selectedRevisionID]?.object || null)
    : null;

  return (
    <ChangeRequestContext.Provider
      value={{
        selected: selectedCRID,
        select: selectCRID,
        selectedItem: selectedCRItem,
        selectItem: selectCRItem,
      }}>
    <MathJax.Context
        options={{
          asciimath2jax: {
            useMathMLspacing: true,
            delimiters: [["$$","$$"]],
            preview: "none",
          },
        }}
        script={`file://${__static}/math/MathJax.js?config=AM_HTMLorMML`}>

    <ConceptContext.Provider
        value={{
          active: concept,
          isLoading: _concepts.isUpdating,
          activeLocalized: localizedConcept,

          ref: selectedConceptRef,
          select: selectConceptRef,

          highlightedRefs: highlightedConceptRefs,
          highlightRef: (ref: ConceptRef) =>
            updateHighlightedConceptRefs((refs) => {
              const idx = refs.indexOf(ref);
              if (idx < 0) {
                return [ ...refs, ref ];
              }
              return refs;
            }),
          unhighlightRef: (ref: ConceptRef) =>
            updateHighlightedConceptRefs((refs) => {
              const idx = refs.indexOf(ref);
              if (idx >= 0) {
                update(refs, { $splice: [[ idx, 1 ]] });
              }
              return refs;
            }),
          highlightOne: (ref: ConceptRef) =>
            updateHighlightedConceptRefs([ ref ]),

          revisionID: selectedRevisionID,
          revision,
          selectRevision: selectRevisionID,
        }}>
      <SourceContext.Provider
          value={{
            isLoading: _concepts.isUpdating,

            active: query.inSource || DEFAULT_SOURCE,
            collections: collections.objects,
            select: (source: ObjectSource) => setQuery(q => update(q, { inSource: { $set: source } })),

            refs: concepts.ids,
            index: _concepts.objects,
            objects: concepts.objects,
          }}>
        <ObjectQueryContext.Provider value={{ query, setQuery }}>

          <div className={styles.moduleView}>
            {leftSidebar.length > 0
              ? <Sidebar key="left" position="left" panelSet={leftSidebar} />
              : null}

            <div key="main" className={styles.moduleMainView}>
              <MainView />

              <div className={styles.moduleToolbar}>
                {[...mainToolbar.entries()].map(([idx, El]) => <El key={idx} />)}
              </div>
            </div>

            {rightSidebar.length > 0
              ? <Sidebar key="right" position="right" panelSet={rightSidebar} />
              : null}
          </div>

        </ObjectQueryContext.Provider>
      </SourceContext.Provider>
    </ConceptContext.Provider>
    </MathJax.Context>
    </ChangeRequestContext.Provider>
  );
};
