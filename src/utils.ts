// production build is considered to be run from the built ./dist/ dir, and worker path will change from .ts to .js
export const isJsBuild = () => process.env.JSBUILD !== undefined;