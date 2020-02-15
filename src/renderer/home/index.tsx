import React, { useRef, useContext, useState, useEffect } from 'react';

import Mousetrap from 'mousetrap';

import {
  Classes,
  H1, H3,
  Divider, Button,
  Icon, IconName,
  FormGroup, InputGroup, TextArea,
  NonIdealState,
  Tree, ITreeNode,
 } from '@blueprintjs/core';

import { WindowComponentProps } from 'coulomb/config/renderer';
import { MultiLanguageConcept, ConceptRef, Concept, ConceptCollection } from '../../models/concepts';

import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { DatabaseList } from 'coulomb/db/renderer/status';

import { availableLanguages, conf as appConf } from '../../app';
import { app, conf as rendererConf } from '../index';
import { LangSelector } from '../lang';

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
  });

  const module = MODULE_CONFIG[activeModuleID];

  return (
    <div className={styles.homeWindowLayout}>
      <Panel isCollapsible={true} className={styles.topPanel} iconCollapsed="chevron-down" iconExpanded="chevron-up">
        <H1 className={styles.appTitle}>Glossarist</H1>
        <div className={styles.moduleSelector}>
          {MODULES.map(moduleID =>
            <Button onClick={() => activateModule(moduleID)}>{MODULE_CONFIG[moduleID].title}</Button>
          )}
        </div>
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
  const conceptRefs = useContext(SourceContext).refs.sort((a, b) => a - b);

  return (
    <div className={styles.conceptBrowser}>
      {conceptRefs.map(ref =>
        <ConceptItem key={ref} conceptRef={ref} />
      )}
    </div>
  );
};

const ConceptItem: React.FC<{ conceptRef: ConceptRef }> = function ({ conceptRef }) {
  const lang = useContext(LangConfigContext);
  const conceptCtx = useContext(ConceptContext);
  const concept = app.useOne('concepts', conceptRef).object;

  const active = conceptCtx.ref === conceptRef;

  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (active && el && el.current) { el.current.scrollIntoView(); }
  }, []);

  function maybeSelect() {
    if (active) {
      conceptCtx.select(null);
    } else {
      conceptCtx.select(conceptRef);
    }
  }

  let maybeDesignation: string;
  if (concept) {
    const localizedConcept = concept[lang.selected as keyof typeof availableLanguages] || concept.eng;
    maybeDesignation = localizedConcept.term;
  } else {
    // TODO: Use something better than just raw reference as designation while data is being loaded
    maybeDesignation = `${conceptRef}`;
  }

  return (
    <ItemButton
        onClick={maybeSelect}
        style={{ visibility: concept === null ? 'hidden' : undefined }}
        active={active}
        className={`
          ${styles.conceptItem}
          ${active ? styles.conceptItemActive : '' }
          ${concept === null ? styles.conceptItemBeingLoaded : ''}
          ${!maybeDesignation ? styles.conceptItemWithMissingDesignation : ''}
        `}>
      <span ref={el}>{maybeDesignation}</span>
    </ItemButton>
  );
};

// Concept details

const ConceptDetails: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);
  const concept = useContext(ConceptContext);
  const localized = concept.activeLocalized;
  const isLoading = concept.isLoading;

  let conceptDetails: JSX.Element;

  if (localized === null) {
    conceptDetails = <NonIdealState title={`Entry not yet translated into ${lang.available[lang.selected]}.`} />
  } else {
    conceptDetails = (
      <>
        <H1 className={isLoading ? Classes.SKELETON : undefined}>{localized?.term}</H1>
        <p className={isLoading ? Classes.SKELETON : undefined}>{localized?.definition}</p>
      </>
    );
  }

  return (
    <div className={`
          ${localized === null ? styles.conceptDetailsNotLocalized : ''}
          ${isLoading ? styles.conceptDetailsBeingLoaded : ''}
        `}>
      {conceptDetails}
    </div>
  );
};


/* Contexts */

type ObjectSource =
  { type: 'collection', collectionID: string } |
  { type: 'all' };

interface ObjectSourceContextSpec {
  active: ObjectSource
  refs: ConceptRef[]
  select: (source: ObjectSource) => void
}

const SourceContext = React.createContext<ObjectSourceContextSpec>({
  active: { type: 'all' },
  refs: [],
  select: () => {},
});


interface ConceptContextSpec {
  active: MultiLanguageConcept<any> | null
  activeLocalized: Concept<any, any> | null | undefined
  isLoading: boolean
  ref: ConceptRef | null
  select: (ref: ConceptRef | null) => void
}

