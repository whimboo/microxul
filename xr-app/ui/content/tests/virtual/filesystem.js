describe("Virtual File Service", function() {
  it("can load successfully", TestPageLoader.setupTest(
    "chrome://microxul/content/tests/blanktest.xul",
    function (window) {
      window.modules = {};
      Components.utils.import("resource://app/modules/VirtualFileService.jsm", window.modules);
      expect(typeof window.modules.VirtualFileService).toBe("object");
    }
  ));

  it("can enter test mode without leaving traces behind", TestPageLoader.setupTest(
    "chrome://microxul/content/tests/blanktest.xul",
    function (window) {
      window.modules = {};
      Components.utils.import("resource://app/modules/VirtualFileService.jsm", window.modules);
      const VFS = window.modules.VirtualFileService;

      VFS.test(function() {
        expect(VFS.has("microxul")).toBe(false);
        var microXUL_VFS = VFS.create("microxul");
        expect(typeof microXUL_VFS).toBe("object");
        microXUL_VFS = null;

        expect(VFS.has("microxul")).toBe(true);
      });

      expect(VFS.has("microxul")).toBe(false);
    }
  ));

  it(
    "can enter test mode twice and forget at the second level what it knows at the first",
    TestPageLoader.setupTest(
      "chrome://microxul/content/tests/blanktest.xul",
      function (window) {
        window.modules = {};
        Components.utils.import("resource://app/modules/VirtualFileService.jsm", window.modules);
        const VFS = window.modules.VirtualFileService;

        VFS.test(function() {
          expect(VFS.has("microxul")).toBe(false);
          var microXUL_VFS = VFS.create("microxul");
          expect(typeof microXUL_VFS).toBe("object");
          VFS.test(function() {
            expect(VFS.has("microxul")).toBe(false);
          });

          microXUL_VFS = null;
          expect(VFS.has("microxul")).toBe(true);
        });

        expect(VFS.has("microxul")).toBe(false);
      }
    )
  );

  it(
    "can create a VirtualFileSystem instance with expected API",
    TestPageLoader.setupTest(
      "chrome://microxul/content/tests/blanktest.xul",
      function (window) {
        window.modules = {};
        Components.utils.import("resource://app/modules/VirtualFileService.jsm", window.modules);
        const VFS = window.modules.VirtualFileService;

        VFS.test(function() {
          var microXUL_VFS = VFS.create("microxul");
          expect(typeof microXUL_VFS).toBe("object");

          expect(microXUL_VFS.projectName).toBe("microxul");
          expect(typeof microXUL_VFS.defineSourceGetter).toBe("function");
          expect(typeof microXUL_VFS.getInputStream).toBe("function");
          expect(typeof microXUL_VFS.shutdown).toBe("function");

          microXUL_VFS = null;
        });
      }
    )
  );

  it(
    "can create multiple VirtualFileSystem instances",
    TestPageLoader.setupTest(
      "chrome://microxul/content/tests/blanktest.xul",
      function (window) {
        window.modules = {};
        Components.utils.import("resource://app/modules/VirtualFileService.jsm", window.modules);
        const VFS = window.modules.VirtualFileService;

        VFS.test(function() {
          var microXUL_VFS = VFS.create("microxul");
          expect(typeof microXUL_VFS).toBe("object");

          var otherVFS = VFS.create("other");
          expect(typeof otherVFS).toBe("object");
          expect(otherVFS).not.toBe(microXUL_VFS);

          microXUL_VFS = null;
          otherVFS = null;

          expect(VFS.has("microxul")).toBe(true);
        });
      }
    )
  );

  it(
    "cannot create two VirtualFileSystem instances of the same project name",
    TestPageLoader.setupTest(
      "chrome://microxul/content/tests/blanktest.xul",
      function (window) {
        window.modules = {};
        Components.utils.import("resource://app/modules/VirtualFileService.jsm", window.modules);
        const VFS = window.modules.VirtualFileService;

        VFS.test(function() {
          var microXUL_VFS = VFS.create("microxul");
          expect(typeof microXUL_VFS).toBe("object");

          expect(function() {
            var otherVFS = VFS.create("microxul");
          }).toThrow("A project by this name already exists!");

          microXUL_VFS = null;
          expect(VFS.has("microxul")).toBe(true);
        });
      }
    )
  );
});

