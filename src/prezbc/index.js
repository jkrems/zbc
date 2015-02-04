'use strict';

const LOCAL_INCLUDE = /^#include "([^"]+)"$/m;
const STD_INCLUDE = /^#include <([^>]+)>$/m;

function preprocess(source, loader) {
  return source
    .replace(LOCAL_INCLUDE, function(_, file) {
      return loader.loadLocal(file);
    })
    .replace(STD_INCLUDE, function(_, file) {
      return loader.loadStandard(file);
    });
}
module.exports = preprocess;
