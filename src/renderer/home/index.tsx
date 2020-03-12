import { debounce } from 'throttle-debounce';

import React, { useMemo, useRef, useContext, useState, useEffect } from 'react';

import CytoscapeComponent from 'react-cytoscapejs';
import { Core as Cy, NodeSingular as CyNode } from 'cytoscape';

import Mousetrap from 'mousetrap';
// Import needed to define Mousetrap.bindGlobal() as a side-effect:
import 'mousetrap/plugins/global-bind/mousetrap-global-bind';

import {
  H1, Button,
  Icon, IconName, InputGroup,
  NonIdealState,
  ButtonGroup, Callout, FormGroup, Toaster, Position, Tooltip,
 } from '@blueprintjs/core';

import { WindowComponentProps } from 'coulomb/config/renderer';
import { callIPC } from 'coulomb/ipc/renderer';
import { LangSelector as LangSelectorWide } from 'coulomb/localizer/renderer/widgets';
import { MultiLanguageConcept, Concept, ConceptRef, AuthoritativeSource } from '../../models/concepts';

import { LangConfigContext } from 'coulomb/localizer/renderer/context';

import { ObjectSource, availableLanguages } from '../../app';
import { app } from '..';
import { LangSelector } from '../lang';

import { ConceptList, EntryDetails, EntryEdit } from './concepts';
import * as panels from './panels';
import {
  SourceContext,
  ConceptContext,
  TextSearchContext,
 } from './contexts';

import styles from './styles.scss';


const toaster = Toaster.create({ position: Position.TOP });

const Window: React.FC<WindowComponentProps> = function () {
  const [activeModuleID, activateModule] = useState(MODULES[0]);
  const [moduleOptions, setModuleOptions] = useState<any>({});

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

  useEffect(() => {
    setModuleOptions({});
  }, [activeModuleID]);

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

      <ModuleContext.Provider value={{ opts: moduleOptions, setOpts: setModuleOptions }}>
        <Module
          leftSidebar={module.leftSidebar}
          rightSidebar={module.rightSidebar}
          MainView={module.MainView}
          mainToolbar={module.mainToolbar} />
      </ModuleContext.Provider>
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

  return (
    <div className={styles.conceptBrowser}>
      <ConceptList
        lang={lang.selected as keyof typeof availableLanguages}
        className={styles.conceptList}
        concepts={concepts}
        isItemSelected={(ref: ConceptRef) => concept.ref === ref}
        onItemSelect={(ref: ConceptRef) => concept.select(ref)}
        itemMarker={(c: MultiLanguageConcept<any>) =>
          <span className={styles.conceptID}>{c.termid}</span>}
        itemMarkerRight={(c: MultiLanguageConcept<any>) => 
          !c[lang.selected as keyof typeof availableLanguages]
            ? <Tooltip content={`Missing entry in ${lang.available[lang.selected]}`}>
                <Icon intent="warning" icon="translate" />
              </Tooltip>
            : <Icon icon="blank" />}
      />
    </div>
  );
};

// Concept details

const ConceptDetails: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);
  const ctx = useContext(ConceptContext);
  const concept = ctx.activeLocalized;
  const isLoading = ctx.isLoading;

  let conceptDetails: JSX.Element;

  if (concept === null) {
    conceptDetails = <NonIdealState title={`Not yet translated into ${lang.available[lang.selected]}.`} />
  } else if (concept === undefined) {
    conceptDetails = <NonIdealState title="No concept is selected" />
  } else {
    conceptDetails = <EntryDetails isLoading={isLoading} entry={concept} />;
  }
  return (
    <div className={styles.backdrop}>
      {conceptDetails}
    </div>
  );
};

// Concept edit

const ConceptEditAuthoritative: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);
  const ctx = useContext(ConceptContext);
  const active = ctx.active;

  // Force switch to authoritative language
  useEffect(() => {
    if (lang.selected !== lang.default) {
      lang.select(lang.default);
    }
  }, [lang.selected]);

  const auth = active ? active[lang.default as keyof typeof availableLanguages] : undefined;

  if (active === null) {
    return <NonIdealState title="No concept is selected" />;
  } else if (auth === undefined) {
    return <NonIdealState icon="error" title="Concept is missing authoritative language entry" />;
  }

  return (
    <div className={styles.backdrop}>
      <EntryEdit
        concept={active}
        key={auth.id}
        entry={auth}
        isLoading={ctx.isLoading} />
    </div>
  );
};

