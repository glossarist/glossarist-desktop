import React, { useContext } from 'react';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { Position, Popover, Button, Menu } from '@blueprintjs/core';


const LanguageMenu: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);

  return <Menu>
    {Object.entries(lang.available).map(([langId, langName]) => (
      <Menu.Item key={langId} text={langName} onClick={() => lang.select(langId)} />
    ))}
  </Menu>;
};

export const LangSelector: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);

  return <Popover content={<LanguageMenu />} position={Position.RIGHT_TOP}>
    <Button icon="translate" text={lang.available[lang.selected]} small={true} />
  </Popover>;
};