describe("Virtual File System", function() {
  it(
    "defines a source getter without executing it",
    TestPageLoader.setupTest(
      "chrome://microxul/content/tests/blanktest.xul",
      function (window) {
        var getterCalled = false;
        var expectedString = "<Hello>\u03b1</Hello>";
        var dataGetter = function() {
          getterCalled = true;
          return expectedString;
        };

        window.modules = {};
        Components.utils.import("resource://app/modules/VirtualFileService.jsm", window.modules);
        const VFS = window.modules.VirtualFileService;

        VFS.test(function() {
          var microXUL_VFS = VFS.create("microxul");
          microXUL_VFS.defineSourceGetter("hello.txt", dataGetter);
          expect(getterCalled).toBe(false);
        });
      }
    )
  );

  it(
    "returns an UTF-8 stream when asked for it",
    TestPageLoader.setupTest(
      "chrome://microxul/content/tests/blanktest.xul",
      function (window) {
        var getterCalled = false;
        var expectedString = "<Hello>\u03b1</Hello>";
        var dataGetter = function() {
          getterCalled = true;
          return expectedString;
        };

        window.modules = {};
        Components.utils.import("resource://app/modules/VirtualFileService.jsm", window.modules);
        const VFS = window.modules.VirtualFileService;

        VFS.test(function() {
          var microXUL_VFS = VFS.create("microxul");
          microXUL_VFS.defineSourceGetter("hello.txt", dataGetter);
          var instream = microXUL_VFS.getInputStream("hello.txt", -1);
          expect(instream instanceof Components.interfaces.nsIInputStream);
          expect(getterCalled).toBe(true);

          Components.utils.import("resource://gre/modules/NetUtil.jsm", window.modules);
          var actualString = window.modules.NetUtil.readInputStreamToString(
            instream, instream.available(), {"charset": "UTF-8"}
          );
          expect(actualString).toBe(expectedString);
        });
      }
    )
  );

  it(
    "throws an error when asked for a non-existent data source",
    TestPageLoader.setupTest(
      "chrome://microxul/content/tests/blanktest.xul",
      function (window) {
        window.modules = {};
        Components.utils.import("resource://app/modules/VirtualFileService.jsm", window.modules);
        const VFS = window.modules.VirtualFileService;

        VFS.test(function() {
          var microXUL_VFS = VFS.create("microxul");
          expect(function() {
            microXUL_VFS.getInputStream("hello.txt", -1);
          }).toThrow("source not found for path hello.txt");
        });
      }
    )
  );

  it(
    "throws an error after it has been shut down",
    TestPageLoader.setupTest(
      "chrome://microxul/content/tests/blanktest.xul",
      function (window) {
        window.modules = {};
        Components.utils.import("resource://app/modules/VirtualFileService.jsm", window.modules);
        const VFS = window.modules.VirtualFileService;
        var getterCalled = false;
        var expectedString = "<Hello>\u03b1</Hello>";
        var dataGetter = function() {
          getterCalled = true;
          return expectedString;
        };

        VFS.test(function() {
          var microXUL_VFS = VFS.create("microxul");
          microXUL_VFS.shutdown();

          expect(function() {
            microXUL_VFS.defineSourceGetter("hello.txt", dataGetter);
          }).toThrow("This virtual file system is already dead!");
          expect(function() {
            microXUL_VFS.getInputStream("hello.txt", -1);
          }).toThrow("This virtual file system is already dead!");
          expect(function() {
            microXUL_VFS.shutdown();
          }).toThrow("This virtual file system is already dead!");
        });
      }
    )
  );
});
