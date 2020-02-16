import * as log from 'electron-log';
import { debounce } from 'throttle-debounce';

import React, { useMemo, useRef, useContext, useState, useEffect } from 'react';

import Mousetrap from 'mousetrap';

import {
  Classes,
  H1,
  Button,
  Icon, IconName,
  InputGroup, FormGroup, TextArea,
  NonIdealState,
  Tree, ITreeNode, ButtonGroup,
 } from '@blueprintjs/core';

import { callIPC, useIPCValue } from 'coulomb/ipc/renderer';

import { WindowComponentProps } from 'coulomb/config/renderer';
import { MultiLanguageConcept, ConceptRef, Concept } from '../../models/concepts';

import { LangConfigContext } from 'coulomb/localizer/renderer/context';

import { ObjectSource, availableLanguages } from '../../app';
import { app } from '../index';
import { LangSelector } from '../lang';
import { LangSelector as LangSelectorWide } from 'coulomb/localizer/renderer/widgets';

import { ConceptItem } from './concepts';
import * as panels from './panels';
import { SourceContext, ConceptContext, TextSearchContext } from './contexts';

import styles from './styles.scss';


const Window: React.FC<WindowComponentProps> = function () {
  const [activeModuleID, activateModule] = useState(MODULES[0]);

  useEffect(() => {
    for (const moduleID of MODULES) {
      Mousetrap.bind(MODULE_CONFIG[moduleID].hotkey, () => activateModule(moduleID))
    }
    return function cleanup() {
      for (const hotkey of MODULES.map(moduleID => MODULE_CONFIG[moduleID].hotkey)) {
        Mousetrap.unbind(hotkey);
      }
    };
  }, []);

  const module = MODULE_CONFIG[activeModuleID];

  return (
    <div className={styles.homeWindowLayout}>
      <Panel
          isCollapsible
          className={styles.topPanel}
          iconCollapsed="caret-down"
          iconExpanded="caret-up">
        <H1 className={styles.appTitle}>Glossarist</H1>

        <ButtonGroup large className={styles.moduleSelector}>
          {MODULES.map(moduleID =>
            <Button
                disabled={MODULE_CONFIG[moduleID].disabled === true}
                active={moduleID === activeModuleID}
                key={moduleID}
                onClick={() => activateModule(moduleID)}>
              {MODULE_CONFIG[moduleID].title}
            </Button>
          )}
        </ButtonGroup>
      </Panel>

      <Module
        leftSidebar={module.leftSidebar}
        rightSidebar={module.rightSidebar}
        MainView={module.MainView}
        mainToolbar={module.mainToolbar} />
    </div>
  );
};

export default Window;


/* Main views */

// Concept browser

const ConceptBrowser: React.FC<{}> = function () {
  const source = useContext(SourceContext);
  const concepts = source.objects;
  const concept = useContext(ConceptContext);
  const lang = useContext(LangConfigContext);

  function handleNodeClick(node: ITreeNode) {
    const nodeData = node.nodeData as { conceptRef: number };
    const ref = nodeData.conceptRef;
    if (ref) {
      concept.select(ref);
    } else {
      log.error("Missing concept ref on tree node", node.nodeData)
    }
  }

  let treeState: ITreeNode[];
  if (source.isLoading) {
    treeState = LOADING_TREE_STATE;
  } else {
    treeState = concepts.map(c => ({
      id: c.termid,
      label: <ConceptItem lang={lang.default as keyof typeof availableLanguages} concept={c} />,
      icon: <span className={styles.conceptID}>{c.termid}</span>,
      secondaryLabel: !c[lang.selected as keyof typeof availableLanguages]
        ? <Icon intent="warning" icon="translate" />
        : <Icon icon="blank" />,
      nodeData: { conceptRef: c.termid },
      isSelected: concept.ref === c.termid,
    } as ITreeNode));
  }

  return (
    <div className={styles.conceptBrowser}>
      <Tree contents={treeState} onNodeClick={handleNodeClick} />
    </div>
  );
};

// Concept details

