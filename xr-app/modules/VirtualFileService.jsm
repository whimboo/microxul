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
      Cu = Components.utils,
      CC = Components.Constructor;

const UnicodeConverter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                           .createInstance(Ci.nsIScriptableUnicodeConverter);
UnicodeConverter.charset = "UTF-8";

function voidFunc() {};

const RESET_KEY = {}; // hidden key

var VFS_Map = new Map();
const VirtualFileService = {
  __testDepth__: 0,

  has: function(projectName) {
    return VFS_Map.has(projectName);
  },

  get: function(projectName) {
    return VFS_Map.has(projectName) ? VFS_Map.get(projectName) : null;
  },

  create: function(projectName) {
    if (this.has(projectName)) {
      throw new Error("A project by this name already exists!");
    }

    return new VirtualFileSystem(projectName);
  },

  test: function(milkContract) {
    var origMap = VFS_Map;
    VFS_Map = new Map();

    this.reset = milkContract.endContract = (function() {
      VFS_Map = origMap;
      this.reset = VFS_Map.get(RESET_KEY);
    }).bind(this);
    VFS_Map.set(RESET_KEY, this.reset);
  },

  reset: voidFunc
};

VFS_Map.set(RESET_KEY, voidFunc);

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
   * Determine if we have a source getter.
   *
   * @param path {String} The path to look up.
   * @param port {Integer} -1 to use current code, 0+ to use a tag.
   *
   * @returns {boolean} True if we have a getter.
   */
  hasSourceGetter: function(path, port) {
    this.__ensureAvailable__();
    if (port != -1)
      return false; // XXX ajvincent Implement later!
    return this.__pathGetters__.has(path);
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

    var source = sourceGetter();
    return UnicodeConverter.convertToInputStream(source);
  },

  /**
   * Convert a real-world URI spec to a virtual one.
   *
   * @param spec {String}  The spec to convert.
   * @param tag  {Integer} -1 to use current code, 0+ to use a tag.
   */
  getVirtualSpec: function(spec, tag) {
    this.__ensureAvailable__();
    if (/^chrome:\/\//.test(spec)) {
      return "virtual-chrome://" + this.projectName + 
             ((typeof tag == "number") && (tag >= 0) ? ":" + Math.floor(tag): "") +
             "/" + spec.substr("chrome://".length);
    }
    throw new Error("Not implemented yet for non-chrome URL's!");
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
