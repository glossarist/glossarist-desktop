import * as crypto from 'crypto';

import React, { useRef, useEffect } from 'react';
import { TextArea, ITextAreaProps } from '@blueprintjs/core';


export const md5 = (contents: string) => crypto.createHash('md5').update(contents).digest("hex");


interface CommitterPicProps {
  email: string
  style?: React.CSSProperties
  className?: string 
}
export const CommitterPic: React.FC<CommitterPicProps> = function ({ email, style, className }) {
  return <img
    style={{ marginRight: 6, height: 20, width: 20, verticalAlign: '-webkit-baseline-middle', ...style }}
    className={className}
    src={`https://www.gravatar.com/avatar/${md5(email)}?s=48`} />
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