const ConceptDetails: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);
  const ctx = useContext(ConceptContext);
  const concept = ctx.activeLocalized;
  const isLoading = ctx.isLoading;
  const loadingClass = isLoading ? Classes.SKELETON : undefined;

  let conceptDetails: JSX.Element;

  if (concept === undefined) {
    conceptDetails = <NonIdealState title={`Entry not yet translated into ${lang.available[lang.selected]}.`} />
  } else if (concept === null) {
    conceptDetails = <NonIdealState title="No concept is selected" />
  } else {
    conceptDetails = (
      <div className={lang.selected === 'ara' ? Classes.RTL : undefined}>
        <H1 className={`${styles.designation} ${loadingClass}`}>{concept?.term}</H1>

        <div className={`${Classes.RUNNING_TEXT} ${styles.basics}`}>
          <p className={`${styles.definition} ${loadingClass}`}>{concept?.definition}</p>

          {[...concept.examples.entries()].map(([idx, item]) =>
            <p className={`${styles.example} ${loadingClass}`} key={`example-${idx}`}>
              <span className={styles.label}>EXAMPLE:</span>
              {item}
            </p>
          )}

          {[...concept.notes.entries()].map(([idx, item]) =>
             <p className={`${styles.note} ${loadingClass}`} key={`note-${idx}`}>
              <span className={styles.label}>NOTE:</span>
               {item}
             </p>
           )}
        </div>
      </div>
    );
  }
  return (
    <div className={`
          ${styles.singleConcept}
          ${styles.examineConcept}
          ${concept === null ? styles.conceptNotLocalized : ''}
          ${isLoading ? styles.conceptBeingLoaded : ''}
        `}>
      {conceptDetails}
    </div>
  );
};

// Concept edit

const ConceptEdit: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);
  const ctx = useContext(ConceptContext);
  const active = ctx.active;
  const auth = active ? active[lang.default as keyof typeof availableLanguages] : undefined;

  const [concept, updateConcept] = useState<Concept<any, any> | undefined>(auth);
  const [commitInProgress, setCommitInProgress] = useState(false);
  const hasUncommittedChanges = concept && auth &&
    JSON.stringify(auth) !== JSON.stringify(concept);

  useEffect(() => {
    // Make sure edit screen updates if user navigates to another concept while editing.
    // NOTE: This will cause unsaved changes to be lost.
    updateConcept(ctx.active?.eng || undefined);
  }, [ctx.ref])

  const commitChanges = async () => {
    if (active !== null && concept !== undefined) {
      setCommitInProgress(true);

      await callIPC<{ commit: boolean, objectID: number, object: MultiLanguageConcept<any> }, { success: true }>
      ('model-concepts-update-one', {
        objectID: active.termid,
        object: { ...active, eng: concept },
        commit: true,
      });

      setCommitInProgress(false);
      setImmediate(() => { ctx.select(null); ctx.select(active.termid) });
    }
  };

  function handleTermChange(evt: React.FormEvent<HTMLInputElement>) {
    const val = (evt.target as HTMLInputElement).value;
    updateConcept(c => ( c ? { ...c, term: val } : c));
  }

  function handleDefChange(evt: React.FormEvent<HTMLTextAreaElement>) {
    const val = (evt.target as HTMLTextAreaElement).value;
    updateConcept(c => ( c ? { ...c, definition: val } : c));
  }

  if (concept === undefined) {
    return <NonIdealState title="No concept is selected" />;
  }

  const conceptForm = (
    <div className={lang.selected === 'ara' ? Classes.RTL : undefined}>

      <FormGroup label="Designation" labelInfo="(required)" intent={!concept.term ? 'danger' : undefined}>
        <InputGroup fill value={concept.term} onChange={handleTermChange} />
      </FormGroup>

      <FormGroup label="Definition" labelInfo="(required)" intent={!concept.definition ? 'danger' : undefined}>
        <TextArea fill value={concept.definition} growVertically onChange={handleDefChange} />
      </FormGroup>

      <Button
          onClick={commitInProgress ? undefined : commitChanges}
          active={commitInProgress}
          intent={concept && hasUncommittedChanges ? "success" : undefined}
          disabled={!concept || !hasUncommittedChanges}>
        Save version
      </Button>
    </div>
  );

  return (
    <div className={`
          ${styles.singleConcept}
          ${styles.editConcept}
        `}>
      {conceptForm}
    </div>
  );
};


/* Panels */

