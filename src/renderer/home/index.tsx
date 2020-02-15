import * as log from 'electron-log';

import React, { useRef, useContext, useState, useEffect } from 'react';

import Mousetrap from 'mousetrap';

import {
  Classes,
  H1, H3,
  Button,
  Icon, IconName,
  FormGroup, InputGroup, TextArea,
  NonIdealState,
  Tree, ITreeNode, IInputGroupProps, ButtonGroup,
 } from '@blueprintjs/core';

import { WindowComponentProps } from 'coulomb/config/renderer';
import { MultiLanguageConcept, ConceptRef, Concept, ConceptCollection } from '../../models/concepts';

import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { DatabaseList } from 'coulomb/db/renderer/status';

import { ObjectSource, availableLanguages, conf as appConf } from '../../app';
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

        <ButtonGroup large={true} className={styles.moduleSelector}>
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
  const conceptRefs = useContext(SourceContext).refs.sort((a, b) => a - b);
  const concept = useContext(ConceptContext);

  function handleNodeClick(node: ITreeNode) {
    const nodeData = node.nodeData as { conceptRef: number };
    const ref = nodeData.conceptRef;
    if (ref) {
      concept.select(ref);
    } else {
      log.error("Missing concept ref on tree node", node.nodeData)
    }
  }

  const treeState: ITreeNode[] = conceptRefs.map(ref => {
    return {
      id: ref,
      label: <ConceptItem conceptRef={ref} />,
      nodeData: { conceptRef: ref },
      isSelected: concept.ref === ref,
    }
  });

  return (
    <div className={styles.conceptBrowser}>
      <Tree contents={treeState} onNodeClick={handleNodeClick} />
    </div>
  );
};

