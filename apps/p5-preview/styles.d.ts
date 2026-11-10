// Standalone UI checks do not load Next's global CSS module declarations.
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
