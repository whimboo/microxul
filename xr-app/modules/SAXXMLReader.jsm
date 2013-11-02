const EXPORTED_SYMBOLS = ["SAXXMLReader"];

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function voidFunc() { /* do nothing */ }
var NativeXMLReader = Components.Constructor(
  "@mozilla.org/saxparser/xmlreader;1",
  "nsISAXXMLReader"
);

function SAXXMLReader() {
  this.__native__ = new NativeXMLReader;
  this.__stopAllException__ = null;

  // callback function for exceptions that we can't handle safely
  this.abortHandler = null;
  this.__postAbortCount__ = 0;

  this.__observer__ = null;
}

SAXXMLReader.prototype = {
  __corrupted__: function(methodName) {
    if (this.__stopAllException__ && (typeof this.abortHandler == "function")) {
      try {
        this.abortHandler(this.__stopAllException__, ++this.__postAbortCount__, methodName);
      }
      catch (e) {
        // drop it, just move on
      }
    }
    return Boolean(this.__stopAllException__);
  },

  stopAll: function(exn, methodName) {
    if (!this.__stopAllException__) {
      this.__stopAllException__ = exn;
      if (typeof this.abortHandler == "function") {
        try {
          this.abortHandler(exn, ++this.__postAbortCount__, methodName);
        }
        catch (e) {
          // drop it, just move on
        }
      }
    }
  },
  
  // nsISAXXMLReader
  baseURI: null,
  
  /* See below for these.
    contentHandler: null,
    dtdHandler: null,
    errorHandler: null,
    declarationHandler: null,
    lexicalHandler: null,
  */
  
  setFeature: function(name, value) {
    this.__native__.setFeature(name, value);
  },
  getFeature: function(name) {
    return this.__native__.getFeature(name);
  },
  setProperty: function(name, value) {
    this.__native__.setProperty(name, value);
  },
  getProperty: function(name) {
    this.__native__.getProperty(name);
  },

  parseFromString: function(str, contentType) {
    if (this.__corrupted__("parseFromString"))
      return;
    this.__native__.parseFromString(str, contentType);
  },

  parseFromStream: function(stream, charset, contentType) {
    if (this.__corrupted__("parseFromStream"))
      return;
    this.__native__.parseFromStream(stream, charset, contentType);
  },

  parseAsync: function(observer) {
    this.__native__.parseAsync(observer);
  },

  // nsIStreamListener
  onDataAvailable: function(aRequest, aContext, aStream, aOffset, aCount) {
    this.__native__.onDataAvailable(aRequest, aContext, aStream, aOffset, aCount);
  },

  // nsIRequestObserver
  onStartRequest: function(aRequest, aContext) {
    this.__native__.onStartRequest(aRequest, aContext);
  },
  onStopRequest: function(aRequest, aContext, aStatus) {
    this.__native__.onStopRequest(aRequest, aContext, aStatus);
  },

  // nsISupports
  QueryInterface: XPCOMUtils.generateQI([
    "nsISAXXMLReader",
    "nsIStreamListener",
    "nsIRequestObserver"
  ])
};

[
  "contentHandler",
  "dtdHandler",
  "errorHandler",
  "declarationHandler",
  "lexicalHandler",
].forEach(function(nativeHandlerType) {
  Object.defineProperty(this, nativeHandlerType, {
    configurable: true,
    enumerable: true,
    get: function() null,
    set: function(outerHandler) {
      var pvtObject = {};
      var parser = this;

      MethodLists.safe[nativeHandlerType].forEach(function(key) {
        if (typeof outerHandler[key] != "function") {
          pvtObject[key] = voidFunc;
        }
        else {
          pvtObject[key] = function() {
            if (parser.__corrupted__(key)) {
              return null;
            }
            return outerHandler[key].apply(outerHandler, arguments);
          };
        }
      });

      MethodLists.risky[nativeHandlerType].forEach(function(key) {
        if (typeof outerHandler[key] != "function") {
          pvtObject[key] = voidFunc;
        }
        else {
          pvtObject[key] = function() {
            if (parser.__corrupted__(key)) {
              return null;
            }
            try {
              return outerHandler[key].apply(outerHandler, arguments);
            }
            catch (e) {
              parser.stopAll(e, key);
              return null;
            }
          };
        }
      });

      pvtObject.QueryInterface = MethodLists.QI[nativeHandlerType];

      Object.freeze(pvtObject);
      this.__native__[nativeHandlerType] = pvtObject;

      Object.defineProperty(this, nativeHandlerType, {
        configurable: false,
        enumerable: true,
        writable: false,
        value: outerHandler
      });
    }
  });
}, SAXXMLReader.prototype);

const MethodLists = {
  risky: {
    "contentHandler": ["startDocument"],
    "dtdHandler": [],
    "errorHandler": [],
    "declarationHandler": [],
    "lexicalHandler": []
  },
  safe: {
    "contentHandler": [
      "endDocument", "startElement", "endElement",
      "characters", "processingInstruction", "ignorableWhitespace",
      "startPrefixMapping", "endPrefixMapping"
    ],
    "dtdHandler": ["notationDecl", "unparsedEntityDecl"],
    "errorHandler": ["error", "fatalError", "ignorableWarning"],
    "declarationHandler": ["handleXMLDeclaration"],
    "lexicalHandler": [
      "comment", "startDTD", "endDTD", "startCDATA", "endCDATA", "startEntity",
      "endEntity"
    ]
  },

  QI: {
    "contentHandler":     XPCOMUtils.generateQI(["nsISAXContentHandler"]),
    "dtdHandler":         XPCOMUtils.generateQI(["nsISAXDTDHandler"]),
    "errorHandler":       XPCOMUtils.generateQI(["nsISAXErrorHandler"]),
    "declarationHandler": XPCOMUtils.generateQI(["nsIMozSAXXMLDeclarationHandler"]),
    "lexicalHandler":     XPCOMUtils.generateQI(["nsISAXLexicalHandler"])
  }
};