// Concept edit non-authoritative versions

const ConceptTranslate: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);
  const ctx = useContext(ConceptContext);
  const mod = useContext(ModuleContext);

  const active = ctx.active;
  const entry = active ? active[lang.selected as keyof typeof availableLanguages] : undefined;

  const authVersion = ctx.active ? ctx.active[lang.default as keyof typeof availableLanguages] : null;
  const authIsValid: boolean | undefined = authVersion
    ? ['retired', 'superseded'].indexOf(authVersion.entry_status) < 0
    : undefined;

  const comparing = mod.opts.compareAuthoritative && authVersion;

  // Force switch to non-authoritative language
  useEffect(() => {
    if (lang.selected === lang.default) {
      lang.select(Object.keys(lang.available).filter(id => id !== lang.default)[0]);
    }
  }, [lang.selected]);

  const [proposedAuthSource, setProposedAuthSource] =
    useState<undefined | AuthoritativeSource>
    (entry?.authoritative_source);
  const [authSourceDraft, updateAuthSourceDraft] =
    useState<{ [K in keyof AuthoritativeSource]: string }>
    (initializeAuthSourceDraft(entry?.authoritative_source));

  useEffect(() => {
    setProposedAuthSource(entry?.authoritative_source);
    updateAuthSourceDraft(
      initializeAuthSourceDraft(entry?.authoritative_source));
  }, [lang.selected, active?.termid]);

  if (active === null) {
    return <NonIdealState title="No concept is selected" />;
  }

  function initializeAuthSourceDraft(authSource?: AuthoritativeSource) {
    return {
      ref: proposedAuthSource?.ref ||'',
      clause: proposedAuthSource?.clause || '',
      link: proposedAuthSource?.link?.toString() || '',
    };
  }

  function handleAuthSourceStringPropertyChange(field: keyof AuthoritativeSource) {
    return (evt: React.FormEvent<HTMLInputElement>) => {
      evt.persist();
      updateAuthSourceDraft(s => ({
        ...s,
        [field]: (evt.target as HTMLInputElement).value }));
    };
  }
  function handleAcceptAuthSourceDraft() {
    let link: URL;
    try {
      link = new URL(authSourceDraft.link);
    } catch (e) {
      toaster.show({
        icon: "error",
        intent: "danger",
        message: "You seem to have specified an incorrect URL as authoritative source link.",
      });
      return;
    }
    setProposedAuthSource({
      ref: authSourceDraft.ref,
      clause: authSourceDraft.clause,
      link: link,
    });
  }

  let entryWithSource: Concept<any, any> | undefined
  if (entry) {
    entryWithSource = entry;
  } else if (proposedAuthSource) {
    entryWithSource = {
      id: active?.termid,
      language_code: lang.selected,
      entry_status: 'proposed',
      term: '',
      definition: '',
      notes: [],
      examples: [],
      authoritative_source: proposedAuthSource,
    };
  } else {
    entryWithSource = undefined;
  };

  const authSourceForm = (
    <Callout
        className={styles.authSourceCallout}
        intent={authIsValid === true ? "primary" : "warning"}
        title="Authoritative source"
        key={`${active.termid}-${lang.selected}`}>
      <p>
        {authVersion && authIsValid === false
          ? <>
              Note: The authoritative language entry for this concept ({lang.available[authVersion.language_code]})
              has status {authVersion.entry_status}. If you are sure, please </>
          : <>Please </>}
        specify the authoritative source you will use for translating this concept to {lang.available[lang.selected]}.
      </p>
      <FormGroup label="Standard reference" labelInfo="(required)">
        <InputGroup large fill required
          type="text"
          placeholder="ISO 1234:2345"
          value={authSourceDraft.ref}
          onChange={handleAuthSourceStringPropertyChange('ref')} />
      </FormGroup>
      <FormGroup label="Clause" labelInfo="(required)">
        <InputGroup large fill required
          type="text"
          placeholder="3.4"
          value={authSourceDraft.clause}
          onChange={handleAuthSourceStringPropertyChange('clause')} />
      </FormGroup>
      <FormGroup label="Link" labelInfo="(must be a valid URL)">
        <InputGroup large fill required
          placeholder="http://example.com/"
          type="text"
          value={authSourceDraft.link}
          onChange={handleAuthSourceStringPropertyChange('link')} />
      </FormGroup>
      <Button large intent={authIsValid ? "primary" : undefined} onClick={handleAcceptAuthSourceDraft}>
        Proceed to translation
      </Button>
    </Callout>
  );

  return (
    <div className={styles.backdrop}>

      <div className={`${styles.translateConcept} ${comparing ? styles.translateConceptComparison : ''}`}>
        {entryWithSource
          ? <EntryEdit
              key={`${active.termid}-${lang.selected}`}
              concept={active}
              entry={entryWithSource}
              isLoading={ctx.isLoading} />
          : authSourceForm}
      </div>

      {comparing && authVersion
        ? <div className={styles.examineConcept}><EntryDetails entry={authVersion} /></div>
        : null}

    </div>
  );
};


