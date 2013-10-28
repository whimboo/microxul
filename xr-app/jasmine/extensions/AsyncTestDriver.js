jasmine.MilkContract = function(counterParty) {
    this.soured = false;
    this.__counterParty__ = counterParty;
    this.__contractSigned__ = false;
};
jasmine.MilkContract.prototype = {
    beginContract: function() {
        this.__counterParty__(this);
        this.__contractSigned__ = true;
    },

    // XXX ajvincent The counterparty should replace this method,
    // to indicate everything is done.
    endContract: function() {},

    expire: function() {
        if (this.soured)
            return;
        this.soured = true;

        if (this.__contractSigned__) {
            this.endContract();
        }
    }
};

jasmine.AsyncTestDriver = function() {
    this.__runSequence__   = [];
    this.__milkContracts__ = [];
    this.__locked__ = false;
};
jasmine.AsyncTestDriver.prototype = {
    __returnTrue__: function() {
        return true;
    },

    __ensureNotLocked__: function() {
        if (this.__locked__) {
            throw new Error("AsyncTestDriver is locked... you cannot modify it now.");
        }
    },

    buildMilkContract: function(otherParty) {
        this.__ensureNotLocked__();
        var contract = new jasmine.MilkContract(otherParty);
        this.__milkContracts__.push(contract);
        return contract;
    },

    pushAsyncRun: function(runsBlock, waitsForBlock, waitsForMsg, timeout) {
        this.__ensureNotLocked__();
        this.__runSequence__.push([runsBlock, waitsForBlock, waitsForMsg, timeout]);
    },

    execute: function(finalRun) {
        this.pushAsyncRun(finalRun, this.__returnTrue__, null, null);
        this.__locked__ = true;

        var mayProceed = true, abortMsg = "";

        // All roads (eventually) lead here.
        var shutdown = (function() {
            if (!mayProceed)
                return;

            mayProceed = false;

            this.__milkContracts__.forEach(function(contract) {
                try {
                    contract.expire();
                }
                catch (f) {
                    console.error(f);
                }
            });
        }).bind(this);

        try {
            this.__milkContracts__.forEach(function(contract) {
                contract.beginContract();
            }, this);
        }
        catch(e) {
            shutdown();
            throw e;
        }

        // Beyond this point, we register asynchronous runs/waitsFor pairs.
        // Therefore, exceptions thrown have to trigger shutdown().

        var spec = jasmine.getEnv().currentSpec;

        this.__runSequence__.forEach(function(seq, index) {
            var [runsBlock, waitsForBlock, waitsForMsg, timeout] = seq;
            runs(function() {
                if (!mayProceed)
                    return;
                try {
                    runsBlock();
                }
                catch(e) {
                    shutdown();
                    throw e;
                }
                if (spec.results_.failedCount > 0) {
                    shutdown();
                }
            });

            waitsFor(function() {
                if (!mayProceed) {
                    return true;
                }
                try {
                    var rv = waitsForBlock();
                }
                catch (e) {
                    spec.fail(e);
                    shutdown();
                    return true;
                }

                if (spec.results_.failedCount > 0) {
                    shutdown();
                    return true;
                }
                return rv;
            }, waitsForMsg, timeout);
        }, this);

        runs(shutdown);
    }
};
