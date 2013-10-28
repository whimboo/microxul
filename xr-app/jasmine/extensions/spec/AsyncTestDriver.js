describe("AsyncTestDriver", function() {
    var AsyncTarget = {
        eventCount: 1,
        currentEvent: 0,

        test: function(milkContract) {
            console.log("Establishing contract, incrementing currentEvent");
            if (this.currentEvent != 0) {
                console.error("test failure has happened");
            }
            var lastEvent = this.currentEvent;
            this.currentEvent = this.eventCount++;
            milkContract.endContract = (function() {
                console.log("endContract called");
                this.currentEvent = lastEvent;
            }).bind(this);
        },

        reset: function() {
            if (this.currentEvent != 0) {
                console.warn("test failure must've happened, resetting");
                this.currentEvent = 0;
            }
        }
    };

    beforeEach(function() {
        AsyncTarget.reset(); 
    });

    function recoveryCheck() {
        console.log("After the async run:  currentEvent = " + AsyncTarget.currentEvent);
        expect(AsyncTarget.currentEvent).toBe(0);
    }

    function firstTest() {
        expectedEvent++;
        console.log("Before the async run:  currentEvent = " + AsyncTarget.currentEvent);

        var TD = new jasmine.AsyncTestDriver();
        var mayContinue = false;
        TD.buildMilkContract(AsyncTarget.test.bind(AsyncTarget));
        TD.pushAsyncRun(
            // runs
            function() {
                console.log("During the async run:  currentEvent = " + AsyncTarget.currentEvent);
                expect(AsyncTarget.currentEvent).toBe(expectedEvent);

                // Simulate an asynchronous call.
                window.setTimeout(function() {
                    mayContinue = true;
                }, 100);
            },

            // waitsFor
            function() {
                return mayContinue;
            },
            "first step mayContinue",
            500
        );

        console.log("start test");
        // final runs call
        TD.execute(function() {
            expect(mayContinue).toBe(true);
        });

        /* XXX ajvincent Tests really aren't supposed to do this, but I do so to show
         * that the reset did happen.
         */
        runs(function() {
            console.log("After the async run:  currentEvent = " + AsyncTarget.currentEvent);
            expect(AsyncTarget.currentEvent).toBe(0);
        });
    }

    var expectedEvent = 0;
    it("can be fulfilled in normal conditions", firstTest);

    it("can be fulfilled through two async calls", function() {
        expectedEvent++;
        var mayContinue = false;

        var TD = new jasmine.AsyncTestDriver();
        var mayContinue = false;
        TD.buildMilkContract(AsyncTarget.test.bind(AsyncTarget));

        function runFunc() {
            mayContinue = false;
            console.log("During the async run:  currentEvent = " + AsyncTarget.currentEvent);
            expect(AsyncTarget.currentEvent).toBe(expectedEvent);

            // Simulate an asynchronous call.
            window.setTimeout(function() {
                mayContinue = true;
            }, 100);
        }
        function waitsFunc() {
            return mayContinue;
        }
        TD.pushAsyncRun(runFunc, waitsFunc, "first step mayContinue", 500);
        TD.pushAsyncRun(runFunc, waitsFunc, "second step mayContinue", 500);

        console.log("start test");
        // final runs call
        TD.execute(function() {
            expect(mayContinue).toBe(true);
        });

        /* XXX ajvincent Tests really aren't supposed to do this, but I do so to show
         * that the reset did happen.
         */
        runs(function() {
            console.log("After the async run:  currentEvent = " + AsyncTarget.currentEvent);
            expect(AsyncTarget.currentEvent).toBe(0);
        });
    });

    it("can sour if one event takes too long", function() {
        expectedEvent++;
        console.log("Before the async run:  currentEvent = " + AsyncTarget.currentEvent);

        var TD = new jasmine.AsyncTestDriver();
        var mayContinue = false;
        TD.buildMilkContract(AsyncTarget.test.bind(AsyncTarget));
        TD.pushAsyncRun(
            // runs
            function() {
                console.log("During the async run:  currentEvent = " + AsyncTarget.currentEvent);
                expect(AsyncTarget.currentEvent).toBe(expectedEvent);

                // Simulate an asynchronous call.
                // The async call will respond in 500 ms, but we're only willing to wait 100ms.
                window.setTimeout(function() {
                    mayContinue = true;
                }, 500);
            },

            // waitsFor
            function() {
                return mayContinue;
            },
            "first step mayContinue",
            100
        );

        console.log("start test");
        // final runs call
        TD.execute(function() {
            expect(mayContinue).toBe(true);
        });

        /* XXX ajvincent Tests really aren't supposed to do this, but I do so to show
         * that the reset did happen.
         */
        runs(function() {
            console.log("After the async run:  currentEvent = " + AsyncTarget.currentEvent);
            expect(AsyncTarget.currentEvent).toBe(0);
        });
    });

    it("recovers from a timeout shutdown (with beforeEach to reset)", recoveryCheck);

    it("can sour from a runs exception", function() {
        expectedEvent++;
        console.log("Before the async run:  currentEvent = " + AsyncTarget.currentEvent);

        var TD = new jasmine.AsyncTestDriver();
        var mayContinue = false;
        TD.buildMilkContract(AsyncTarget.test.bind(AsyncTarget));
        TD.pushAsyncRun(
            // runs
            function() {
                console.log("During the async run:  currentEvent = " + AsyncTarget.currentEvent);
                expect(AsyncTarget.currentEvent).toBe(expectedEvent);

                // Simulate an asynchronous call.
                window.setTimeout(function() {
                    mayContinue = true;
                }, 100);
                throw new Error("intentional abort");
            },

            // waitsFor
            function() {
                return mayContinue;
            },
            "first step mayContinue",
            500
        );

        console.log("start test");
        // final runs call
        TD.execute(function() {
            expect(mayContinue).toBe(true);
        });

        /* XXX ajvincent Tests really aren't supposed to do this, but I do so to show
         * that the reset did happen.
         */
        runs(function() {
            console.log("After the async run:  currentEvent = " + AsyncTarget.currentEvent);
            expect(AsyncTarget.currentEvent).toBe(0);
        });
    });
    
    it("recovers from a runs shutdown", recoveryCheck);

    it("can sour with a waitsFor exception", function() {
        expectedEvent++;
        var mayContinue = false;
        console.log("Before the async run:  currentEvent = " + AsyncTarget.currentEvent);

        var TD = new jasmine.AsyncTestDriver();
        var mayContinue = false;
        TD.buildMilkContract(AsyncTarget.test.bind(AsyncTarget));
        TD.pushAsyncRun(
            // runs
            function() {
                console.log("During the async run:  currentEvent = " + AsyncTarget.currentEvent);
                expect(AsyncTarget.currentEvent).toBe(expectedEvent);

                // Simulate an asynchronous call.
                window.setTimeout(function() {
                    mayContinue = true;
                }, 100);
                
            },

            // waitsFor
            function() {
                throw new Error("intentional abort");
            },
            "first step mayContinue",
            500
        );

        console.log("start test");
        // final runs call
        TD.execute(function() {
            expect(mayContinue).toBe(true);
        });

        /* XXX ajvincent Tests really aren't supposed to do this, but I do so to show
         * that the reset did happen.
         */
        runs(function() {
            console.log("After the async run:  currentEvent = " + AsyncTarget.currentEvent);
            expect(AsyncTarget.currentEvent).toBe(0);
        });
    });

    it("recovers from a waitsFor shutdown", recoveryCheck);

    it("can run again after recovery", firstTest);
});
