import { debounce } from 'throttle-debounce';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Text, InputGroup, Button, Tag } from '@blueprintjs/core';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';

import { MultiLanguageConcept } from 'models/concepts';
import {
  SourceContext,
  TextSearchContext,
} from '../contexts';
import { ConceptList, refToString } from '../concepts';
import * as panels from '../panels';
import { ModuleConfig, ToolbarItem } from '../module-config';
import { availableLanguages } from 'app';
import sharedStyles from '../styles.scss';
import styles from './browse.scss';
import { remote } from 'electron';


const MainView: React.FC<{}> = function () {
  const source = useContext(SourceContext);
  const concepts = source.objects;
  const lang = useContext(LangConfigContext);

  function renderItemMarker(c: MultiLanguageConcept<any>): JSX.Element {
    const entry = c[lang.selected as keyof typeof availableLanguages];
    if (!entry) {
      return <Tag minimal icon="translate" intent="danger">Not translated</Tag>
    }
    const lcStage = entry.lifecycle_stage;
    if (!lcStage) {
      return <Tag minimal icon="flow-linear" intent="danger">Missing lifecycle stage</Tag>
    }
    return <>
      <Tag intent="primary" icon="flow-linear" className={styles.lifecycleStage}>{lcStage}</Tag>
    </>;
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


const SortOrder: ToolbarItem = function () {
  const src = useContext(SourceContext).active;
  if (src.type === 'catalog-preset' && src.presetName === 'all') {
    return <Button disabled icon="sort-numerical">Concept&nbsp;ID</Button>;
  } else {
    return <Button disabled icon="sort">Custom order</Button>;
  }
};


const LanguageMenu: ToolbarItem = function () {
  const lang = useContext(LangConfigContext);
  const langName = lang.available[lang.selected];

  function invokeLanguageMenu() {
    const m = new remote.Menu();

    const translatedLanguages = Object.entries(lang.available).
    filter(([langID, _]) => langID !== lang.default)

    m.append(new remote.MenuItem({
      label: `${lang.available[lang.default]} (authoritative)`,
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
      rightIcon="caret-up"
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
  hotkey: 'b',
  title: "Browse",

  leftSidebar: [
    panels.system,
    panels.catalog,
    panels.collections,
    panels.databases,
  ],

  MainView,
  mainToolbar: [() => <LanguageMenu />, SearchByText, SortOrder],

  rightSidebar: [
    panels.basics,
    panels.relationships,
    panels.lifecycle,
    panels.reviews,
    panels.status,
    panels.lineage,
  ],
} as ModuleConfig;