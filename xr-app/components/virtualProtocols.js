const Ci = Components.interfaces,
      Cc = Components.classes,
      Cu = Components.utils,
      Cr = Components.results,
      CC = Components.Constructor,
      CE = Components.Exception;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://app/modules/VirtualFileService.jsm");

/* A virtual-chrome: URL takes the form:
virtual-chrome://projectname:tagnumber/package/type/path

and is equivalent to:
chrome://package/type/path
*/

const StandardURL = CC("@mozilla.org/network/standard-url;1",
                       "nsIStandardURL", "init");

const InputStreamPump = CC("@mozilla.org/network/input-stream-pump;1",
                           "nsIInputStreamPump", "init");

const MIMEService = Cc["@mozilla.org/mime;1"]
                      .getService(Ci.nsIMIMEService);

function VirtualChannel(uri, inputStream) {
  // nsIChannel
  var originalURI = uri;
  Object.defineProperty(this, "originalURI", {
    configurable: false,
    enumerable: true,
    get: function() {
      return originalURI;
    },
    set: function(val) {
      if (!(val instanceof Ci.nsIURI)) {
        throw new CE("Illegal value!", Cr.NS_ERROR_ILLEGAL_VALUE);
      }
      originalURI = val;
    }
  });
  
  // nsIChannel
  uri.mutable = false;
  Object.defineProperty(this, "URI", new ReadOnlyDesc(uri));

  // nsIChannel
  this.owner = null;
  this.notificationCallbacks = null;
  this.securityInfo = null;

  var fp = uri.filePath;
  if (/\/$/.test(fp))
    this.contentType = "application/http-index-format";
  else
    this.contentType = MIMEService.getTypeFromURI(uri);

  // We know this because the input stream was created as a UTF-8 stream.
  this.contentCharset = "UTF-8";

  this.contentLength = -1;

  // nsIRequest
  this.loadFlags = 0;
  this.loadGroup = null;

  this.__opened__ = false;
  this.__isPending__ = false;
  this.__listener__ = null;
  this.__context__ = null;
  this.__pump__ = null;
  this.__status__ = Cr.NS_OK;
  this.__inputStream__ = inputStream;
  this.__contentDisposition__ = {
    value: -1,
    fileName: null
  };
}
VirtualChannel.prototype = {
  // nsIChannel
  open: function() {
    if (this.__opened__ || this.__isPending__) {
      throw new CE("In progress", Cr.NS_ERROR_IN_PROGRESS);
    }
    this.__opened__ = true;
    return this.__inputStream__;
  },

  // nsIChannel
  asyncOpen: function(listener, context) {
    if (this.__opened__ || this.__isPending__) {
      throw new CE("In progress", Cr.NS_ERROR_IN_PROGRESS);
    }
    this.__listener__ = listener;
    this.__isPending__ = true;
    this.__context__ = context;

    var pump = new InputStreamPump(this.__inputStream__, -1, -1, 0, 0, true);
    if (this.loadGroup)
      this.loadGroup.addRequest(this, context);
    pump.asyncRead(this, null);

    this.__pump__ = pump;
  },

  // nsIChannel
  get contentDisposition() {
    if (this.__contentDisposition__.value == -1) {
      throw new CE("Not available!", Cr.NS_ERROR_NOT_AVAILABLE);
    }
    return this.__contentDisposition__.value;
  },
  set contentDisposition(val) {
    this.__contentDisposition__.value = val;
  },

  // nsIChannel
  get contentDispositionFilename() {
    if (this.__contentDisposition__.fileName === null) {
      throw new CE("Not available!", Cr.NS_ERROR_NOT_AVAILABLE);
    }
    return this.__contentDisposition__.fileName;
  },
  set contentDispositionFilename(val) {
    this.__contentDisposition__.fileName = val;
  },

  get contentDispositionHeader() {
    throw new CE("Not available!", Cr.NS_ERROR_NOT_AVAILABLE);
  },

  // nsIRequest
  get name() {
    return this.URI.spec;
  },
  isPending: function() {
    return this.__isPending__;
  },
  get status() {
    if (this.__pump__ && Components.isSuccessCode(this.__status__)) {
      return this.__pump__.status;
    }
    return this.__status__;
  },
  
  cancel: function(status) {
    this.__status__ = status;
    if (this.__pump__)
      this.__pump__.cancel(status);
  },

  suspend: function() {
    if (this.__pump__)
      this.__pump__.suspend();
  },

  resume: function() {
    if (this.__pump__)
      this.__pump__.resume();
  },

  // nsIRequestObserver
  onStartRequest: function onStartRequest(aRequest, aContext) {
    // aRequest == this.__pump__
    if (this.__listener__)
      this.__listener__.onStartRequest(this, aContext);
  },

  // nsIRequestObserver
  onStopRequest: function onStopRequest(aRequest, aContext, aStatus) {
    // aRequest == this.__pump__
    if (this.__listener__)
      this.__listener__.onStopRequest(this, aContext, aStatus);

    this.__listener__ = null;

    if (this.loadGroup)
      this.loadGroup.removeRequest(this, aContext, aStatus);

    this.__isPending__ = false;
    this.notificationCallbacks = null;
    this.__pump__ = null;
  },

  // nsIStreamListener
  onDataAvailable:
  function onDataAvailable(request, ctxt, input, offset, count) {
    // request == this.__pump__
    if (this.__listener__)
      this.__listener__.onDataAvailable(this, ctxt, input, offset, count);
  },

  // nsISupports
  QueryInterface: XPCOMUtils.generateQI([
    "nsIChannel", "nsIRequest", "nsIRequestObserver", "nsIStreamListener"
  ])
};