const ConceptMap: React.FC<{}> = function () {
  const ctx = useContext(ConceptContext);
  const cyRef = useRef<Cy | null>(null);
  const lang = useContext(LangConfigContext);
  const source = useContext(SourceContext);
  const concepts = source.objects;

  useEffect(() => {
    function onSelect(evt: { target: CyNode }) {
      const node = evt.target;
      ctx.select(parseInt(node.id(), 10));
    }
    if (cyRef.current) {
      cyRef.current.on('tap', 'node', onSelect);
      cyRef.current.$('*').lock();
    }

    reflectSelection();

    return function cleanup() {
      cyRef.current?.off('tap', 'node', onSelect);
    }
  }, [cyRef.current]);

  function reflectSelection() {
    cyRef.current?.$(':selected').unselect();
    cyRef.current?.getElementById(`${ctx.ref}`).select();
  }

  useEffect(() => {
    reflectSelection();
  }, [ctx.ref]);

  const elements = concepts.map(c => (
    { data: { id: c.termid, label: c[lang.selected as keyof typeof availableLanguages]?.term || c[lang.default as keyof typeof availableLanguages]?.term, selected: c.termid == ctx.ref }}
  ));

  const elementStyles = [
    {
      selector: 'node',
      style: {
        boundsExpansion: 10,
        label: 'data(label)',
        textWrap: 'ellipsis',
        textMaxWidth: 150,
      },
    },
    {
      selector: 'edge',
      style: {
        width: 15,
      },
    },
  ];

  return (
    <CytoscapeComponent
      cy={cy => cyRef.current = cy}
      elements={elements}
      style={{ width: window.innerWidth, height: window.innerHeight }}
      stylesheet={elementStyles}
      layout={{ name: 'grid', nodeDimensionsIncludeLabels: true }} />
  );
};


/* Toolbar */

const SelectLanguage: ToolbarItem = function () {
  return <LangSelector />;
};

const CompareLanguage: ToolbarItem = function () {
  const concept = useContext(ConceptContext);
  return <LangSelectorWide
    untranslatedProps={{ disabled: true }}
    value={concept.active || undefined}
  />;
};

const SelectTargetLanguage: ToolbarItem = function () {
  const active = useContext(ConceptContext).active;
  const lang = useContext(LangConfigContext);

  return (
    active !== null
      ? <LangSelectorWide
          untranslatedProps={{ intent: "primary" }}
          exclude={[lang.default]}
          value={active || undefined}
        />
      : null
  );
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
  const searchFieldRef = useRef<HTMLInputElement | null>(null);
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

  useEffect(() => {
    Mousetrap.bind('mod+f', () => searchFieldRef.current?.focus());

    Mousetrap.bindGlobal('escape', () => {
      if (searchFieldRef.current && document.activeElement === searchFieldRef.current) {
        searchFieldRef.current.blur();
      }
    });

    return function cleanup() {
      Mousetrap.unbind('mod+f');
      Mousetrap.unbind('escape');
    }
  }, []);

  return <InputGroup round
    value={query}
    onChange={handleChange}
    inputRef={(ref: HTMLInputElement | null) => { searchFieldRef.current = ref }}
    leftIcon="search"
    placeholder="Type to search…"
    title="Search is performed across English designations and definitions, as well as concept identifiers. (mod+f)"
    rightElement={<Button minimal icon="cross" onClick={() => setQuery('')} />}
  />;
};

