const TestPageLoader = {
  setupTest: function(url, callback) {
    return function() {
      TestPageLoader.loadPage(url, callback);
    }
  },
  
  loadPage: function(url, callback) {
    runs(function() {
      TestPageLoader.loaded = false;
      try {
        TestPageLoader.window = window.openDialog(url, "testFrame", "chrome", TestPageLoader.proceed);  
      }
      catch (e) {
        alert(e);
      }
    });

    waitsFor(TestPageLoader.mayProceed);

    runs(function() {
      callback(TestPageLoader.window);
    });
  },

  appendToTestDriver: function(url, TD) {
    TD.pushAsyncRun(
      function() {
        TestPageLoader.loaded = false;
        TestPageLoader.window = window.openDialog(
          url, "testFrame", "chrome", TestPageLoader.proceed
        );
      },
      TestPageLoader.mayProceed,
      "Failed to load URL: " + url,
      1000
    );
  },

  loaded: false,
  window: null,

  proceed: function() {
    TestPageLoader.loaded = true;
  },

  mayProceed: function() {
    return TestPageLoader.loaded;
  },

  clear: function() {
    TestPageLoader.window = null;
  }
};
