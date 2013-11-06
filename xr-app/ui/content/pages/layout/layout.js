var markup;

ContentManager.getTemplate("minWindow.xul", function(src) {
  function init() {
    markup = document.getElementById("layout:sourcemarkup");
    markup.addEventListener("sourceupdate", sourceupdate, true);
    markup.value = src;
  }
  window.setTimeout(init, 100);
});

function sourceupdate(evt) {
  const url = "chrome://temp/content/temp.xul";
  ContentManager.sources.set(url, evt.data.newSource);
  var stream = VFS.getInputStream(url, -1);
  var pump = new InputStreamPump(stream, 0, -1, 0, 0, true);
  WellFormednessParser.parseAsync(WellFormednessListener);
  pump.asyncRead(WellFormednessParser, null);
}

const WellFormednessParser = new SAXXMLReader;
WellFormednessParser.errorHandler = {
  hasError: false,
  fatalError: function() {
    this.hasError = true;
  }
};

const WellFormednessListener = {
  onStartRequest: function(req, storageStream) {
    WellFormednessParser.errorHandler.hasError = false;
  },

  onStopRequest: function(req, context, statusCode) {
    var previewPane = document.getElementById("previewPane");
    var url;
    if (Components.isSuccessCode(statusCode) && !WellFormednessParser.errorHandler.hasError) {
      url = VFS.getVirtualSpec("chrome://temp/content/temp.xul");
    }
    else {
      url = "data:text/plain;charset=utf-8,Not well formed.";
    }
    previewPane.setAttribute("src", url);
  },

  QueryInterface: XPCOMUtils.generateQI(["nsIRequestObserver"])
};
