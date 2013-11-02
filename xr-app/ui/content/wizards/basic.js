const ContentManager = {
};

window.addEventListener("load", {
  handleEvent: function(evt) {
    window.removeEventListener("load", this, true);
    var src = document.getElementById("sample").firstChild.nodeValue;
    var dataURL = "data:application/vnd.mozilla.xul+xml," + encodeURIComponent(src);
    document.getElementById('previewPane').setAttribute("src", dataURL);
  }
}, true);
