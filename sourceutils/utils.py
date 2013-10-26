#!/usr/bin/env python
if __name__ == '__main__':
  raise Exception("utils.py must be imported!")

__all__ = ["BUILD_ENVIRONMENT",
           "DIR_SLASH",
           "printWithTime",
           "buildSymbolicLink",
           "resolvePath",
          ];

import os;
from datetime import datetime;
from subprocess import check_call;

DIR_SLASH = "/";
if os.getenv("MozillaBuild"):
  DIR_SLASH = "\\";
  BUILD_ENVIRONMENT = "MozillaBuild";
  import shutil;
elif os.uname()[0] == "Darwin":
  BUILD_ENVIRONMENT = "MacOSX";
else:
  BUILD_ENVIRONMENT = "Linux";

def config_symbolic_links():
  rv = ["ln", "-s", "$source", "$target"];
  if (BUILD_ENVIRONMENT == "Linux"):
    rv.insert(1, "-d");
  return rv;

SYMBOLIC_LINK_CMD = config_symbolic_links();

def buildSymbolicLink(topsrcdir, source, target):
  sourcedir = os.path.join(topsrcdir, source);
  if not os.path.exists(sourcedir):
    printWithTime("Skipping symbolic link for non-existent source directory: " + source + " => " + target)
    return;

  targetdir = os.path.join(topsrcdir, target);
  if (BUILD_ENVIRONMENT == "MozillaBuild"):
    # Symbolic links are rather difficult to delete safely on Windows.  Since we
    # don't really need symbolic links, let's not make them.
    printWithTime("FAKE symbolic link with simple copy: " + source + " => " + target);
    shutil.copytree(sourcedir, targetdir);
    return;

  sourcedir = sourcedir.replace("./", os.getcwd() + "/", 1);

  cmd = SYMBOLIC_LINK_CMD[:]
  cmd[cmd.index("$source")] = sourcedir;
  cmd[cmd.index("$target")] = targetdir;
  printWithTime("Executing command: " + " ".join(cmd));
  check_call(cmd, 0);

def printWithTime(msg):
  print datetime.now().strftime("%H:%M:%S") + " " + msg;

def resolvePath(path):
    if (path[0] == "."):
        path = os.path.join(os.getcwd(), path);
    return os.path.realpath(path);