const ConceptItem: React.FC<{ conceptRef: ConceptRef, className?: string }> = function ({ conceptRef, className }) {
  const lang = useContext(LangConfigContext);
  const conceptCtx = useContext(ConceptContext);
  const concept = app.useOne('concepts', conceptRef).object;

  const active = conceptCtx.ref === conceptRef;

  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (active && el && el.current) { el.current.scrollIntoViewIfNeeded(); }
  }, []);

  let maybeDesignation: string;
  if (concept) {
    const localizedConcept = concept[lang.selected as keyof typeof availableLanguages] || concept.eng;
    maybeDesignation = localizedConcept.term;
  } else {
    // TODO: Use something better than just raw reference as designation while data is being loaded
    maybeDesignation = `${conceptRef}`;
  }

  return (
    <span
        className={styles.conceptItem}
        style={{ opacity: concept === null ? '0' : '1' }}
        ref={el}>
      {maybeDesignation}
    </span>
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

interface ObjectSourceContextSpec {
  active: ObjectSource
  refs: ConceptRef[]
  select: (source: ObjectSource) => void
}

const SourceContext = React.createContext<ObjectSourceContextSpec>({
  active: { type: 'catalog-preset', presetName: 'all' },
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
    <div className={styles.systemPanel}>
      <FormGroup label="ID" inline={true}>
        <InputGroup readOnly={true} value={`${concept?.ref}` || '—'} />
      </FormGroup>
    </div>
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
  const concept = useContext(ConceptContext);
  const conceptRefs = useContext(SourceContext).refs.sort((a, b) => a - b);

  //const treeRef = useRef<Tree>(null);

  // useEffect(() => {
  //   setTimeout(() => {
  //     if (treeRef.current && source.active.type === 'collection') {
  //       const currentNode = treeRef.current.getNodeContentElement(source.active.collectionID);
  //       currentNode?.scrollIntoView();
  //     }
  //   }, 300);
  // }, []);

  function handleNodeClick(node: ITreeNode) {
    const nodeData = node.nodeData as { conceptRef: number };
    const ref = nodeData.conceptRef;
    if (ref) {
      concept.select(ref);
    }
  }

  const treeState: ITreeNode[] = conceptRefs.map(ref => {
    return {
      id: ref,
      label: <ConceptItem conceptRef={ref} />,
      nodeData: { conceptRef: ref },
      isSelected: concept.ref === ref,
    }
  });

  return (
    <div className={styles.sourceRollPanel}>
      <H3>{source.active.type}</H3>
      <Tree contents={treeState} onNodeClick={handleNodeClick} />
    </div>
  );
};

const CatalogPanel: React.FC<{}> = function () {
  const source = useContext(SourceContext);
  const src = source.active;

  const treeState: ITreeNode[] = [{
    id: 'all',
    label: 'All concepts',
    isSelected: src.type === 'catalog-preset' && src.presetName === 'all',
    nodeData: { presetName: 'all' },
  }];

  function handleNodeClick(nodeData: ITreeNode) {
    const data = nodeData.nodeData as { presetName: 'all' };
    const presetName: string = data.presetName;
    source.select({ type: 'catalog-preset', presetName });
  }

  return (
    <Tree contents={treeState} onNodeClick={handleNodeClick} />
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
        currentNode?.scrollIntoViewIfNeeded();
      }
    }, 300);
  }, []);

  function handleNodeClick(nodeData: ITreeNode) {
    const data = nodeData.nodeData as { collectionID: string };
    const collectionID: string = data.collectionID;
    const collectionToSelect: ConceptCollection | undefined = collections.objects[collectionID];
    const canSelect = collectionToSelect?.items.length > 0;
    if (canSelect) {
      source.select({ type: 'collection', collectionID });
    }
  }

  function collectionToNode([_, collection]: [number | string, ConceptCollection]): ITreeNode {
    const children = Object.values(collections.objects).
    filter(c => c.parentID !== undefined).
    filter(c => c.parentID === collection.id);

    const hasChildren = children.length > 0;
    const hasItems = collection.items.length > 0;
    const isSelected = source.active.type === 'collection' ? (hasItems && (source.active.collectionID === collection.id)) : false;

    return {
      id: collection.id,
      hasCaret: hasChildren,
      isExpanded: hasChildren,
      label: collection.label,
      childNodes: [...children.entries()].map(collectionToNode),
      isSelected: isSelected,
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
  const localized = concept.activeLocalized;

  return (
    <div className={styles.basicsPanel}>

    {localized !== null
      ? <>
          <FormGroup
              label="Designation"
              className={styles.designation}>
            <InputGroup
              large={true}
              defaultValue={localized?.term}
              {...panelFieldProps(concept)} />
          </FormGroup>

          <FormGroup
              label="Definition">
            <TextArea
              growVertically={true}
              className={styles.basicsPanelDefinition}
              value={localized?.definition || ''}
              {...panelFieldProps(concept)} />
          </FormGroup>
        </>

      : null}
    </div>
  );
};

const StatusPanel: React.FC<{}> = function () {
  const concept = useContext(ConceptContext);
  const localized = concept.activeLocalized;

  return (
    <div className={styles.statusPanel}>

    {localized !== null
      ? <>
          <FormGroup
              label="Entry status"
              inline
              className={styles.entryStatus}>
            <InputGroup
              defaultValue={localized?.entry_status}
              {...panelFieldProps(concept)} />
          </FormGroup>
        </>

      : null}
    </div>
  );
};

const CurrentReviewPanel: React.FC<{}> = function () {
  const concept = useContext(ConceptContext);
  const localized = concept.activeLocalized;

  return (
    <div className={styles.currentReviewPanel}>

    {localized !== null
      ? <>
          <FormGroup
              inline
              label="Pending">
            <InputGroup
              defaultValue={localized?.review_date && !localized?.review_decision ? 'Yes' : 'No'}
              {...panelFieldProps(concept)} />
          </FormGroup>

          <FormGroup
              inline
              label="Decision">
            <InputGroup
              defaultValue={localized?.review_decision || '—'}
              {...panelFieldProps(concept)} />
          </FormGroup>
        </>

      : null}
    </div>
  );
};

const PanelPlaceholder: React.FC<{}> = function () {
  return (
    <div className={styles.panelPlaceholder}>
      Coming soon.
    </div>
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
            <Icon className={styles.panelTriggerIcon} icon={isCollapsible ? toggleIcon : 'blank'} />
            {title}
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

const AddCollection: ToolbarItem = function () {
  return <Button icon="add" title="Add collection" disabled={true} />;
};


/* Sidebars */ 

const SPanel: React.FC<{ key: string, term: string, cfg: PanelConfig<any> }> = function ({ key, term, cfg }) {
  return (
    <Panel
        className={styles.sidebarPanel}
        key={`${key}${cfg.objectIndependent ? '' : term}`}
        isCollapsible={cfg.collapsed !== 'never' ? true : undefined}
        title={cfg.title}>
      <cfg.Contents {...cfg.props || {}} />
    </Panel>
  );
};

interface SidebarProps {
  position: 'left' | 'right'
  onToggle: (state: boolean) => void
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
        iconExpanded={position === 'left' ? 'chevron-left' : 'chevron-right'}
        iconCollapsed={position === 'left' ? 'chevron-right' : 'chevron-left'}
        className={`
          ${styles.moduleSidebar}
          ${position === 'left' ? styles.moduleSidebarLeft : styles.moduleSidebarRight}`}>

      <div className={styles.fixedPanel}>
        <SPanel term={term} key="first" cfg={firstPanel} />
      </div>

      <div className={styles.restOfPanels}>
        {[...restOfPanels.entries()].map(([idx, cfg]) =>
          <>
            <SPanel term={term} key={`${idx}`} cfg={cfg} />
          </>
        )}
      </div>

      {lastPanel
        ? <div className={styles.fixedPanel}>
            <SPanel term={term} key="last" cfg={lastPanel} />
          </div>
        : null}

    </Panel>
  );
};


/* Module configuration */

interface PanelConfig<T = {}> {
  title: string
  actions?: ToolbarItem[]
  Contents: React.FC<T>
  objectIndependent?: true
  props?: T
  collapsed?: 'never' | 'by-default'
}

const PANELS: { [id: string]: PanelConfig<any> } = {
  system: { Contents: SystemPanel, title: "System" },
  databases: { Contents: DatabasePanel, title: "Repositories", objectIndependent: true },
  sourceRoll: { Contents: SourceRoll, title: "Source", objectIndependent: true },
  collections: { Contents: CollectionsPanel, title: "Collections", actions: [AddCollection] },
  catalog: { Contents: CatalogPanel, title: "Catalog" },
  basics: { Contents: BasicsPanel, title: "Basics" },
  status: { Contents: StatusPanel, title: "Status" },
  currentReview: { Contents: CurrentReviewPanel, title: "Current review" },

  relationships: { Contents: () => <PanelPlaceholder />, title: "Relationships" },
  uses: { Contents: () => <PanelPlaceholder />, title: "Uses (lineage)" },
  changelog: { Contents: () => <PanelPlaceholder />, title: "Change log" },
  compareLineage: { Contents: () => <PanelPlaceholder />, title: "Compare previous use" },
  compareLanguage: { Contents: () => <PanelPlaceholder />, title: "Compare language" },
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
    leftSidebar: [PANELS.source, PANELS.databases],
    MainView: () => <NonIdealState title="Comoponent not implement" />,
    mainToolbar: [SelectLanguage],
    rightSidebar: [PANELS.relationships],
  },
  explore: {
    hotkey: 'b',
    title: "Explore",
    leftSidebar: [PANELS.system, PANELS.catalog, PANELS.collections, PANELS.databases],
    MainView: ConceptBrowser,
    mainToolbar: [SelectLanguage],
    rightSidebar: [PANELS.status, PANELS.currentReview, PANELS.basics, PANELS.relationships, PANELS.uses],
  },
  examine: {
    hotkey: 'v',
    title: "Examine",
    leftSidebar: [PANELS.system, PANELS.sourceRoll, PANELS.databases],
    MainView: ConceptDetails, // basics, notes, examples
    mainToolbar: [SelectLanguage],
    rightSidebar: [PANELS.status, PANELS.currentReview, PANELS.relationships, PANELS.uses, PANELS.changelog],
  },
  edit: {
    disabled: true,
    hotkey: 'c',
    title: "Edit",
    leftSidebar: [PANELS.system, PANELS.changelog, PANELS.sourceRoll, PANELS.databases],
    MainView: () => <NonIdealState title="Comoponent not implement" />,
    mainToolbar: [SelectLanguage],
    rightSidebar: [PANELS.status, PANELS.currentReview, PANELS.relationships, PANELS.compareLanguage, PANELS.compareLineage],
  },
  review: {
    disabled: true,
    hotkey: 'x',
    title: "Review",
    leftSidebar: [PANELS.system, PANELS.changelog, PANELS.sourceRoll, PANELS.databases],
    MainView: () => <NonIdealState title="Comoponent not implement" />,
    mainToolbar: [SelectLanguage],
    rightSidebar: [PANELS.status, PANELS.currentReview, PANELS.relationships, PANELS.compareLanguage, PANELS.compareLineage],
  },
  translate: {
    disabled: true,
    hotkey: 'l',
    title: "Translate",
    leftSidebar: [PANELS.system, PANELS.changelog, PANELS.sourceRoll, PANELS.databases],
    MainView: () => <NonIdealState title="Comoponent not implement" />,
    mainToolbar: [SelectLanguage, /*SelectTargetLanguage*/],
    rightSidebar: [PANELS.status, PANELS.currentReview, PANELS.lineage, PANELS.changelog],
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
  const concept = app.useOne<MultiLanguageConcept<any>, number>('concepts', selectedConceptRef);

  const [activeSource, selectSource] = useState({ type: 'catalog-preset', presetName: 'all' } as ObjectSource);
  const concepts = app.useIDs<number, { query: { inSource: ObjectSource }}>('concepts', { query: { inSource: activeSource }});

  let localizedConcept: Concept<any, any> | null | undefined;
  // `null` means not yet localized into `lang.selected`, `undefined` means still loading.

  if (concept.object) {
    localizedConcept = concept.object[lang.selected as keyof typeof availableLanguages] || undefined;
  } else {
    localizedConcept = null;
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


/* Utilities */

function panelFieldProps(concept: ConceptContextSpec) {
  /* Props shared across BP3 input groups, textareas in panel fields. */

  return {
    fill: true,
    intent: concept.activeLocalized === undefined ? 'danger' : undefined as IInputGroupProps["intent"],
    disabled: concept.isLoading,
    readOnly: true,
  };
}

// const ItemButton: React.FC<any> = function (props) {
//   const finalProps = { ...props, className: `${props.className || ''} ${styles.itemButton}`}
//   return <Button {...finalProps}>{props.children}</Button>
// }