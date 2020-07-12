import React, { useRef, useEffect } from 'react';
import { Colors } from '@blueprintjs/core'
import { annotate } from 'rough-notation';
import { RoughAnnotation, RoughAnnotationConfig } from 'rough-notation/lib/model';


function annotateChange(
  type: 'added' | 'removed',
  wrappingEl: HTMLSpanElement,
  childIsBoxy: boolean | undefined):
RoughAnnotation[] {
  let highlightConfig: RoughAnnotationConfig = {
    type: 'highlight',
    animate: false,
    color: Colors.GOLD5,
    iterations: 3,
  }
  let changeConfig: RoughAnnotationConfig;
  if (type === 'added') {
    changeConfig = {
      type: childIsBoxy ? 'bracket' : 'underline',
      iterations: 1,
      color: Colors.BLUE4,
    };
  } else {
    changeConfig = {
      type: 'crossed-off',
      iterations: 1,
      color: Colors.RED3,
    };
  }
  const highlightAnnotation = annotate(wrappingEl, highlightConfig);
  const changeAnnotation = annotate(wrappingEl, changeConfig);

  return [highlightAnnotation, changeAnnotation];
}


export const AnnotatedChange: React.FC<{ type: 'added' | 'removed' }> = ({ type, children }) => {
  const elRef = useRef<HTMLSpanElement | null>(null);

  const firstChild = React.Children.toArray(children)[0];

  const childType = React.isValidElement(firstChild) ? firstChild.type : undefined;
  const childIsBoxy = childType === 'div';

  // Could it bring more accuracy to block/inline detection?
  //const childCount = React.isValidElement(firstChild) ? React.Children.count(firstChild.props.children) : undefined;

  useEffect(() => {
    if (elRef.current) {
      const annotations = annotateChange(type, elRef.current, childIsBoxy);
      for (const a of annotations) {
        a.show();
      }
      return function cleanup() {
        for (const a of annotations) {
          a.remove();
        }
      }
    }
    return;
  }, [elRef.current]);

  return (
    <mark
        style={{ display: childIsBoxy ? 'block' : 'inline', background: 'none' }}
        ref={elRef}
        title={`(${type} in this proposal)`}>
      {children}
    </mark>
  );
};
