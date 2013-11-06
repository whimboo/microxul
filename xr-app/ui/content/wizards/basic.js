const Ci = Components.interfaces,
      Cc = Components.classes,
      Cu = Components.utils,
      Cr = Components.results,
      CE = Components.Exception,
      CC = Components.Constructor;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://app/modules/SAXXMLReader.jsm");

var InputStreamPump = Components.Constructor(
  "@mozilla.org/network/input-stream-pump;1",
  "nsIInputStreamPump",
  "init"
);

var VFS = (function() {
  var modules = {};
  Cu.import("resource://app/modules/VirtualFileService.jsm", modules);
  const virt = modules.VirtualFileService;
  if (!virt.has("temp")) {
    virt.create("temp");
  }
  return virt.get("temp");
})();


const ContentManager = {
  getTemplate: function(name, callback) {
    NetUtil.asyncFetch(
      "resource://app/templates/" + name,
      function(nativeStream, status, req) {
        var src = NetUtil.readInputStreamToString(
          nativeStream,
          nativeStream.available(),
          { charset: "UTF-8" }
        );

        callback(src);
      }
    );
  },

  importPageScriptOnLoad: function(pageID, baseURL, urls) {
    this.addOnLoad(function() {
      var page = document.getElementById(pageID);
      urls.forEach(function(url) {
        Services.scriptloader.loadSubScript(baseURL + url, page);
      });
    });
  },

  __onloadSequence__: [],
  addOnLoad: function(callback) {
    if (this.__onloadSequence__.length == 0) {
      window.addEventListener("load", this, false);
    }
    this.__onloadSequence__.push(callback);
  },

  handleEvent: function(evt) {
    if (evt.originalTarget != document) {
      return;
    }
    window.removeEventListener("load", this, false);
    var seq = this.__onloadSequence__;
    seq.forEach(function(callback) {
      callback();
    });
  },

  sources: new Map()
};

VFS.defineSourceGetter("chrome://temp/content/temp.xul", function() {
  return ContentManager.sources.get("chrome://temp/content/temp.xul");
});
