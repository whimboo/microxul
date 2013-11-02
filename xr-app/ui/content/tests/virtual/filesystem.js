describe("Virtual File Service", function() {
  var VFS = null;

  beforeEach(function() {
    var modules = {};
    Components.utils.import("resource://app/modules/VirtualFileService.jsm", modules);
    modules.VirtualFileService.reset();
    VFS = modules.VirtualFileService;
  });

  function setupTD() {
    var TD = new jasmine.AsyncTestDriver();
    TD.buildMilkContract(VFS.test.bind(VFS));
    return TD;
  }

  it("can enter test mode without leaving traces behind", function() {
    var TD = setupTD();
    TD.execute(function() {
      // We examine this by entering the test mode... twice :)
      expect(VFS.has("microxul")).toBe(false);
      var microXUL_VFS = VFS.create("microxul");
      expect(typeof microXUL_VFS).toBe("object");

      var milkContract = new jasmine.MilkContract(VFS.test.bind(VFS));
      milkContract.beginContract();
      // This should've put us in a new state.

      expect(VFS.has("microxul")).toBe(false);

      milkContract.endContract();
      // This should've restored us to the original state.
      expect(VFS.has("microxul")).toBe(true);
      expect(VFS.get("microxul")).toBe(microXUL_VFS);
    });
  });

  it("can create a VirtualFileSystem instance with expected API", function() {
    var TD = setupTD();
    TD.execute(function() {
      var microXUL_VFS = VFS.create("microxul");
      expect(typeof microXUL_VFS).toBe("object");

      expect(microXUL_VFS.projectName).toBe("microxul");
      expect(typeof microXUL_VFS.defineSourceGetter).toBe("function");
      expect(typeof microXUL_VFS.hasSourceGetter).toBe("function");
      expect(typeof microXUL_VFS.getInputStream).toBe("function");
      expect(typeof microXUL_VFS.getVirtualSpec).toBe("function");
      expect(typeof microXUL_VFS.shutdown).toBe("function");
    });
  });
  
  it("can create multiple VirtualFileSystem instances", function() {
    var TD = setupTD();
    TD.execute(function() {
      var microXUL_VFS = VFS.create("microxul");
      expect(typeof microXUL_VFS).toBe("object");

      var otherVFS = VFS.create("other");
      expect(typeof otherVFS).toBe("object");
      expect(otherVFS).not.toBe(microXUL_VFS);

      otherVFS = null;

      expect(VFS.has("microxul")).toBe(true);
      expect(VFS.get("microxul")).toBe(microXUL_VFS);
    });
  });

  it("cannot create two VirtualFileSystem instances of the same project name", function() {
    var TD = setupTD();
    TD.execute(function() {
      var microXUL_VFS = VFS.create("microxul");
      expect(typeof microXUL_VFS).toBe("object");

      expect(function() {
        var otherVFS = VFS.create("microxul");
      }).toThrow("A project by this name already exists!");

      expect(VFS.has("microxul")).toBe(true);
      expect(VFS.get("microxul")).toBe(microXUL_VFS);
    });
  });

  it("can get existing VirtualFileSystem instances", function() {
    var TD = setupTD();
    TD.execute(function() {
      expect(VFS.get("microxul")).toBe(null);
      var microXUL_VFS = VFS.create("microxul");
      expect(VFS.get("microxul")).toBe(microXUL_VFS);

      expect(VFS.get("other")).toBe(null);
      var otherVFS = VFS.create("other");
      expect(VFS.get("other")).toBe(otherVFS);
    });
  });

  it("(empty spec to reset with all tests done)", function() {});
});