interface PanelProps {
  title?: string
  TitleComponent?: React.FC<{}>
  className?: string
  iconCollapsed?: IconName
  iconExpanded?: IconName
  isCollapsible?: true
  isCollapsedByDefault?: true
  onToggle?: (state: boolean) => void
}
const Panel: React.FC<PanelProps> = function ({
    className,
    title, TitleComponent,
    iconCollapsed, iconExpanded,
    isCollapsible, isCollapsedByDefault,
    onToggle,
    children }) {
  const state = useRef({ collapsed: (isCollapsedByDefault || false) as boolean});
  const [isCollapsed, setCollapsedState] = useState(state.current.collapsed);

  useEffect(() => {
    onToggle ? onToggle(isCollapsed) : void 0;
  }, [isCollapsed]);

  function onCollapse() {
    state.current.collapsed = true;
    onToggle ? onToggle(true) : void 0;
    setCollapsedState(true);
  }
  function onExpand() {
    state.current.collapsed = false;
    onToggle ? onToggle(false) : void 0;
    setCollapsedState(false);
  }

  const toggleIcon: IconName = isCollapsed
    ? (iconCollapsed || 'caret-right')
    : (iconExpanded || 'caret-down');

  return (
    <div className={`
        ${className || ''}
        ${styles.panel}
        ${isCollapsible === true ? styles.panelCollapsible : ''}
        ${isCollapsible === true && isCollapsed === true ? styles.panelCollapsed : ''}`}>
      {title || TitleComponent || isCollapsible
        ? <div
              className={styles.panelTitleBar}
              onClick={(isCollapsible === true && isCollapsed === false) ? onCollapse : onExpand}>
            <Icon className={styles.panelTriggerIcon} icon={isCollapsible ? toggleIcon : 'blank'} />
            {TitleComponent ? <TitleComponent /> : title}
          </div>
        : null}
      {isCollapsible && isCollapsed
        ? null
        : <div className={styles.panelContents}>
            {children}
          </div>}
    </div>
  );
};


/* Toolbar */

const SelectLanguage: ToolbarItem = function () {
  return <LangSelector />;
};

const CompareLanguage: ToolbarItem = function () {
  const concept = useContext(ConceptContext);
  return <LangSelectorWide disableUnlessTranslated={true} value={concept.active || undefined} />;
};

const SelectTargetLanguage: ToolbarItem = function () {
  const concept = useContext(ConceptContext);
  return <LangSelectorWide value={concept.active || undefined} />;
};

const SortOrder: ToolbarItem = function () {
  const src = useContext(SourceContext).active;
  if (src.type === 'catalog-preset' && src.presetName === 'all') {
    return <Button disabled icon="sort-numerical">Concept ID</Button>;
  } else {
    return <Button disabled icon="sort">Custom order</Button>;
  }
};

const SearchByText: ToolbarItem = function () {
  const searchCtx = useContext(TextSearchContext);
  const [query, setQuery] = useState(searchCtx.query || '' as string);

  const handleChange = function (evt: React.FormEvent<HTMLInputElement>) {
    setQuery((evt.target as HTMLInputElement).value);
  }
  const updateQuery = debounce(400, searchCtx.setQuery);

  useEffect(() => {
    updateQuery(query);

    return function cleanup() {
      updateQuery.cancel();
    }
  }, [query]);

  return <InputGroup round
    value={query}
    onChange={handleChange}
    leftIcon="search"
    placeholder="Type to search…"
    title="Search is performed across English designations and definitions, as well as concept identifiers."
    rightElement={<Button minimal icon="cross" onClick={() => setQuery('')} />}
  />;
};

const AddCollection: ToolbarItem = function () {
  return <Button icon="add" title="Add collection" disabled={true} />;
};


/* Sidebars */ 

const SPanel: React.FC<{ id: string, term: string, cfg: PanelConfig<any> }> = function ({ id, term, cfg }) {
  return (
    <Panel
        className={styles.sidebarPanel}
        isCollapsible={cfg.collapsed !== 'never' ? true : undefined}
        TitleComponent={cfg.Title}
        title={cfg.title}>
      <cfg.Contents {...cfg.props || {}} />
    </Panel>
  );
};

interface SidebarProps {
  position: 'left' | 'right'
  onToggle?: (state: boolean) => void
  panelSet: PanelConfig<any>[]
}
const Sidebar: React.FC<SidebarProps> = function({ position, panelSet, onToggle }) {
  const concept = useContext(ConceptContext);
  const [firstPanel, ...restOfPanels] = panelSet;

  const term = `${concept.activeLocalized?.id}`;

  let lastPanel: PanelConfig | null;
  if (panelSet.length > 1) {
    lastPanel = restOfPanels.splice(restOfPanels.length - 1, 1)[0];
  } else {
    lastPanel = null;
  }

  return (
    <Panel
        onToggle={onToggle}
        isCollapsible={true}
        iconExpanded={position === 'left' ? 'caret-left' : 'caret-right'}
        iconCollapsed={position === 'left' ? 'caret-right' : 'caret-left'}
        className={`
          ${styles.moduleSidebar}
          ${position === 'left' ? styles.moduleSidebarLeft : styles.moduleSidebarRight}`}>

      <div className={styles.fixedPanel}>
        <SPanel term={term} id="first" cfg={firstPanel} />
      </div>

      <div className={styles.restOfPanels}>
        {[...restOfPanels.entries()].map(([idx, cfg]) =>
          <SPanel key={idx} term={term} id={`${idx}`} cfg={cfg} />
        )}
      </div>

      {lastPanel
        ? <div className={styles.fixedPanel}>
            <SPanel term={term} id="last" cfg={lastPanel} />
          </div>
        : null}

    </Panel>
  );
};