const ConceptContext = React.createContext<ConceptContextSpec>({
  active: null,
  isLoading: false,
  activeLocalized: null,
  ref: null,
  select: () => {},
})


/* Panels */

const SystemPanel: React.FC<{}> = function () {
  const concept = useContext(ConceptContext);
  return (
    <p>ID: {concept.ref || '—'}</p>
  );
};

const DatabasePanel: React.FC<{}> = function() {
  return (
    <DatabaseList
      databases={appConf.databases}
      databaseStatusComponents={rendererConf.databaseStatusComponents} />
  );
};

const SourceRoll: React.FC<{}> = function () {
  const source = useContext(SourceContext);
  const concepts = app.useMany<MultiLanguageConcept<any>, any>('concepts', {});
  return (
    <>
      <H3>{source.active.type}</H3>
      <ul className={styles.sourceRollConceptList}>
        {Object.values(concepts.objects).map(c => <p>{c.termid}</p>)}
      </ul>
    </>
  );
};

const CatalogPanel: React.FC<{}> = function () {
  const source = useContext(SourceContext);
  return (
    <ul className={styles.catalogPanelList}>
      <ItemButton
          onClick={() => source.select({ type: 'all' })}
          active={source.active.type === 'all'}>
        All concepts
      </ItemButton>
    </ul>
  );
};

const CollectionsPanel: React.FC<{}> = function () {
  const source = useContext(SourceContext);
  const collections = app.useMany<ConceptCollection, {}>('collections', {});

  const treeRef = useRef<Tree>(null);

  useEffect(() => {
    setTimeout(() => {
      if (treeRef.current && source.active.type === 'collection') {
        const currentNode = treeRef.current.getNodeContentElement(source.active.collectionID);
        currentNode?.scrollIntoView();
      }
    }, 300);
  }, []);

  function handleNodeClick(nodeData: ITreeNode) {
    const data = nodeData.nodeData as { collectionID: string };
    const collectionID: string = data.collectionID;
    source.select({ type: 'collection', collectionID });
  }

  function collectionToNode([_, collection]: [number | string, ConceptCollection]): ITreeNode {
    const children = Object.values(collections.objects).
    filter(c => c.parentID !== undefined).
    filter(c => c.parentID === collection.id);

    const hasChildren = children.length > 0;

    return {
      id: collection.id,
      hasCaret: hasChildren,
      isExpanded: hasChildren,
      label: collection.label,
      childNodes: [...children.entries()].map(collectionToNode),
      isSelected: source.active.type === 'collection' ? source.active.collectionID === collection.id : false,
      nodeData: { collectionID: collection.id },
    };
  }

  const treeState: ITreeNode[] = [...Object.entries(collections.objects)].
  filter(([_, collection]) => collection.parentID === undefined).
  map(collectionToNode);

  return (
    <Tree ref={treeRef} contents={treeState} onNodeClick={handleNodeClick} className={styles.collectionsPanelList} />
  );
};

const BasicsPanel: React.FC<{}> = function () {
  const concept = useContext(ConceptContext);
  const isLoading = concept.isLoading;
  const localized = concept.activeLocalized;
  return (
    <>
      <FormGroup label="Designation" className={isLoading ? Classes.SKELETON : undefined}>
        <InputGroup fill={true} large={true} readOnly value={localized?.term} />
      </FormGroup>
      <FormGroup label="Definition" className={isLoading ? Classes.SKELETON : undefined}>
        <TextArea className={styles.basicsPanelDefinition} fill={true} readOnly value={localized?.definition} />
      </FormGroup>
    </>
  );
};


interface PanelProps {
  title?: string
  className?: string
  iconCollapsed?: IconName
  iconExpanded?: IconName
  isCollapsible?: true
  isCollapsedByDefault?: true
  onToggle?: (state: boolean) => void
}
const Panel: React.FC<PanelProps> = function ({
    title, className,
    iconCollapsed, iconExpanded,
    isCollapsible, isCollapsedByDefault,
    onToggle,
    children }) {
  const [isCollapsed, setCollapsedState] = useState((isCollapsedByDefault || false) as boolean);

  useEffect(() => {
    onToggle ? onToggle(isCollapsed) : void 0;
  }, [isCollapsed]);

  function onCollapse() {
    setCollapsedState(true);
  }
  function onExpand() {
    setCollapsedState(false);
  }

  const toggleIcon: IconName = isCollapsed
    ? (iconCollapsed || 'chevron-right')
    : (iconExpanded || 'chevron-down');

  return (
    <div className={`
        ${className || ''}
        ${styles.panel}
        ${isCollapsible === true ? styles.panelCollapsible : ''}
        ${isCollapsible === true && isCollapsed === true ? styles.panelCollapsed : ''}`}>
      {title || isCollapsible
        ? <div
              className={styles.panelTitleBar}
              onClick={(isCollapsible === true && isCollapsed === false) ? onCollapse : onExpand}>
            <Icon icon={isCollapsible ? toggleIcon : 'blank'} />
            {title}
          </div>
        : null}
      <div className={styles.panelContents}>
        {children}
      </div>
    </div>
  );
};


