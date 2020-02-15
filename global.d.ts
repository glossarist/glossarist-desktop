declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

interface HTMLElement {
  scrollIntoViewIfNeeded: () => void
}