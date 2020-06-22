import * as crypto from 'crypto';
import * as http from 'https';

import React, { useRef, useEffect, useState } from 'react';
import { TextArea, ITextAreaProps, Icon } from '@blueprintjs/core';


const md5 = (contents: string) => crypto.createHash('md5').update(contents).digest("hex");

// SVG headshot silhouette in data: format
const DEFAULT_COMMITTER_PIC = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' data-icon='person' width='20' height='20' viewBox='-5 -5 30 30'%3E%3Cdesc%3Eperson%3C/desc%3E%3Cpath d='M19.61 17.91c-.57-1.32-3.35-2.19-5.19-3.01-1.85-.82-1.59-1.31-1.66-1.99-.01-.09-.01-.19-.02-.29.63-.56 1.15-1.33 1.49-2.22 0 0 .02-.05.02-.06.07-.19.13-.39.19-.6.42-.09.67-.55.76-.98.1-.17.29-.6.25-1.08-.06-.62-.31-.91-.59-1.03v-.11c0-.79-.07-1.93-.22-2.68A4.55 4.55 0 0012.9.92C12.11.32 11 0 10.01 0s-2.1.32-2.89.92a4.55 4.55 0 00-1.74 2.94c-.14.75-.22 1.89-.22 2.68v.1c-.29.11-.55.4-.61 1.04-.04.48.15.91.25 1.08.1.44.35.91.79.98.05.21.12.41.19.6 0 .01.01.03.01.04l.01.02c.34.91.87 1.69 1.52 2.25 0 .09-.01.18-.02.26-.07.68.13 1.17-1.72 1.99S.96 16.59.39 17.91C-.18 19.23.05 20 .05 20h19.9s.23-.77-.34-2.09z' fill-rule='evenodd'%3E%3C/path%3E%3C/svg%3E";


interface CommitterPicProps {
  email: string
  style?: React.CSSProperties
  className?: string 
  size?: number
}
export const CommitterPic: React.FC<CommitterPicProps> = function ({ email, style, className, size }) {
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

  const effectiveStyle: React.CSSProperties = {
    objectFit: 'cover',
    marginRight: 6,
    height: size || Icon.SIZE_LARGE,
    width: size || Icon.SIZE_LARGE,
    verticalAlign: '-webkit-baseline-middle',
    ...style,
  };

  return <img
    style={effectiveStyle}
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