/* Toolbar */

const SelectLanguage: ToolbarItem = function () {
  return <LangSelector />;
};


/* Sidebars */ 

interface SidebarProps {
  position: 'left' | 'right'
  onToggle: (state: boolean) => void
  panelSet: PanelConfig<any>[]
}
const Sidebar: React.FC<SidebarProps> = function({ position, panelSet, onToggle }) {
  const [firstPanel, ...restOfPanels] = panelSet;

  let lastPanel: PanelConfig | null;
  if (panelSet.length > 1) {
    lastPanel = restOfPanels.splice(restOfPanels.length - 1, 1)[0];
  } else {
    lastPanel = null;
  }

  function panel(cfg: PanelConfig, key?: number) {
    return (
      <Panel
          className={styles.sidebarPanel}
          key={key}
          isCollapsible={cfg.collapsed !== 'never' ? true : undefined}
          title={cfg.title}>
        <cfg.Contents {...cfg.props || {}} />
      </Panel>
    );
  }

  return (
    <Panel
        onToggle={onToggle}
        isCollapsible={true}
        iconExpanded={position === 'left' ? 'chevron-left' : 'chevron-right'}
        iconCollapsed={position === 'left' ? 'chevron-right' : 'chevron-left'}
        className={`
          ${styles.moduleSidebar}
          ${position === 'left' ? styles.moduleSidebarLeft : styles.moduleSidebarRight}`}>

      <div className={styles.fixedPanel}>
        {panel(firstPanel)}
      </div>

      <div className={styles.restOfPanels}>
        {[...restOfPanels.entries()].map(([idx, cfg]) =>
          <>
            {panel(cfg, idx)}
            <Divider key={`divider-${idx}`} />
          </>
        )}
      </div>

      {lastPanel
        ? <div className={styles.fixedPanel}>
            {panel(lastPanel)}
          </div>
        : null}

    </Panel>
  );
};


/* Modules */

type ModuleProps = Omit<Omit<ModuleConfig, 'title'>, 'hotkey'>;
const Module: React.FC<ModuleProps> = function ({ leftSidebar, rightSidebar, MainView, mainToolbar }) {
  const lang = useContext(LangConfigContext);

  const [selectedConceptRef, selectConceptRef] = useState(null as null | ConceptRef);
  const concept = app.useOne<MultiLanguageConcept<any>, number>('concepts', selectedConceptRef);

  const [activeSource, selectSource] = useState({ type: 'all' } as ObjectSource);
  const concepts = app.useIDs<number, { query: { inSource: ObjectSource }}>('concepts', { query: { inSource: activeSource }});

  let localizedConcept: Concept<any, any> | null | undefined;
  // `null` means not yet localized into `lang.selected`, `undefined` means still loading.

  if (concept.object) {
    localizedConcept = concept.object[lang.selected as keyof typeof availableLanguages] || null;
  } else {
    localizedConcept = undefined;
  }

  function handleLeftSidebarToggle(state: boolean) {}
  function handleRightSidebarToggle(state: boolean) {}

  return (
    <ConceptContext.Provider
        value={{
          active: concept.object,
          isLoading: concept === null,
          activeLocalized: localizedConcept,
          ref: selectedConceptRef,
          select: selectConceptRef,
        }}>
      <SourceContext.Provider value={{ active: activeSource, select: selectSource, refs: concepts.ids }}>
        <div className={styles.moduleView}>
          {leftSidebar.length > 0
            ? <Sidebar position="left" panelSet={leftSidebar} onToggle={handleLeftSidebarToggle} />
            : null}

          <div className={styles.moduleMainView}>
            <MainView />

            <div className={styles.moduleToolbar}>
              {mainToolbar.map(El => <El />)}
            </div>
          </div>

          {rightSidebar.length > 0
            ? <Sidebar position="right" panelSet={rightSidebar} onToggle={handleRightSidebarToggle} />
            : null}
        </div>
      </SourceContext.Provider>
    </ConceptContext.Provider>
  );
};


