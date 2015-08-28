var TYPE_SPLITTER = /,|\|/

function parseProperty(docstring) {
  var typeInfo = {};

  var STATE_PARSING_TYPE = 1;
  var STATE_PARSING_NAME = 2;
  var STATE_PARSING_DEFAULT_VALUE = 3;
  var STATE_PARSING_DESCRIPTION = 4;
  var state = STATE_PARSING_TYPE;

  var typeStr = '';
  var nameStr;
  var descStr;

  docstring.trim().split('').forEach(function(char) {
    switch (state) {
      case STATE_PARSING_TYPE:
        if (char === '}') {
          state = STATE_PARSING_NAME;
          nameStr = '';
        }
        else if (char !== '{') {
          typeStr += char;
        }

        break;

      case STATE_PARSING_NAME:
        if (char === '[') {
          typeInfo.isOptional = true;
        }
        else if (char === '=') {
          state = STATE_PARSING_DEFAULT_VALUE;
          typeInfo.defaultValue = '';
        }
        else if (char === '\n') {
          state = STATE_PARSING_DESCRIPTION;
        }
        else if (char !== ' ' && char !== '\t' && char !== ']') {
          nameStr += char;
        }

        break;

      case STATE_PARSING_DEFAULT_VALUE:
        if (char === '\n') {
          state = STATE_PARSING_DESCRIPTION;
        }
        else if (char !== ']') {
          typeInfo.defaultValue += char;
        }
        break;

      case STATE_PARSING_DESCRIPTION:
        if (!descStr) {
          descStr = '';
        }

        descStr += char;

        break;
    }
  });

  typeInfo.types = typeStr.split(TYPE_SPLITTER);
  typeInfo.name = nameStr ? nameStr.trim() : undefined;
  typeInfo.description = descStr ? descStr.trim() : undefined;

  return typeInfo;
}

module.exports = parseProperty;