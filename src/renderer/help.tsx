import { useEffect, useContext, useState } from 'react';
import axios from 'axios';
import { DocsContext, HoveredItem } from './home/contexts';


const GENERAL_HELP_ROOT = 'https://www.glossarist.org';
const IN_APP_HELP_ROOT = `${GENERAL_HELP_ROOT}/_in_app_help`;


export function openHelpPage(path: string) {
  require('electron').shell.openExternal(`${GENERAL_HELP_ROOT}${path}`);
}


import memoizeOne from 'memoize-one';

const memoizedReq = memoizeOne(async (itemID: string) => {
  let resp: { data: { link?: string, excerpt: string, title: string } };
  try {
    resp = await axios.get(`${IN_APP_HELP_ROOT}/${itemID}.json`);
  } catch (e) {
    console.error("Failed to fetch docs for item", itemID);
    return;
  }
  return resp;
});


export function useHelp(itemID: string): (item: HTMLElement) => void {
  const ctx = useContext(DocsContext);
  const [ref, setRef] = useState<HTMLElement | null>(document.createElement('div'));
  const [itemHelp, setItemHelp] = useState<HoveredItem | null>(null);

  useEffect(() => {
    (async () => {
      const _resp = await memoizedReq(itemID);
      if (!_resp) {
        setItemHelp(null);
        return;
      }

      const item: HoveredItem = {
        title: _resp.data.title,
        excerpt: _resp.data.excerpt,
        readMoreURL: _resp.data.link || null,
      };
      if (JSON.stringify(item) !== JSON.stringify(itemHelp)) {
        setItemHelp(item);
      }
    })();
  }, [itemID]);

  useEffect(() => {
    async function handleMouseOver(evt: MouseEvent) {
      evt.stopPropagation();
      if (JSON.stringify(itemHelp) !== JSON.stringify(ctx.hoveredItem)) {
        setImmediate(() => {
          ctx.setHoveredItem(itemHelp);
        });
      }
    }

    ref?.addEventListener('mouseover', handleMouseOver);

    return function cleanup() {
      ref?.removeEventListener('mouseover', handleMouseOver);
    }
  }, [itemHelp, ref]);


  return setRef;
}


// Attempting a HOC
// export function withHelp<T>
// (Component: React.FC<React.PropsWithRef<T>>, itemID: string): React.FC<React.PropsWithRef<T>> {
//   return (props) => {
//     const ref = useHelp(itemID);
//     return <Component {...props } ref={ref} />;
//   }
// }