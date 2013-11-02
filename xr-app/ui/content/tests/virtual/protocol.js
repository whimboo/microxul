describe("chrome:// protocol handler", function() {
  it("tries to feed the listener when opening a new channel",
    TestPageLoader.setupTest(
      "chrome://microxul/content/tests/blanktest.xul",
      function (window) {
        window.modules = {};
        Components.utils.import("resource://gre/modules/NetUtil.jsm", window.modules);
        Components.utils.import("resource://gre/modules/Services.jsm", window.modules);
        const NetUtil = window.modules.NetUtil, Services = window.modules.Services;

        var channel = Services.io.newChannel(
          "chrome://global/content/bindings/textbox.xml#textbox",
          null, null
        );

        var listener = {
          __started__: false,
          __stopped__: false,
          __dataRead__: false,
          onStartRequest: function(req, ctxt) {
            this.__started__ = true;
          },
          onStopRequest: function(req, ctxt, status) {
            this.__stopped__ = true;
          },
          onDataAvailable: function (req, ctxt, nativeStream, offset, count) {
            NetUtil.readInputStreamToString(nativeStream, count, {charset: "UTF-8"});
            this.__dataRead__ = true;
          }
        };

        runs(function() {
          channel.asyncOpen(listener, null);
        });
        waitsFor(function() {
          return listener.__stopped__;
        }, "The listener should have received a call to onStopRequest", 500);
        runs(function() {
          expect(listener.__dataRead__).toBe(true);
          expect(listener.__started__).toBe(true);
        });
      }
    )
  );
});