function ReadOnlyDesc(value) {
  this.value = value;
}
ReadOnlyDesc.prototype = {
  configurable: false,
  enumerable: true,
  writable: false
};

const ChromeSubpackageExtension = {
  "content": ".xul",
  "skin":    ".css",
  "locale":  ".dtd"
};

function VirtualChromeProtocol() {};
VirtualChromeProtocol.prototype = {
  // nsIProtocol
  newURI: function(aSpec, aOriginCharset, aBaseURI) {
    var rv = new StandardURL(
      Ci.nsIStandardURL.URLTYPE_STANDARD, -1, aSpec, aOriginCharset, aBaseURI
    );

    // Force QI to nsIURL
    if (!(rv instanceof Ci.nsIURL)) {
      throw new CE("We didn't get back a URL?", Cr.NS_ERROR_UNEXPECTED);
    }

    // Canonify URL
    {
      let chromeParts = (/^\/([^\/]+)\/([^\/]+)\/?$/).exec(rv.filePath);
      if (chromeParts) {
        let [wholeMatch, chrPackage, packageType] = chromeParts;
        let localPath = "/" + chrPackage + "/" + packageType + "/";
        if (!(packageType in ChromeSubpackageExtension)) {
          throw new CE("Invalid argument!", Cr.NS_ERROR_INVALID_ARG);
        }
        localPath += chrPackage + ChromeSubpackageExtension[packageType];
        rv.filePath = localPath;
      }
    }

    return rv;
  },

  newChannel: function(uri) {
    // virtual-chrome:tag#//projectname/chromepackage/content/...
    var projectName = uri.host,
        tagNumber   = uri.port;
    var fileSystem = VirtualFileService.get(projectName);
    var channel;

    var chromeSpec = "chrome:/" + uri.filePath;
    if (fileSystem && fileSystem.hasSourceGetter(chromeSpec, tagNumber)) {
      channel = new VirtualChannel(uri, fileSystem.getInputStream(chromeSpec, tagNumber));
      // XXX ajvincent The rest of this is from nsChromeProtocolHandler::NewChannel().

      // Make sure that the channel remembers where it was originally loaded from.
      channel.loadFlags &= ~Ci.nsIChannel.LOAD_REPLACE;

      // Get a system principal for content files and set the owner property of the result
      let chromeParts = (/^\/[^\/]+\/([^\/]+)\//).exec(uri.filePath);
      if (chromeParts) {
        let [wholeMatch, packageType] = chromeParts;
        if (packageType == "content") {
          channel.owner = Services.scriptSecurityManager.getSystemPrincipal();
        }
      }

      // VirtualChannel().contentCharset is already "UTF-8".
    }
    else {
      if (uri.query)
        chromeSpec += "?" + uri.query;
      if (uri.ref)
        chromeSpec += "#" + uri.ref;

      channel = Services.io.newChannel(chromeSpec, null, null);
      channel.originalURI = uri;
     }

    return channel;
  },

  allowPort: function(port, scheme) {
    return (scheme == "virtual-chrome");
  },

  // nsISupports
  QueryInterface: XPCOMUtils.generateQI(["nsIProtocolHandler"]),

  // component registration
  classDescription: "virtual-chrome: protocol handler",
  classID: Components.ID("{c19c2218-d92e-4df6-859c-451ab271ffce}"),
  contractID: "@mozilla.org/network/protocol;1?name=virtual-chrome",

  // Factory
  _xpcom_factory: XPCOMUtils.generateSingletonFactory(VirtualChromeProtocol)
}
Object.defineProperties(VirtualChromeProtocol.prototype, {
  // nsIProtocolHandler
  scheme: new ReadOnlyDesc("virtual-chrome"),

  defaultPort: new ReadOnlyDesc(-1),

  protocolFlags: new ReadOnlyDesc(
    Ci.nsIProtocolHandler.URI_STD |
    Ci.nsIProtocolHandler.URI_IS_UI_RESOURCE |
    Ci.nsIProtocolHandler.URI_IS_LOCAL_RESOURCE
  )
});

const NSGetFactory = XPCOMUtils.generateNSGetFactory([VirtualChromeProtocol]);
