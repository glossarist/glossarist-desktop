import update from 'immutability-helper';
import { debounce } from 'throttle-debounce';
import { remote } from 'electron';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Text, InputGroup, Button, Tag, ButtonGroup, Icon } from '@blueprintjs/core';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';

import { MultiLanguageConcept, SupportedLanguages } from 'models/concepts';
import {
  SourceContext,
  ObjectQueryContext,
} from '../contexts';
import { ConceptList, refToString } from '../concepts';
import * as panels from '../panels';
import { ModuleConfig, ToolbarItem } from '../module-config';
import { availableLanguages } from 'app';
import sharedStyles from '../styles.scss';
import styles from './browse.scss';


const MainView: React.FC<{}> = function () {
  const source = useContext(SourceContext);
  const concepts = source.objects;
  const lang = useContext(LangConfigContext);

  function renderItemMarker(c: MultiLanguageConcept<any>): JSX.Element {
    const entry = c[lang.selected as keyof typeof availableLanguages];
    if (!entry) {
      return <Tag minimal icon="translate" intent="danger">Not translated</Tag>
    }
    return <></>;
  }

  return (
    <div className={styles.conceptBrowser}>
      <ConceptList
        lang={lang.selected as keyof typeof availableLanguages}
        concepts={concepts}
        itemMarker={(c: MultiLanguageConcept<any>) =>
          <span className={sharedStyles.conceptID}>{refToString(c.termid)}</span>}
        itemMarkerRight={renderItemMarker}
      />
    </div>
  );
};


const SearchByText: ToolbarItem = function () {
  const queryCtx = useContext(ObjectQueryContext);
  const searchFieldRef = useRef<HTMLInputElement | null>(null);
  const [text, updateText] = useState(queryCtx.query.matchingText || '' as string);

  const handleChange = function (evt: React.FormEvent<HTMLInputElement>) {
    updateText((evt.target as HTMLInputElement).value);
  }
  function _updateQuery(newText: string) {
    queryCtx.setQuery({ ...queryCtx.query, matchingText: newText.trim() || undefined });
  }
  const updateQuery = debounce(400, _updateQuery);

  useEffect(() => {
    updateQuery(text);
    return function cleanup() {
      updateQuery.cancel();
    }
  }, [text]);

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

  return <InputGroup
    value={text}
    onChange={handleChange}
    inputRef={(ref: HTMLInputElement | null) => { searchFieldRef.current = ref }}
    leftIcon="search"
    placeholder="Type to search…"
    title="Search is performed across English designations and definitions, as well as concept identifiers. (mod+f)"
    rightElement={<Button minimal icon="cross" onClick={() => updateText('')} />}
  />;
};


const SortOrder: ToolbarItem = function () {
  const src = useContext(SourceContext).active;
  if (src.type === 'catalog-preset' && src.presetName === 'all') {
    return <Button disabled icon="sort-numerical">Concept&nbsp;ID</Button>;
  } else {
    return <Button disabled icon="sort">Custom order</Button>;
  }
};


const FilterMenu: ToolbarItem = function () {
  const lang = useContext(LangConfigContext);
  const queryCtx = useContext(ObjectQueryContext);

  useEffect(() => {
    if (lang.selected === lang.default) {
      queryCtx.setQuery(update(queryCtx.query, { $unset: ['localization'] }));
    } else if (queryCtx.query.localization) {
      queryCtx.setQuery(update(
        queryCtx.query,
        { localization: { lang: { $set: lang.selected as keyof SupportedLanguages } } }));
    }
  }, [lang.selected]);

  function invokeFilterMenu() {
    const m = new remote.Menu();

    const localizationMenu = new remote.Menu();

    if (lang.selected !== lang.default) {
      localizationMenu.append(new remote.MenuItem({
        type: 'radio',
        label: "Missing",
        toolTip: `Localized entry is missing in ${lang.available[lang.selected]}`,
        checked: queryCtx.query.localization?.status === 'missing',
        click: () => queryCtx.setQuery({
          ...queryCtx.query,
          localization: { lang: lang.selected as keyof SupportedLanguages, status: 'missing' },
        }),
      }));
      localizationMenu.append(new remote.MenuItem({
        type: 'radio',
        label: "Possibly outdated",
        toolTip: `Authoritative version changed since last update of localized entry in ${lang.available[lang.selected]}`,
        checked: queryCtx.query.localization?.status === 'possiblyOutdated',
        click: () => queryCtx.setQuery({
          ...queryCtx.query,
          localization: { lang: lang.selected as keyof SupportedLanguages, status: 'possiblyOutdated' },
        }),
      }));
    }

    m.append(new remote.MenuItem({
      label: "Localization status",
      enabled: lang.selected !== lang.default,
      sublabel: queryCtx.query.localization ? 'Applied' : undefined,
      submenu: localizationMenu,
    }));

    m.popup({ window: remote.getCurrentWindow() });
  }

  return (
    <ButtonGroup>
      <Button
        icon="filter"
        title="Filter concepts"
        onClick={invokeFilterMenu}
        active={queryCtx.query.localization !== undefined} />
      {queryCtx.query.localization !== undefined
        ? <Button
            title="Reset filters"
            icon="cross"
            onClick={() => queryCtx.setQuery(update(queryCtx.query, { $unset: ['localization'] }))} />
        : null}
    </ButtonGroup>
  );
};


const LanguageMenu: ToolbarItem = function () {
  const lang = useContext(LangConfigContext);
  const langName = lang.available[lang.selected];

  function invokeLanguageMenu() {
    const m = new remote.Menu();

    const translatedLanguages = Object.entries(lang.available).
    filter(([langID, _]) => langID !== lang.default)

    m.append(new remote.MenuItem({
      label: lang.available[lang.default],
      sublabel: 'authoritative',
      enabled: lang.selected !== lang.default,
      click: () => lang.select(lang.default),
    }));
    m.append(new remote.MenuItem({ type: 'separator' }));

    for (const [langID, langName] of translatedLanguages) {
      m.append(new remote.MenuItem({
        label: langName,
        enabled: lang.selected !== langID,
        click: () => lang.select(langID),
      }));
    }

    m.popup({ window: remote.getCurrentWindow() });
  }

  return (
    <Button
      icon="translate"
      onClick={invokeLanguageMenu}
      active={lang.selected !== lang.default}
      title={lang.selected !== lang.default
        ? `Showing ${langName} translation`
        : `Showing default language (${langName})`}
      text={lang.selected !== lang.default
        ? <Text ellipsize>{langName}</Text>
        : undefined} />
  );
};


export default {
  hotkey: 'a',
  title: "List",

  leftSidebar: [
    panels.system,
    panels.catalog,
    panels.collections,
    panels.help,
  ],

  MainView,
  mainToolbar: [() => <LanguageMenu />, FilterMenu, SearchByText, SortOrder],

  rightSidebar: [
    panels.basics,
    panels.relationships,
    panels.status,
    { className: sharedStyles.flexiblePanelSeparator,
      Contents: () => <span><Icon icon="chevron-down" />{" "}Lineage</span>,
      collapsed: 'never' },
    panels.lineage,
    panels.revision,
  ],
} as ModuleConfig;