describe("Virtual File System", function() {
  var VFS = null;

  beforeEach(function() {
    var modules = {};
    Components.utils.import("resource://app/modules/VirtualFileService.jsm", modules);
    modules.VirtualFileService.reset();
    VFS = modules.VirtualFileService;
  });

  function setupTD() {
    var TD = new jasmine.AsyncTestDriver();
    TD.buildMilkContract(VFS.test.bind(VFS));
    return TD;
  }

  it("defines a source getter without executing it", function () {
    var TD = setupTD();
    TD.execute(function() {
      var getterCalled = false;
      var expectedString = "<Hello>\u03b1</Hello>";
      var dataGetter = function() {
        getterCalled = true;
        return expectedString;
      };

      var microXUL_VFS = VFS.create("microxul");
      microXUL_VFS.defineSourceGetter("hello.txt", dataGetter);
      expect(getterCalled).toBe(false);
    });
  });

  it("prevents defining a source getter twice", function() {
    var TD = setupTD();
    TD.execute(function() {
      var getterCalled = false;
      var expectedString = "<Hello>\u03b1</Hello>";
      var dataGetter = function() {
        getterCalled = true;
        return expectedString;
      };
      function voidFunc() {};

      var microXUL_VFS = VFS.create("microxul");
      microXUL_VFS.defineSourceGetter("hello.txt", dataGetter);

      expect(function() {
        microXUL_VFS.defineSourceGetter("hello.txt", voidFunc);
      }).toThrow("That path is already defined!");
    });
  });

  it("reports when it has a source getter", function() {
    var TD = setupTD();
    TD.execute(function() {
      var getterCalled = false;
      var expectedString = "<Hello>\u03b1</Hello>";
      var dataGetter = function() {
        getterCalled = true;
        return expectedString;
      };

      var microXUL_VFS = VFS.create("microxul");
      expect(microXUL_VFS.hasSourceGetter("hello.txt", -1)).toBe(false);
      microXUL_VFS.defineSourceGetter("hello.txt", dataGetter);
      expect(microXUL_VFS.hasSourceGetter("hello.txt", -1)).toBe(true);
    });
  });

  it("returns a correct UTF-8 stream when asked for it", function() {
    var TD = setupTD();
    TD.execute(function() {
      var getterCalled = false;
      var expectedString = "<Hello>\u03b1</Hello>";
      var dataGetter = function() {
        getterCalled = true;
        return expectedString;
      };

      var microXUL_VFS = VFS.create("microxul");
      microXUL_VFS.defineSourceGetter("hello.txt", dataGetter);
      var instream = microXUL_VFS.getInputStream("hello.txt", -1);
      expect(instream instanceof Components.interfaces.nsIInputStream);
      expect(getterCalled).toBe(true);

      var modules = {};
      Components.utils.import("resource://gre/modules/NetUtil.jsm", modules);
      var actualString = modules.NetUtil.readInputStreamToString(
        instream, instream.available(), {"charset": "UTF-8"}
      );
      expect(actualString).toBe(expectedString);
    });
  });

  it("throws an error when asked for a non-existent data source", function() {
    var TD = setupTD();
    TD.execute(function() {
      var microXUL_VFS = VFS.create("microxul");
      expect(function() {
        microXUL_VFS.getInputStream("hello.txt", -1);
      }).toThrow("source not found for path hello.txt");
    })
  });

  it("converts chrome:// URLs to virtual-chrome:// without a port number", function() {
    var TD = setupTD();
    TD.execute(function() {
      var microXUL_VFS = VFS.create("microxul");
      var chromeURL = "chrome://global/content";
      var virtualURL = "virtual-chrome://microxul/global/content";
      [
        "", "/", "/navigator.xul", "/navigator.js", "bindings/navigator.xml#foo"
      ].forEach(function(suffix) {
        var convertedURL = microXUL_VFS.getVirtualSpec(chromeURL + suffix);
        expect(convertedURL).toBe(virtualURL + suffix);
      });
    });
  });

  it("converts chrome:// URLs to virtual-chrome:// with a port number", function() {
    var TD = setupTD();
    TD.execute(function() {
      var microXUL_VFS = VFS.create("microxul");
      var chromeURL = "chrome://global/content";
      var virtualURL = "virtual-chrome://microxul:2/global/content";
      [
        "", "/", "/navigator.xul", "/navigator.js", "bindings/navigator.xml#foo"
      ].forEach(function(suffix) {
        var convertedURL = microXUL_VFS.getVirtualSpec(chromeURL + suffix, 2);
        expect(convertedURL).toBe(virtualURL + suffix);
      });
    });
  });

  it("throws an error after it has been shut down", function() {
    var TD = setupTD();
    TD.execute(function() {
      var getterCalled = false;
      var expectedString = "<Hello>\u03b1</Hello>";
      var dataGetter = function() {
        getterCalled = true;
        return expectedString;
      };

      var microXUL_VFS = VFS.create("microxul");
      microXUL_VFS.shutdown();

      expect(function() {
        microXUL_VFS.defineSourceGetter("hello.txt", dataGetter);
      }).toThrow("This virtual file system is already dead!");
      expect(function() {
        microXUL_VFS.hasSourceGetter("hello.txt", -1);
      }).toThrow("This virtual file system is already dead!");
      expect(function() {
        microXUL_VFS.getInputStream("hello.txt", -1);
      }).toThrow("This virtual file system is already dead!");
      expect(function() {
        microXUL_VFS.getVirtualSpec("chrome://global/content/", -1);
      }).toThrow("This virtual file system is already dead!");
      expect(function() {
        microXUL_VFS.shutdown();
      }).toThrow("This virtual file system is already dead!");
    });
  });

  it("(empty spec to reset with all tests done)", function() {});
});
