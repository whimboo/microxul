function addMatchersToJasmine() {
  beforeEach(function() {
    this.addMatchers({
      toBeAnInstanceOf: function(expected) {
        var actual = this.actual;
        var notText = this.isNot ? " not" : "";
  
        this.message = function () {
          return "Expected " + actual + notText + " to be an instance of " + expected.name;
        };
  
        return actual instanceof expected;
      }
    });
  });
}
