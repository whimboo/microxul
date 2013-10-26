function runTestsOnLoad() {
  var jasmineEnv = jasmine.getEnv();
  jasmineEnv.updateInterval = 250;

  var htmlReporter = new jasmine.HtmlReporter();
  var _reportRunnerResults = htmlReporter.reportRunnerResults;
  htmlReporter.reportRunnerResults = function() {
    _reportRunnerResults();
    TestPageLoader.window.close();
  };
  jasmineEnv.addReporter(htmlReporter);

  jasmineEnv.specFilter = function(spec) {
    return htmlReporter.specFilter(spec);
  };

  jasmineEnv.execute();
}