/* Module configuration */

interface PanelConfig<T = {}> {
  title: string
  Contents: React.FC<T>
  props?: T
  collapsed?: 'never' | 'by-default'
}

const PANELS: { [id: string]: PanelConfig<any> } = {
  system: { Contents: SystemPanel, title: "System" },
  databases: { Contents: DatabasePanel, title: "Repositories" },
  sourceRoll: { Contents: SourceRoll, title: "Source" },
  collections: { Contents: CollectionsPanel, title: "Collections" },
  catalog: { Contents: CatalogPanel, title: "Catalog" },
  basics: { Contents: BasicsPanel, title: "Basics" },
};

type ToolbarItem = React.FC<{}>;

interface ModuleConfig {
  hotkey: string,
  title: string,
  leftSidebar: PanelConfig[]
  rightSidebar: PanelConfig[]
  MainView: React.FC<any>
  mainToolbar: ToolbarItem[]
}

const MODULE_CONFIG: { [id: string]: ModuleConfig } = {
  explore: {
    hotkey: 'b',
    title: "Explore",
    leftSidebar: [PANELS.system, PANELS.catalog, PANELS.collections, PANELS.databases],
    MainView: ConceptBrowser,
    mainToolbar: [SelectLanguage],
    rightSidebar: [PANELS.basics],
  },
  examine: {
    hotkey: 'v',
    title: "Examine",
    leftSidebar: [PANELS.system, PANELS.databases],
    MainView: ConceptDetails, // basics, notes, examples
    mainToolbar: [SelectLanguage],
    rightSidebar: [],
  },

  // propose: {
  //   hotkey: 'n',
  //   title: "Propose",
  //   leftSidebar: [PANELS.source, PANELS.databases],
  //   MainView: ConceptProposalForm,
  //   mainToolbar: [SelectLanguage],
  //   rightSidebar: [PANELS.relationships],
  // },
  // explore: {
  //   hotkey: 'b',
  //   title: "Explore",
  //   leftSidebar: [PANELS.system, PANELS.catalog, PANELS.collections, PANELS.databases],
  //   MainView: ConceptBrowser,
  //   mainToolbar: [SelectLanguage],
  //   rightSidebar: [PANELS.status, PANELS.currentReview, PANELS.basics, PANELS.relationships, PANELS.uses],
  // },
  // examine: {
  //   hotkey: 'v',
  //   title: "Examine",
  //   leftSidebar: [PANELS.system, PANELS.sourceRoll, PANELS.databases],
  //   MainView: ConceptDetails, // basics, notes, examples
  //   mainToolbar: [SelectLanguage],
  //   rightSidebar: [PANELS.status, PANELS.currentReview, PANELS.relationships, PANELS.uses, PANELS.changelog],
  // },
  // edit: {
  //   hotkey: 'c',
  //   title: "Edit",
  //   leftSidebar: [System, Changelog, SourceRoll, Databases],
  //   MainView: ConceptEdit, // basics, notes, examples
  //   mainToolbar: [SelectLanguage],
  //   rightSidebar: [Status, CurrentReview, Relationships, CompareLanguage, CompareLineage],
  // },
  // review: {
  //   hotkey: 'x',
  //   title: "Review",
  //   leftSidebar: [System, Changelog, SourceRoll, Databases],
  //   MainView: ConceptReview, // basics, notes, examples, review notes
  //   mainToolbar: [SelectLanguage],
  //   rightSidebar: [Status, CurrentReview, Relationships, CompareLanguage, CompareLineage],
  // },
  // translate: {
  //   hotkey: 'l',
  //   title: "Translate",
  //   leftSidebar: [System, Changelog, SourceRoll, Databases],
  //   MainView: ConceptTranslation, // basics, notes, examples
  //   mainToolbar: [SelectLanguage, SelectTargetLanguage],
  //   rightSidebar: [Status, CurrentReview, Lineage, Changelog],
  // },
};


const MODULES: (keyof typeof MODULE_CONFIG)[] = [
  'explore',
  'examine',
  // 'edit',
  // 'review',
  // 'translate',
  // 'map',
  // 'propose',
]


/* Utility components */

const ItemButton: React.FC<any> = function (props) {
  const finalProps = { ...props, className: `${props.className || ''} ${styles.itemButton}`}
  return <Button {...finalProps}>{props.children}</Button>
}