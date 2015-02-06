'use strict';

const LOCAL_INCLUDE = /^#include "([^"]+)"$/m;
const STD_INCLUDE = /^#include <([^>]+)>$/m;

function preprocess(source, loader) {
  return source
    .replace(LOCAL_INCLUDE, function(_, file) {
      return preprocess(loader.loadLocal(file), loader);
    })
    .replace(STD_INCLUDE, function(_, file) {
      return preprocess(loader.loadStandard(file), loader);
    });
}
module.exports = preprocess;
