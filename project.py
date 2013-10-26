#!/usr/bin/env python
if __name__ != '__main__':
  raise Exception("project.py must NOT be imported!");

# Min version of python is 2.7
import sys;
if ((sys.version_info.major < 2) or (sys.version_info.minor < 7)):
  raise Exception("You need to use Python version 2.7 or higher");

# Get command line arguments.
targets = {
  "clean": "Remove the working directory.",
  "build": "Build the source code.",
  "run":   "Run the MicroXUL editor."
};

def printHelp():
  targetHelp = "Build targets:\n";
  for key in targets:
    targetHelp += "  " + key + (" ") * (20 - len(key)) + targets[key] + "\n";
  help = parser.format_help();
  help = help.replace("positional arguments:\n", targetHelp[0:-1]);
  print help;

import argparse;
parser = argparse.ArgumentParser(
  description="Verbosio MicroXUL Subproject Script",
  add_help = False,
  usage="project.py [--version] [--browser BROWSER] targets"
);

parser.add_argument('--version',
                    action='version',
                    version='Verbosio MicroXUL 1.0a1');
parser.add_argument("--browser",
                    action="store",
                    help="The browser to use.");
parser.add_argument("-h", "--help",
                    help="Show this help message and exit.",
                    action="store_true");
parser.add_argument("--update-sdk",
                    action="store",
                    help="Get a fresh Gecko SDK from Mozilla FTP servers.",
                    choices=["aurora", "beta", "release"]);
parser.add_argument("targets",
                    metavar="",
                    nargs="*");
cmdLine = parser.parse_args();
  
cmdLine.clean     = ("clean" in cmdLine.targets);
cmdLine.build     = ("build" in cmdLine.targets);
cmdLine.run       = ("test-xpc" in cmdLine.targets);

# Here, we check that the user passed in at least one option.
if (not cmdLine.clean and
    not cmdLine.build and
    not cmdLine.update_sdk and
    not cmdLine.run):
  cmdLine.help = True;

if (cmdLine.help):
  printHelp();
  parser.exit(0);

# Import main modules.
from sourceutils.utils import *;
from sourceutils import xulrunner;
from ConfigParser import SafeConfigParser;

import os, re, shutil, subprocess;
topsrcdir = os.path.dirname(__file__)
if topsrcdir == '':
  topsrcdir = '.'

# Flush the configuration.
def updateConfig():
  with open('local.config', 'wb') as configfile:
    config.write(configfile);

# Clean the build folder.
def clean():
  if not os.path.isdir("dist"):
    printWithTime("Aborting clean operation: nothing to do.");
    return;
  printWithTime("Starting clean operation.");
  shutil.rmtree("dist");
  printWithTime("Completing clean operation.");

# Determine if a line begins with the pound symbol "#".
def isComment(line):
  return re.match("^\s*#", line);

def enforceDir(dirPath):
  if not os.path.isdir(dirPath):
    os.makedirs(dirPath);

def buildProfile():
  profileDir = os.path.join(topsrcdir, "dist/profile");
  enforceDir(profileDir);
  return profileDir;

# Execution of scripts really begins here.
config = SafeConfigParser();
config.read(["local.config"]);

# If the user requested an SDK update, clear the option to force the update.
if (cmdLine.update_sdk and
    config.has_section("Mozilla") and
    config.has_option("Mozilla", "XULRunner-SDK")):
  config.remove_option("Mozilla", "XULRunner-SDK");
  xulrunner.removeSDK();

if cmdLine.clean:
  clean();

# If the user has a browser location, cache that location.
if (cmdLine.browser):
  if (not config.has_section("Mozilla")):
    config.add_section("Mozilla");

  config.set("Mozilla", "Firefox", cmdLine.browser);
  updateConfig();
elif cmdLine.run and sys.platform == "darwin" and not config.has_option("Mozilla", "Firefox"):
  printHelp();
  # see https://bugzilla.mozilla.org/show_bug.cgi?id=448069
  parser.error("Macintosh XULRunner does not work: please provide a Firefox runtime. (Use --browser.)");

if (not cmdLine.build and cmdLine.run):
  printWithTime("Forcing build for testing");
  cmdLine.build = True;

# If we need to download the SDK, go get it.
if (cmdLine.update_sdk):
  if (not config.has_section("Mozilla")):
    config.add_section("Mozilla");

  if (not config.has_option("Mozilla", "XULRunner-SDK")):
    config.set("Mozilla", "XULRunner-SDK", xulrunner.getSDK(cmdLine.update_sdk));
    updateConfig();

if (cmdLine.build):
  printWithTime("Starting build process");
  printWithTime("Completed build process");
  from sourceutils import install_app;
  appLeafName = install_app.fixLeafName("MicroXUL");

  # Create the Jasmine test XULRunner application.
  appStaging = "dist/temp/app";
  appStagingDir = os.path.join(topsrcdir, appStaging);
  appDir = os.path.join(topsrcdir, "dist/app");
  printWithTime("Creating Gecko application folder");

  if (os.path.isdir(appStagingDir)):
    shutil.rmtree(appStagingDir);
  if (os.path.isdir(appDir)):
    shutil.rmtree(appDir);

  shutil.copytree(os.path.join(topsrcdir, "xr-app"), appStagingDir);
  install_app.installApp(
    appStagingDir,
    appDir,
    appLeafName,
    os.path.join(topsrcdir, config.get("Mozilla", "xulrunner-sdk"))
  );

  execPath = os.path.join(topsrcdir, "dist", "app", appLeafName);
  if (sys.platform == "win32"):
    execPath += ".exe";
  elif (sys.platform == "darwin"):
    execPath = config.get("Mozilla", "Firefox");
  execPath = os.path.expanduser(execPath);

  profileDir = buildProfile();
  if (profileDir[0] == "."):
    profileDir = os.path.realpath(profileDir);
  else:
    profileDir = os.path.expanduser(profileDir);

  if (sys.platform == "darwin"):
    # XXX ajvincent XULRunner SDK doesn't work on Mac for launching XULRunner apps...
    # see https://bugzilla.mozilla.org/show_bug.cgi?id=448069
    xrLaunch = [
      execPath,
      "-app", os.path.join(topsrcdir, "dist/app/MicroXUL.app/Contents/Resources/application.ini"),
      "--no-remote",
      "--profile", profileDir
    ];
    if (xrLaunch[2][0] == "."):
      xrLaunch[2] = os.path.realpath(xrLaunch[2]);
  else:
    xrLaunch = [
      execPath,
      "--no-remote",
      "--profile", profileDir
    ];

  print xrLaunch;
  subprocess.check_call(xrLaunch);
  pass;

sys.exit(0);
