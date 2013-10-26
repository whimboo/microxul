#!/usr/bin/env python
if __name__ == '__main__':
  raise Exception("xulrunner.py must be imported!")
  
__all__ = ["getSDK", "removeSDK"];

from utils import BUILD_ENVIRONMENT, printWithTime;
import os, shutil, re, tempfile, tarfile;
from datetime import datetime;
from ftplib import FTP;
from zipfile import ZipFile;
from subprocess import check_call;

def getVersionArray(dir):
  items = re.split("[\.b]", dir);
  i = 0;
  while i < len(items):
    items[i] = int(items[i]);
    i += 1;
  return items;

def isGreaterVersion(oldEntry, newEntry):
  entries = zip(oldEntry, newEntry);
  for entry in entries:
    if (entry[0] < entry[1]):
      return True;
    if (entry[0] > entry[1]):
      return False;
    pass;
  return len(newEntry) > len(oldEntry);

def getBuildPath(ftp, branch):
  if (branch == "aurora"):
    ftp.cwd('pub/xulrunner/nightly/latest-mozilla-aurora/');
    expr = "^xulrunner-([\d.]+)a\d+.en-US";
  else:
    # Beta and release builds live in subdirectories of pub/xulrunner/releases.
    # We have to find the right subdirectory first, before identifying a build.
    if (branch == "beta"):
      dirExpr = "^[\d\.b]+$";
      expr = "^xulrunner-([\d.b]+).en-US";
    else:
      dirExpr = "^[\d\.]+$";
      expr = "^xulrunner-([\d.]+).en-US";

    # Try to find the best subdirectory.
    ftp.cwd('pub/xulrunner/releases/');
    dirs = ftp.nlst();
    currentDir = None;
    currentDirSplit = None;
    for dir in dirs:
      if not re.match(dirExpr, dir):
        continue;
      if not currentDir:
        currentDir = dir;
        currentDirSplit = getVersionArray(dir);
        continue;
      dirSplit = getVersionArray(dir);
      isGreater = isGreaterVersion(currentDirSplit, dirSplit);
      if isGreater:
        currentDir = dir;
        currentDirSplit = dirSplit;
        continue;
      pass;

    ftp.cwd(currentDir + "/sdk");
    pass;

  # Identify the file to save.
  if (BUILD_ENVIRONMENT == "Linux"):
    expr += ".linux-" + os.uname()[4] + ".sdk.tar.bz2";
  elif (BUILD_ENVIRONMENT == "MozillaBuild"):
    expr += ".win32.sdk.zip$";
  elif (BUILD_ENVIRONMENT == "MacOSX"):
    expr += ".mac-" + os.uname()[4] + ".sdk.tar.bz2";
  else:
    raise Exception("Unsupported build environment");

  sdk = [];
  def XULRunnerCallback(file):
    if (re.match(expr, file) and (file.find(".asc") == -1)):
      sdk.append(file);
  # Fetch list of XULRunner SDK's.
  ftp.retrlines("NLST", XULRunnerCallback);

  # Find the latest version.
  sdk = sdk[-1];
  return ftp.pwd() + "/" + sdk;

def getSDK(branch):
  printWithTime("Looking up SDK on ftp.mozilla.org");
  ftp = FTP('ftp.mozilla.org', 'anonymous');
  sdk = getBuildPath(ftp, branch);

  printWithTime("Fetching " + sdk);
  fd, archive = tempfile.mkstemp();
  stream = open(archive, 'w+b');
  def processDownload(block):
    stream.write(block);
  ftp.retrbinary("RETR " + sdk, processDownload);
  stream.close();

  # Extract the SDK.
  printWithTime("Extracting XULRunner SDK");
  if (BUILD_ENVIRONMENT != "MozillaBuild"):
    tarArchive = tarfile.open(archive, "r:bz2");
    tarArchive.extractall("./libraries");
  else:
    zipArchive = ZipFile(archive, "r");
    zipArchive.extractall("libraries");
    zipArchive.close();

  # Clean-up the archive.
  os.close(fd);
  os.remove(archive);

  sdkPath = "./libraries/xulrunner-sdk";
  if (BUILD_ENVIRONMENT == "MacOSX"):
    sdkPath += "/bin/XUL.framework/Versions/Current";
  return sdkPath;

def removeSDK():
  if (os.path.isdir("./libraries/xulrunner-sdk")):
    printWithTime("Removing old SDK");
    shutil.rmtree("./libraries/xulrunner-sdk");

# TODO: Launch the XULRunner application built by ../project.py's buildApplication() code.
