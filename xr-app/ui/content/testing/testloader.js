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

  loaded: false,
  window: null,

  proceed: function() {
    TestPageLoader.loaded = true;
  },

  mayProceed: function() {
    return TestPageLoader.loaded;
  }
};
