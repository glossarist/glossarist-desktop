import * as crypto from 'crypto';
import * as http from 'https';

import React, { useRef, useEffect, useState } from 'react';
import { TextArea, ITextAreaProps } from '@blueprintjs/core';


const md5 = (contents: string) => crypto.createHash('md5').update(contents).digest("hex");

// SVG headshot silhouette in data: format
const DEFAULT_COMMITTER_PIC = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' data-icon='person' width='16' height='16' viewBox='0 0 16 16'%3E%3Cdesc%3Eperson%3C/desc%3E%3Cpath d='M15.68 14.32c-.46-1.05-2.68-1.75-4.16-2.4-1.48-.65-1.28-1.05-1.33-1.59-.01-.07-.01-.15-.01-.23.51-.45.92-1.07 1.19-1.78 0 0 .01-.04.02-.05.06-.15.11-.32.15-.48.34-.07.54-.44.61-.78.08-.14.23-.48.2-.87-.05-.5-.25-.73-.47-.82v-.09c0-.63-.06-1.55-.17-2.15A3.671 3.671 0 0010.32.72C9.68.25 8.79-.01 8-.01c-.79 0-1.68.25-2.31.73-.61.47-1.06 1.13-1.28 1.86-.05.17-.09.33-.11.5-.12.6-.17 1.51-.17 2.15v.08c-.24.09-.45.32-.5.83-.03.38.13.72.2.86.08.35.28.72.63.78.04.17.09.33.15.49 0 .01.01.02.01.03l.01.01c.27.72.7 1.35 1.22 1.8 0 .07-.01.14-.01.21-.05.54.1.94-1.37 1.59-1.48.65-3.7 1.35-4.16 2.4-.46 1.05-.27 1.67-.27 1.67h15.92c-.01.01.18-.61-.28-1.66z' fill-rule='evenodd'%3E%3C/path%3E%3C/svg%3E";


interface CommitterPicProps {
  email: string
  style?: React.CSSProperties
  className?: string 
}
export const CommitterPic: React.FC<CommitterPicProps> = function ({ email, style, className }) {
  const [pic, setPic] = useState<string>(DEFAULT_COMMITTER_PIC);

  useEffect(() => {
    setPic(DEFAULT_COMMITTER_PIC);
    const gravatarURL = `https://www.gravatar.com/avatar/${md5(email)}`;
    const req = http.request(
      `${gravatarURL}?d=404`,
      { method: 'HEAD' },
      () => { setPic(`${gravatarURL}?s=48`) });
    req.write('');
    req.end();
  }, [email]);

  return <img
    style={{ objectFit: 'cover', marginRight: 6, height: 20, width: 20, verticalAlign: '-webkit-baseline-middle', ...style }}
    className={className}
    src={pic} />
}


export const AutoSizedTextArea: React.FC<ITextAreaProps> = function (props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      adjustTextareaHeight(entries[0].target as HTMLTextAreaElement);
    });

    if (ref.current) {
      resizeObserver.observe(ref.current);
    } else {
      throw new Error("Failed to add auto-sized textarea component to elements observed for resize");
    }

    return function cleanup() {
      resizeObserver.disconnect();
    }
  }, []);

  useEffect(() => {
    if (ref.current) {
      adjustTextareaHeight(ref.current);
    }
  }, [props.value]);

  return <TextArea {...props} inputRef={(el) => ref.current = el} />;
};


function adjustTextareaHeight(el: HTMLTextAreaElement) {
  el.style.height = '';
  el.style.height = `${el.scrollHeight + 3}px`;
}