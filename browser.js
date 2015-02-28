'use strict';

var marked = require('marked');
var highlight = require('highlight.js');

marked.setOptions({
  highlight: function (code, lang) {
    return highlight.highlight(lang, code).value;
  }
});

var sections = [].slice.apply(document.getElementsByTagName('section'));
sections.forEach(function(section) {
  section.innerHTML = marked(section.textContent);
});
