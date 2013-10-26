describe("Test page", function () {
  it("can load a page", TestPageLoader.setupTest(
    "chrome://microxul/content/tests/blanktest.xul",
    function (window) {
      expect(window.document instanceof Components.interfaces.nsIDOMXULDocument).toBe(true);
    }
  ));

  it("can import a module", TestPageLoader.setupTest(
    "chrome://microxul/content/tests/blanktest.xul",
    function (window) {
      window.modules = {};
      Components.utils.import("resource://gre/modules/XPCOMUtils.jsm", window.modules);
      expect(typeof window.modules.XPCOMUtils).toBe("object");
    }
  ));

  it("refreshes the page for each test setup", TestPageLoader.setupTest(
    "chrome://microxul/content/tests/blanktest.xul",
    function (window) {
      expect(typeof window.modules).toBe("undefined");
    }
  ))
});
