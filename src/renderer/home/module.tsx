import update from 'immutability-helper';
import React, { useState, useContext, useMemo, useEffect } from 'react';
import MathJax from 'react-mathjax2';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { ObjectSource, availableLanguages } from 'app';
import { MultiLanguageConcept, ConceptRef, ConceptCollection } from 'models/concepts';
import { app } from 'renderer';
import { ConceptContext, SourceContext, TextSearchContext, ReviewContext } from './contexts';
import { ModuleConfig } from './module-config';
import { Sidebar } from './module-sidebar';
import styles from './styles.scss';


type ModuleProps = Omit<Omit<ModuleConfig, 'title'>, 'hotkey'>;
export const Module: React.FC<ModuleProps> = function ({ leftSidebar, rightSidebar, MainView, mainToolbar }) {
  const lang = useContext(LangConfigContext);

  const [selectedConceptRef, selectConceptRef] = useState(null as null | ConceptRef);

  const [highlightedConceptRefs, updateHighlightedConceptRefs] = useState<ConceptRef[]>([]);

  const [selectedRevisionID, selectRevisionID] = useState(null as null | string);
  const [activeSource, selectSource] = useState({ type: 'catalog-preset', presetName: 'all' } as ObjectSource);
  const [textQuery, setTextQuery] = useState('' as string);
  const [selectedReviewID, selectReviewID] = useState<string | null>(null);

  const _concepts = app.useMany<MultiLanguageConcept<any>, { query: { inSource: ObjectSource, matchingText?: string }}>
  ('concepts', { query: { inSource: activeSource, matchingText: textQuery }});
  const concepts = {
    ids: app.useIDs<number, { query: { inSource: ObjectSource }}>
      ('concepts', { query: { inSource: activeSource }}).ids,
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

  // One-off collection migration call
  //const collectionsMigrated = useRef({ yes: false });
  //useEffect(() => {
  //  if (concepts.ids.length > 0 && collectionsMigrated.current.yes !== true) {
  //    callIPC('initialize-standards-collections');
  //    collectionsMigrated.current.yes = true;
  //  }
  //}, [concepts.ids.length]);


  // Hotkey navigation up/down concept roll
  const currentIndex = useMemo(() => (
    concepts.objects.findIndex((c) => c.termid === selectedConceptRef)
  ), [JSON.stringify(concepts.ids), JSON.stringify(activeSource), selectedConceptRef]);

  useEffect(() => {
    function selectNext() {
      const ref = getNextRef(currentIndex);
      if (ref) { selectConceptRef(ref); }
    }
    function selectPrevious() {
      const ref = getPreviousRef(currentIndex);
      if (ref) { selectConceptRef(ref); }
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
    <ReviewContext.Provider value={{ reviewID: selectedReviewID, selectReviewID: selectReviewID }}>
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
            active: activeSource,
            collections: collections.objects,
            select: selectSource,
            refs: concepts.ids,
            objects: concepts.objects,
            index: _concepts.objects,
            isLoading: _concepts.isUpdating,
          }}>
        <TextSearchContext.Provider value={{ query: textQuery, setQuery: setTextQuery }}>

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

        </TextSearchContext.Provider>
      </SourceContext.Provider>
    </ConceptContext.Provider>
    </MathJax.Context>
    </ReviewContext.Provider>
  );
};
