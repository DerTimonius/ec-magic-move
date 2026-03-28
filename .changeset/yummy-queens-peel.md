---
"ec-magic-move": patch
---

_fix: remove imports from js-module_

In a production build of Astro, the imports of the js module were not working as intended. Now, the necessary code is part of the build.