const SourceRollTitle: React.FC<{}> = function () {
  const src = useContext(SourceContext).active;

  let sourceName: string | null;
  if (src.type === 'catalog-preset' && src.presetName === 'all') {
    sourceName = "All concepts";
  } else if (src.type === 'collection') {
    sourceName = "Collection";
  } else {
    sourceName = null;
  }
  return <>{sourceName}</>;
}


/* Module configuration */

interface PanelConfig<T = {}> {
  title: string
  Title?: React.FC<{}>
  actions?: ToolbarItem[]
  Contents: React.FC<T>
  objectIndependent?: true
  props?: T
  collapsed?: 'never' | 'by-default'
}

const PANELS: { [id: string]: PanelConfig<any> } = {
  system: { Contents: panels.SystemPanel, title: "System" },
  databases: { Contents: panels.DatabasePanel, title: "Repositories" },
  sourceRollTranslated: { Contents: panels.PossiblyTranslatedSourceRoll, title: "Source", Title: SourceRollTitle },
  sourceRollAuthoritative: { Contents: panels.AuthoritativeLanguageSourceRoll, title: "Source", Title: SourceRollTitle },
  collections: { Contents: panels.CollectionsPanel, title: "Collections", actions: [AddCollection] },
  catalog: { Contents: panels.CatalogPanel, title: "Catalog" },
  basics: { Contents: panels.BasicsPanel, title: "Basics" },
  status: { Contents: panels.StatusPanel, title: "Status" },
  currentReview: { Contents: panels.CurrentReviewPanel, title: "Current review" },
  uses: { Contents: panels.LineagePanel, title: "Lineage" },
  changelog: { Contents: panels.Changelog, title: "Changelog" },

  relationships: { Contents: () => <panels.PanelPlaceholder />, title: "Relationships" },
  compareLineage: { Contents: () => <panels.PanelPlaceholder />, title: "Compare lineage" },
  compareLanguage: { Contents: () => <panels.PanelPlaceholder />, title: "Compare translation" },
};

type ToolbarItem = React.FC<{}>;

interface ModuleConfig {
  hotkey: string
  title: string
  leftSidebar: PanelConfig[]
  rightSidebar: PanelConfig[]
  MainView: React.FC<any>
  mainToolbar: ToolbarItem[]
  disabled?: true
}

const MODULE_CONFIG: { [id: string]: ModuleConfig } = {
  propose: {
    disabled: true,
    hotkey: 'n',
    title: "Propose",
    leftSidebar: [PANELS.sourceRollAuthoritative, PANELS.databases],
    MainView: () => <NonIdealState title="Component not implemented" />,
    mainToolbar: [SelectLanguage],
    rightSidebar: [PANELS.relationships],
  },
  explore: {
    hotkey: 'b',
    title: "Explore",
    leftSidebar: [PANELS.system, PANELS.catalog, PANELS.collections, PANELS.databases],
    MainView: ConceptBrowser,
    mainToolbar: [SelectLanguage, SearchByText, SortOrder],
    rightSidebar: [PANELS.status, PANELS.currentReview, PANELS.basics, PANELS.relationships, PANELS.uses],
  },
  examine: {
    hotkey: 'v',
    title: "Examine",
    leftSidebar: [PANELS.system, PANELS.sourceRollTranslated, PANELS.databases],
    MainView: ConceptDetails, // basics, notes, examples
    mainToolbar: [CompareLanguage],
    rightSidebar: [PANELS.status, PANELS.currentReview, PANELS.relationships, PANELS.changelog, PANELS.uses],
  },
  edit: {
    hotkey: 'c',
    title: "Edit",
    leftSidebar: [PANELS.system, PANELS.compareLineage, PANELS.sourceRollAuthoritative, PANELS.databases],
    MainView: ConceptEdit,
    mainToolbar: [CompareLanguage],
    rightSidebar: [PANELS.status, PANELS.currentReview, PANELS.relationships, PANELS.changelog],
  },
  review: {
    disabled: true,
    hotkey: 'x',
    title: "Review",
    leftSidebar: [PANELS.system, PANELS.changelog, PANELS.sourceRoll, PANELS.databases],
    MainView: () => <NonIdealState title="Component not implemented" />,
    mainToolbar: [SelectLanguage],
    rightSidebar: [PANELS.status, PANELS.currentReview, PANELS.relationships, PANELS.compareLanguage, PANELS.compareLineage],
  },
  translate: {
    disabled: true,
    hotkey: 'l',
    title: "Translate",
    leftSidebar: [PANELS.system, PANELS.changelog, PANELS.sourceRoll, PANELS.databases],
    MainView: () => <NonIdealState title="Component not implemented" />,
    mainToolbar: [SelectTargetLanguage],
    rightSidebar: [PANELS.status, PANELS.currentReview, PANELS.changelog, PANELS.uses],
  },
};


