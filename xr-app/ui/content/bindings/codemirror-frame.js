window.addEventListener("message", function(evt) {
    switch (evt.data.messageType) {
        case "initEditor":
            initEditor(evt.data);
            return;
    }
}, true);

function initEditor(data) {
    var modeScriptURL = "resource://app/codemirror/mode/" + data.editorType + "/" + data.editorType + ".js";
    var modeScript = document.createElement("script");
    modeScript.setAttribute("type", "application/javascript");
    modeScript.setAttribute("src", modeScriptURL);

    modeScript.addEventListener("afterscriptexecute", function() {
        window.editor = CodeMirror(document.body, {
            mode: data.editorType,
            lineNumbers: true,
            width: data.width || 400,
            height:  data.height || 300,
            readOnly: data.readonly
        });
        window.editor.on("change", editorChange);
        
        if (data.readonly)
            window.editor.getInputField().disabled = true;
    });

    document.getElementById("head").appendChild(modeScript);    
}

function editorChange(mirror, changes) {
    var source = mirror.doc.getValue();
    var evt = document.createEvent("MessageEvent");
    evt.initMessageEvent(
        "sourceupdate",
        true,
        false,
        { /* The actual data of the event. */
            newSource: mirror.doc.getValue(),
            changes: changes
        },
        location.href,
        null,
        window
    );
    window.dispatchEvent(evt);
}
