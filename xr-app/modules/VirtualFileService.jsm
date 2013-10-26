/* A virtual: URL takes the form:

virtual://projectname:tagnumber/actualProtocol+/username%3Apassword%40hostname%3Aportnumber/...
virtual://projectname:tagnumber/actualProtocol-/...

where the ... is the path.

tagnumber is usually omitted, meaning "use the latest data".
If present, it means "use the tagged files."

actualProtocol+ means there is a [username, password, hostname, portnumber] present.
actualProtocol- means there is not.

Currently we only support actualProtocol- (no username, no password, etc.) and no tags yet.
*/

const EXPORTED_SYMBOLS = ["VirtualFileService"];

const Ci = Components.interfaces,
      Cc = Components.classes,
      CC = Components.Constructor;

const UnicodeConverter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                           .createInstance(Ci.nsIScriptableUnicodeConverter);
UnicodeConverter.charset = "UTF-8";

var VFS_Map = new Map();
const VirtualFileService = {
  __testDepth__: 0,

  has: function(projectName) {
    return VFS_Map.has(projectName);
  },

  create: function(projectName) {
    if (this.has(projectName)) {
      throw new Error("A project by this name already exists!");
    }

    return new VirtualFileSystem(projectName);
  },

  test: function(callback) {
    var origMap = VFS_Map;
    VFS_Map = new Map();
    this.__testDepth__++;
    try {
      callback();
    }
    finally {
      this.__testDepth__--;
      VFS_Map = origMap;
    }
  }
};

function VirtualFileSystem(projectName) {
  this.projectName = projectName;
  this.__pathGetters__ = new Map();
  this.__tagsByPort__ = [/* new Map(), new Map(), ... */];

  VFS_Map.set(projectName, this);

  this.__enabled__ = true;
};
VirtualFileSystem.prototype = {
  __ensureAvailable__: function() {
    if (!this.__enabled__) {
      throw new Error("This virtual file system is already dead!");
    }
  },

  /**
   * Define a function to get the contents of a file at a particular path.
   *
   * @param path   {String}   A path to a file.
   * @param getter {Function} A function to get that file's contents.
   */
  defineSourceGetter: function(path, getter) {
    this.__ensureAvailable__();
    if (this.__pathGetters__.has(path)) {
      throw new Error("That path is already defined!");
    }
    this.__pathGetters__.set(path, getter);
  },

  /**
   * Get a UTF-8 input stream for a path.
   *
   * @param path {String} The path to look up.
   * @param port {Integer} -1 to use current code, 0+ to use a tag.
   *
   * @returns {nsIInputStream}
   */
  getInputStream: function(path, port) {
    this.__ensureAvailable__();
    if ((port != -1)/* && (this.__tagsByPort__.length < port)*/) {
      throw new Error("Not supported yet, please come back later");
    }

    // Check for deleted ancestors.
    var sourceGetter = this.__pathGetters__.get(path);
    if (typeof sourceGetter != "function") {
      throw new Error("source not found for path " + path);
    }

    var inputStream = UnicodeConverter.convertToInputStream(sourceGetter());
    return inputStream;
  },

  /**
   * Disconnect this file system from reality.
   */
  shutdown: function() {
    this.__ensureAvailable__();
    Object.defineProperty(this, "__enabled__", {
      configurable: false,
      enumerable: false,
      writable: false,
      value: false
    });
    this.__pathGetters__ = null;
    this.__tagsByPort__ = null;
  }
};