const MODULES: (keyof typeof MODULE_CONFIG)[] = [
  'explore',
  'examine',
  'edit',
  'review',
  'translate',
  'propose',
]


/* Modules */

type ModuleProps = Omit<Omit<ModuleConfig, 'title'>, 'hotkey'>;
const Module: React.FC<ModuleProps> = function ({ leftSidebar, rightSidebar, MainView, mainToolbar }) {
  const lang = useContext(LangConfigContext);

  const [selectedConceptRef, selectConceptRef] = useState(null as null | ConceptRef);
  const [activeSource, selectSource] = useState({ type: 'catalog-preset', presetName: 'all' } as ObjectSource);
  const [textQuery, setTextQuery] = useState('' as string);

  const _objs = app.useMany<MultiLanguageConcept<any>, { query: { inSource: ObjectSource, matchingText?: string }}>
  ('concepts', { query: { inSource: activeSource, matchingText: textQuery }});

  const concepts = {
    ids: app.useIDs<number, { query: { inSource: ObjectSource }}>
      ('concepts', { query: { inSource: activeSource }}).ids,
    objects: useMemo(() => (
      Object.values(_objs.objects).sort((a, b) => a.termid - b.termid)
    ), [Object.keys(_objs.objects)]),
  };

  const currentIndex = useMemo(() => (
    concepts.objects.findIndex((c) => c.termid === selectedConceptRef)
  ), [selectedConceptRef]);

  const collectionsMigrated = useRef({ yes: false });

  useEffect(() => {
    if (concepts.ids.length > 0 && collectionsMigrated.current.yes !== true) {
      callIPC('initialize-standards-collections');
      collectionsMigrated.current.yes = true;
    }
  }, [concepts.ids.length]);

  // Hotkey navigation up/down
  useEffect(() => {
    function selectNext() {
      const ref = getNextRef(currentIndex);
      if (ref) { selectConceptRef(ref); }
    }
    function selectPrevious() {
      const ref = getPreviousRef(currentIndex);
      if (ref) { selectConceptRef(ref); }
    }
    function getNextRef(idx: number| undefined): ConceptRef | undefined {
      if (idx !== undefined && concepts.objects[idx + 1]) {
        return concepts.objects[idx + 1].termid;
      }
      return undefined;
    }
    function getPreviousRef(idx: number| undefined): ConceptRef | undefined  {
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
  }, [JSON.stringify(concepts.ids), currentIndex]);

  const concept = selectedConceptRef
    ? (_objs.objects[selectedConceptRef] || null)
    : null; 
  const localizedConcept = concept
    ? (concept[lang.selected as keyof typeof availableLanguages] || null)
    : undefined;

  return (
    <ConceptContext.Provider
        value={{
          active: concept,
          isLoading: _objs.isUpdating,
          activeLocalized: localizedConcept,
          ref: selectedConceptRef,
          select: selectConceptRef,
        }}>
      <SourceContext.Provider
          value={{
            active: activeSource,
            select: selectSource,
            refs: concepts.ids,
            objects: concepts.objects,
            isLoading: _objs.isUpdating,
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
  );
};


function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function makeStringOfLength(length: number) {
   var result = '';
   for (var i = 0; i < length; i++) {
      result += '0';
   }
   return result;
}

const LOADING_TREE_STATE: ITreeNode[] = [...Array(3).keys()].map(id => ({
    id: id,
    label: <span className={Classes.SKELETON}>
      {makeStringOfLength(getRandomInt(15, 60))}
    </span>,
  } as ITreeNode))