const CompareAuthoritative: ToolbarItem = function () {
  const modCtx = useContext(ModuleContext);
  const compare = modCtx.opts.compareAuthoritative === true;

  return <Button
    icon="comparison"
    title="Compare with authoritative language"
    active={compare}
    onClick={() => { modCtx.setOpts({ compareAuthoritative: !compare }); }} />
};

const AddCollection: ToolbarItem = function () {
  return <Button icon="add" title="Add collection" disabled={true} />;
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
  const [isCollapsed, setCollapsedState] = useState<boolean>(isCollapsedByDefault || false);

  useEffect(() => {
    onToggle ? onToggle(isCollapsed) : void 0;
  }, [isCollapsed]);

  function onCollapse() {
    onToggle ? onToggle(true) : void 0;
    setCollapsedState(true);
  }
  function onExpand() {
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


/* Sidebars */ 

const SPanel: React.FC<{ cfg: PanelConfig<any> }> = function ({ cfg }) {
  return (
    <Panel
        className={`${styles.sidebarPanel} ${cfg.className || ''}`}
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
  const [firstPanel, ...restOfPanels] = panelSet;

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
        <SPanel cfg={firstPanel} />
      </div>

      <div className={styles.restOfPanels}>
        {[...restOfPanels.entries()].map(([idx, cfg]) =>
          <SPanel key={idx} cfg={cfg} />
        )}
      </div>

      {lastPanel
        ? <div className={styles.fixedPanel}>
            <SPanel cfg={lastPanel} />
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
  className?: string
  props?: T
  collapsed?: 'never' | 'by-default'
}

const PANELS: { [id: string]: PanelConfig<any> } = {
  system: { Contents: panels.SystemPanel, title: "System" },
  databases: { Contents: panels.DatabasePanel, title: "Repositories" },
  sourceRollTranslated: {
    Contents: panels.PossiblyTranslatedSourceRoll,
    className: styles.sourceRollPanel,
    title: "Source",
    Title: SourceRollTitle },
  sourceRollAuthoritative: {
    Contents: panels.AuthoritativeLanguageSourceRoll,
    className: styles.sourceRollPanel,
    title: "Source",
    Title: SourceRollTitle },

  collections: { Contents: panels.CollectionsPanel, title: "Collections", actions: [AddCollection] },
  catalog: { Contents: panels.CatalogPanel, title: "Catalog" },
  basics: { Contents: panels.BasicsPanel, title: "Basics" },
  status: { Contents: panels.StatusPanel, title: "Status" },
  currentReview: { Contents: panels.CurrentReviewPanel, title: "Current review" },
  uses: { Contents: panels.LineagePanel, title: "Lineage" },

  changelog: { Contents: () => <panels.PanelPlaceholder />, title: "Changelog" },
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
    MainView: ConceptEditAuthoritative,
    mainToolbar: [],
    rightSidebar: [PANELS.status, PANELS.currentReview, PANELS.relationships, PANELS.changelog],
  },
  map: {
    hotkey: 'm',
    title: "Map",
    leftSidebar: [PANELS.system, PANELS.sourceRollTranslated, PANELS.databases],
    MainView: ConceptMap,
    mainToolbar: [],
    rightSidebar: [PANELS.status, PANELS.relationships],
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
    hotkey: 'l',
    title: "Translate",
    leftSidebar: [PANELS.system, PANELS.changelog, PANELS.sourceRollTranslated, PANELS.databases],
    MainView: ConceptTranslate,
    mainToolbar: [CompareAuthoritative, SelectTargetLanguage],
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
  'map',
]


/* Modules */

// Allows setting arbitrary view options for a module.
const ModuleContext =
  React.createContext<{ opts: any, setOpts: (opts: any) => void }>
  ({ opts: {}, setOpts: () => {} });

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
    objects: Object.values(_objs.objects).sort((a, b) => a.termid - b.termid),
  };

  // One-off collection migration call
  const collectionsMigrated = useRef({ yes: false });
  useEffect(() => {
    if (concepts.ids.length > 0 && collectionsMigrated.current.yes !== true) {
      callIPC('initialize-standards-collections');
      collectionsMigrated.current.yes = true;
    }
  }, [concepts.ids.length]);


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