describe("virtual-chrome:// protocol handler", function() {
  var VPS = null, VFS = null;
  var Cc = Components.classes,
      Ci = Components.interfaces,
      Cu = Components.utils;

  beforeEach(function() {
    var modules = {};
    Cu.import("resource://app/modules/VirtualFileService.jsm", modules);
    modules.VirtualFileService.reset();
    VFS = modules.VirtualFileService;
    VPS = null;
  });

  function setupTD() {
    var TD = new jasmine.AsyncTestDriver();
    TD.buildMilkContract(VFS.test.bind(VFS));
    return TD;
  }

  function getVPS() {
    VPS = Cc["@mozilla.org/network/protocol;1?name=virtual-chrome"]
            .getService(Ci.nsIProtocolHandler);
  }

  it("can be loaded", function() {
    getVPS();
    expect(VPS).toBeTruthy();
  });

  it(
    "converts chrome:// URLs to virtual-chrome:// correctly (without a port number)",
    function() {
      getVPS();
      var TD = setupTD();
      TD.execute(function() {
        var microXUL_VFS = VFS.create("microxul");
        var chromeURL = "chrome://toolkit/content";
        var virtualURL = "virtual-chrome://microxul/toolkit/content";

        [
          "", "/", "/toolkit.xul"
        ].forEach(function(suffix) {
          var convertedURL = microXUL_VFS.getVirtualSpec(chromeURL + suffix);
          var URI = VPS.newURI(convertedURL, null, null);
          expect(URI.spec).toBe(virtualURL + "/toolkit.xul");
        });

        [
          "/navigator.js", "/bindings/navigator.xml#foo"
        ].forEach(function(suffix) {
          var convertedURL = microXUL_VFS.getVirtualSpec(chromeURL + suffix);
          var URI = VPS.newURI(convertedURL, null, null);
          expect(URI.spec).toBe(virtualURL + suffix);
        });
      });
    }
  );

  it(
    "converts chrome:// URLs to virtual-chrome:// correctly (with a port number)",
    function() {
      getVPS();
      var TD = setupTD();
      TD.execute(function() {
        // Repeat the same test with a port number.

        var microXUL_VFS = VFS.create("microxul");
        var chromeURL = "chrome://toolkit/content";
        var virtualURL = "virtual-chrome://microxul:2/toolkit/content";

        [
          "", "/", "/toolkit.xul"
        ].forEach(function(suffix) {
          var convertedURL = microXUL_VFS.getVirtualSpec(chromeURL + suffix, 2);
          var URI = VPS.newURI(convertedURL, null, null);
          expect(URI.spec).toBe(virtualURL + "/toolkit.xul");
        });

        [
          "/navigator.js", "/bindings/navigator.xml#foo"
        ].forEach(function(suffix) {
          var convertedURL = microXUL_VFS.getVirtualSpec(chromeURL + suffix, 2);
          var URI = VPS.newURI(convertedURL, null, null);
          expect(URI.spec).toBe(virtualURL + suffix);
        });
      });
    }
  );

  it(
    "creates channels with equivalent URI's to chrome:// for unknown files",
    function() {
      var TD = setupTD();
      TD.execute(function() {
        var modules = {};
        Components.utils.import("resource://gre/modules/Services.jsm", modules);
        const Services = modules.Services;

        var microXUL_VFS = VFS.create("microxul");
        var chromePath = "chrome://global/content/xul.css";
        var virtualPath = "virtual-chrome://microxul/global/content/xul.css";

        var chromeChannel  = Services.io.newChannel(chromePath,  null, null);
        var virtualChannel = Services.io.newChannel(virtualPath, null, null);

        expect(virtualChannel.URI.spec).toBe(chromeChannel.URI.spec);
        expect(virtualChannel.URI.equals(chromeChannel.URI)).toBe(true);
      });
    }
  );

  it(
    "tries to feed the listener when opening a new channel for an original file",
    function() {
      var TD = setupTD();
      var modules = {};
      Components.utils.import("resource://gre/modules/NetUtil.jsm", modules);
      Components.utils.import("resource://gre/modules/Services.jsm", modules);
      const NetUtil = modules.NetUtil,
            Services = modules.Services;

      var listener = {
        __started__: false,
        __stopped__: false,
        __dataRead__: "",
        onStartRequest: function(req, ctxt) {
          this.__started__ = true;
        },
        onStopRequest: function(req, ctxt, status) {
          this.__stopped__ = true;
        },
        onDataAvailable: function (req, ctxt, nativeStream, offset, count) {
          this.__dataRead__ += NetUtil.readInputStreamToString(
            nativeStream, count, {charset: "UTF-8"}
          );
        }
      };
      var channel, chromeSource = "", chromeLoaded = false;

      TD.pushAsyncRun(
        function() {
          // Get the chrome: protocol's version of this code.
          NetUtil.asyncFetch(
            "chrome://global/content/bindings/textbox.xml#textbox",
            function(nativeStream, status, req) {
              chromeSource = NetUtil.readInputStreamToString(
                nativeStream,
                nativeStream.available(),
                {charset: "UTF-8"}
              );
              chromeLoaded = true;
            }
          );
        },
        function() {
          return chromeLoaded;
        },
        "chromeLoaded should happen fast",
        500
      );

      TD.pushAsyncRun(
        // Get the virtual-chrome: protocol's version of this code.
        function() {
          VFS.create("microxul");
          channel = Services.io.newChannel(
            "virtual-chrome://microxul/global/content/bindings/textbox.xml#textbox",
            null, null
          );
          channel.asyncOpen(listener, null);
        },
        function() {
          return listener.__stopped__;
        },
        "The listener should have received a call to onStopRequest",
        500
      );

      TD.execute(
        // The final check:  did the two versions match???
        function() {
          expect(listener.__dataRead__).toBe(chromeSource);
          expect(listener.__started__).toBe(true);
        }
      );
    }
  );

  it(
    "tries to feed the listener when opening a new channel for an original file",
    function() {
      getVPS();
      var TD = setupTD();
      var modules = {};
      Components.utils.import("resource://gre/modules/NetUtil.jsm", modules);
      Components.utils.import("resource://gre/modules/Services.jsm", modules);
      const NetUtil = modules.NetUtil,
            Services = modules.Services;

      function substituteSource() {
        return "<!-- Nothing to see here -->";
      }

      var channel, chromeSource = "", chromeLoaded = false;

      var listener = {
        __started__: false,
        __stopped__: false,
        __dataRead__: "",
        onStartRequest: function(req, ctxt) {
          this.__started__ = true;
        },
        onStopRequest: function(req, ctxt, status) {
          this.__stopped__ = true;
        },
        onDataAvailable: function (req, ctxt, nativeStream, offset, count) {
          this.__dataRead__ += NetUtil.readInputStreamToString(
            nativeStream, count, {charset: "UTF-8"}
          );
        }
      };

      TD.pushAsyncRun(
        // Get the virtual-chrome: protocol's version of this code.
        function() {
          var microXUL_VFS = VFS.create("microxul");
          microXUL_VFS.defineSourceGetter(
            "chrome://global/content/bindings/textbox.xml",
            substituteSource
          );

          var uri = VPS.newURI(
            "virtual-chrome://microxul/global/content/bindings/textbox.xml#textbox",
            null, null
          );
          var channel = VPS.newChannel(uri);
          channel.asyncOpen(listener, null);
        },
        function() {
          return listener.__stopped__;
        },
        "The listener should have received a call to onStopRequest",
        500
      );

      TD.execute(
        // The final check:  did the two versions match???
        function() {
          var src = substituteSource();
          expect(listener.__dataRead__.substr(0, src.length)).toBe(src);
          expect(listener.__started__).toBe(true);
        }
      );
    }
  );

  it("(empty spec to reset with all tests done)", function() {});
});
